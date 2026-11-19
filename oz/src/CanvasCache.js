/**
 * 責務: 渡された描く処理を、ページに追加しない Canvas に範囲と倍率を決めて焼き付け、その画像を描くこと
 * （画素の倍率が変わったときの焼き直し、明示の焼き直し、手放しを含む）。
 * 絵の中身の解釈、画素の加工、表示サイズの調整は行わず、他のエンジンモジュールを import しない。
 */

/**
 * 焼き付けた画像の四方に取る余白（焼き付けた画像の画素）。アンチエイリアスのにじみと丸めを含めて足りる量。
 * @type {number}
 */
const BAKE_MARGIN = 2;

/**
 * 画素合わせで描けるかを判定するときの、変換行列の成分の許容誤差。
 * @type {number}
 */
const TRANSFORM_EPSILON = 1e-6;

/**
 * 画素の倍率（x）を返す関数。`setPixelRatioSource` が呼ばれるまでは null。
 * @type {(() => number) | null}
 */
let getRatioX = null;

/**
 * 画素の倍率（y）を返す関数。`setPixelRatioSource` が呼ばれるまでは null。
 * @type {(() => number) | null}
 */
let getRatioY = null;

/**
 * 焼き付ける範囲。source の座標（拡大前の px）での最小・最大。
 * @typedef {Object} Bounds
 * @property {number} minX 左端
 * @property {number} minY 上端
 * @property {number} maxX 右端
 * @property {number} maxY 下端
 */

/**
 * 焼き付けの画素数・原点・描く位置の計算結果。
 * @typedef {Object} BakeLayout
 * @property {number} pixelWidth 焼き付ける画像の幅（画素、整数、1以上）
 * @property {number} pixelHeight 焼き付ける画像の高さ（画素、整数、1以上）
 * @property {number} originX source の原点に当たる画像の x 画素（整数）
 * @property {number} originY source の原点に当たる画像の y 画素（整数）
 * @property {number} densityX source の x の1単位が当たる画像の画素数
 * @property {number} densityY source の y の1単位が当たる画像の画素数
 * @property {number} destX 描く位置の x（論理座標。scale を掛けた後）
 * @property {number} destY 描く位置の y（論理座標。scale を掛けた後）
 * @property {number} destWidth 描く幅（論理座標）
 * @property {number} destHeight 描く高さ（論理座標）
 * @property {number} ratioX 計算に使った画素の倍率（x）
 * @property {number} ratioY 計算に使った画素の倍率（y）
 */

/**
 * 画素の倍率の求め方を受け取って保持する。Engine だけが起動時に呼ぶ（oz/index.js からは公開しない）。
 * @param {() => number} ratioXGetter 画素の倍率（Canvas の画素数 ÷ 論理解像度）の x を返す関数
 * @param {() => number} ratioYGetter 画素の倍率の y を返す関数
 * @returns {void}
 */
export function setPixelRatioSource(ratioXGetter, ratioYGetter) {
  getRatioX = ratioXGetter;
  getRatioY = ratioYGetter;
}

/**
 * `create` の引数を検証して正規化する（Canvas を使わない）。
 * @param {*} source draw(ctx) を持つオブジェクト、または ctx を受け取る関数
 * @param {*} options 設定オブジェクト `{ bounds, scale? }`
 * @returns {{ bounds: Bounds, scale: number }} 正規化した値（bounds は写し、scale の既定値は 1）
 * @throws {Error} 引数が正しくないとき
 */
export function validateCreateArgs(source, options) {
  const sourceOk = typeof source === 'function'
    || (typeof source === 'object' && source !== null && typeof source.draw === 'function');
  if (!sourceOk) {
    throw new Error('[oz] CanvasCache.create: source (draw(ctx) を持つオブジェクト、または ctx を受け取る関数) が渡されていません');
  }
  if (typeof options !== 'object' || options === null) {
    throw new Error('[oz] CanvasCache.create: options (設定オブジェクト) が渡されていません');
  }
  const bounds = options.bounds;
  if (typeof bounds !== 'object' || bounds === null) {
    throw new Error('[oz] CanvasCache.create: bounds (焼き付ける範囲 { minX, minY, maxX, maxY }) が渡されていません');
  }
  const { minX, minY, maxX, maxY } = bounds;
  for (const v of [minX, minY, maxX, maxY]) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error('[oz] CanvasCache.create: bounds の minX / minY / maxX / maxY は有限の数値で指定してください');
    }
  }
  if (maxX <= minX || maxY <= minY) {
    throw new Error('[oz] CanvasCache.create: bounds の範囲が空です（maxX は minX より、maxY は minY より大きくしてください）');
  }
  const scale = options.scale;
  if (scale !== undefined && !(typeof scale === 'number' && Number.isFinite(scale) && scale > 0)) {
    throw new Error('[oz] CanvasCache.create: scale は正の有限数で指定してください');
  }
  return {
    bounds: { minX, minY, maxX, maxY },
    scale: scale === undefined ? 1 : scale,
  };
}

/**
 * 焼き付ける画像の画素数・余白・描く位置を計算する（Canvas を使わない）。
 * @param {Bounds} bounds 焼き付ける範囲（検証済み）
 * @param {number} scale 焼き付けの scale
 * @param {number} ratioX 画素の倍率（x）
 * @param {number} ratioY 画素の倍率（y）
 * @returns {BakeLayout} 計算結果
 */
export function computeBakeLayout(bounds, scale, ratioX, ratioY) {
  const densityX = scale * ratioX;
  const densityY = scale * ratioY;
  const left = Math.floor(bounds.minX * densityX) - BAKE_MARGIN;
  const right = Math.ceil(bounds.maxX * densityX) + BAKE_MARGIN;
  const top = Math.floor(bounds.minY * densityY) - BAKE_MARGIN;
  const bottom = Math.ceil(bounds.maxY * densityY) + BAKE_MARGIN;
  const pixelWidth = right - left;
  const pixelHeight = bottom - top;
  return {
    pixelWidth,
    pixelHeight,
    originX: -left,
    originY: -top,
    densityX,
    densityY,
    destX: left / ratioX,
    destY: top / ratioY,
    destWidth: pixelWidth / ratioX,
    destHeight: pixelHeight / ratioY,
    ratioX,
    ratioY,
  };
}

/**
 * 呼ぶ側の変換が拡大・縮小・回転を含まないとき、画面の画素に合わせて描く位置を計算する（Canvas を使わない）。
 * @param {{ a: number, b: number, c: number, d: number, e: number, f: number }} matrix 呼ぶ側の ctx の現在の変換行列
 * @param {BakeLayout} layout 焼き付けの計算結果
 * @returns {{ x: number, y: number } | null} 画面の画素の位置。画素合わせできないとき（拡大・縮小・回転・反転）は null
 */
export function snapToDevicePixels(matrix, layout) {
  const { a, b, c, d, e, f } = matrix;
  if (
    Math.abs(b) <= TRANSFORM_EPSILON
    && Math.abs(c) <= TRANSFORM_EPSILON
    && Math.abs(a - layout.ratioX) <= TRANSFORM_EPSILON
    && Math.abs(d - layout.ratioY) <= TRANSFORM_EPSILON
  ) {
    return {
      x: Math.round(e + a * layout.destX),
      y: Math.round(f + d * layout.destY),
    };
  }
  return null;
}

/**
 * 焼き付け1つ。draw(ctx) を持ち、スプライトJSと同じ書き方で描ける。状態はすべてプライベート。
 */
class Bake {
  /** @type {*} */ #source;
  /** @type {Bounds} */ #bounds;
  /** @type {number} */ #scale;
  /** @type {HTMLCanvasElement | null} */ #canvas;
  /** @type {CanvasRenderingContext2D | null} */ #ctx;
  /** @type {BakeLayout | null} */ #layout = null;
  /** @type {boolean} */ #disposed = false;

  /**
   * 焼き付けを作り、すぐ焼き付ける。
   * @param {*} source draw(ctx) を持つオブジェクト、または ctx を受け取る関数
   * @param {Bounds} bounds 焼き付ける範囲（写し）
   * @param {number} scale 焼き付けの scale
   * @throws {Error} Canvas を用意できないとき、または source が例外を投げたとき
   */
  constructor(source, bounds, scale) {
    this.#source = source;
    this.#bounds = bounds;
    this.#scale = scale;
    this.#canvas = document.createElement('canvas');
    this.#ctx = this.#canvas.getContext('2d');
    if (this.#ctx === null) {
      throw new Error('[oz] CanvasCache.create: 焼き付け用の Canvas を用意できません');
    }
    this.#bake();
  }

  /**
   * 焼き付けた画像を ctx に描く。画素の倍率が変わっていれば、先に焼き直す。
   * 呼ぶ側の ctx の状態は元のまま終わる。
   * @param {CanvasRenderingContext2D} ctx 描く先
   * @returns {void}
   * @throws {Error} 手放した後、または焼き直しで source が例外を投げたとき
   */
  draw(ctx) {
    if (this.#disposed) {
      throw new Error('[oz] 焼き付けの draw: dispose の後には使えません');
    }
    if (
      this.#layout === null
      || getRatioX() !== this.#layout.ratioX
      || getRatioY() !== this.#layout.ratioY
    ) {
      this.#bake();
    }
    const layout = this.#layout;
    const snapped = typeof ctx.getTransform === 'function'
      ? snapToDevicePixels(ctx.getTransform(), layout)
      : null;
    if (snapped !== null) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.#canvas, snapped.x, snapped.y);
      ctx.restore();
    } else {
      ctx.drawImage(this.#canvas, layout.destX, layout.destY, layout.destWidth, layout.destHeight);
    }
  }

  /**
   * その時点の source を呼び直して焼き直す。
   * @returns {void}
   * @throws {Error} 手放した後、または source が例外を投げたとき
   */
  refresh() {
    if (this.#disposed) {
      throw new Error('[oz] 焼き付けの refresh: dispose の後には使えません');
    }
    this.#bake();
  }

  /**
   * 焼き付けを手放し、画像のメモリを返す。2回目以降は何もしない。
   * @returns {void}
   */
  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#canvas.width = 0;
    this.#canvas.height = 0;
    this.#canvas = null;
    this.#ctx = null;
    this.#layout = null;
    this.#source = null;
  }

  /**
   * 今の画素の倍率で source を焼き付ける（create・refresh・自動の焼き直しで共通）。
   * 失敗したときは layout が null のまま残り、次の描画で焼き直される。
   * @returns {void}
   * @throws {Error} source が例外を投げたとき（そのまま伝える）
   */
  #bake() {
    const layout = computeBakeLayout(this.#bounds, this.#scale, getRatioX(), getRatioY());
    this.#layout = null;
    const canvas = this.#canvas;
    const ctx = this.#ctx;
    // 毎回代入する（画像が消え、ctx の状態が初期化される）
    canvas.width = layout.pixelWidth;
    canvas.height = layout.pixelHeight;
    ctx.save();
    try {
      ctx.setTransform(layout.densityX, 0, 0, layout.densityY, layout.originX, layout.originY);
      if (typeof this.#source === 'function') {
        this.#source(ctx);
      } else {
        this.#source.draw(ctx);
      }
    } finally {
      ctx.restore();
    }
    this.#layout = layout;
  }
}

/**
 * キャンバスキャッシュの公開オブジェクト。描く処理を焼き付けて、draw(ctx) を持つ焼き付けを返す。
 */
export const CanvasCache = {
  /**
   * 描く処理を焼き付ける。
   * @param {(function(CanvasRenderingContext2D): void) | { draw: function(CanvasRenderingContext2D): void }} source
   *   ctx を受け取る関数、または draw(ctx) を持つオブジェクト
   * @param {{ bounds: Bounds, scale?: number }} options bounds は焼き付ける範囲、scale は既定 1
   * @returns {Bake} draw(ctx)・refresh()・dispose() を持つ焼き付け
   * @throws {Error} Engine.start の前、引数が正しくないとき、Canvas を用意できないとき、source が例外を投げたとき
   */
  create(source, options) {
    if (getRatioX === null || getRatioY === null) {
      throw new Error('[oz] CanvasCache.create: Engine.start の前には使えません');
    }
    const args = validateCreateArgs(source, options);
    return new Bake(source, args.bounds, args.scale);
  },
};
