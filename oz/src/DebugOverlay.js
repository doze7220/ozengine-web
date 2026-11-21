/**
 * @fileoverview 責務: FPS の計算（表示の有無にかかわらず）と値の保持、表示の有無と位置（画面の四隅）の保持、
 * 論理座標での表示（拡大の設定を含む）だけを担う。時間は引数でのみ受け取り、ゲーム状態は参照しない。
 */

/** 隅からの距離（論理座標）。四隅で共通。 */
const MARGIN = 8;

/**
 * 表示位置の値の一覧（唯一の定義）。Engine が検証に使う。
 * @type {ReadonlyArray<string>}
 */
export const FPS_POSITIONS = Object.freeze(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

/**
 * 位置ごとの寄せ方。right / bottom が真なら、その辺から MARGIN だけ内側に置く。
 * @type {Readonly<Record<string, {align: CanvasTextAlign, baseline: CanvasTextBaseline, right: boolean, bottom: boolean}>>}
 */
const LAYOUTS = Object.freeze({
  'top-left': { align: 'left', baseline: 'top', right: false, bottom: false },
  'top-right': { align: 'right', baseline: 'top', right: true, bottom: false },
  'bottom-left': { align: 'left', baseline: 'bottom', right: false, bottom: true },
  'bottom-right': { align: 'right', baseline: 'bottom', right: true, bottom: true },
});

/**
 * FPS を計算し、表示が有効なら四隅のいずれかに描画するデバッグ表示。
 */
export class DebugOverlay {
  /**
   * 集計を初期化し、論理解像度を保持する。表示は無効、位置は 'top-left' で始まる。
   * @param {number} width 論理解像度の幅（起動設定の width）。
   * @param {number} height 論理解像度の高さ（起動設定の height）。
   */
  constructor(width, height) {
    /** @private 論理解像度の幅 */
    this._width = width;
    /** @private 論理解像度の高さ */
    this._height = height;
    /** @private 集計中のフレーム数 */
    this._frames = 0;
    /** @private 集計中の経過時間（ミリ秒） */
    this._elapsed = 0;
    /** @private 直近に計算した FPS。最初の計算が終わるまでは null */
    this._fps = null;
    /** @private 表示するか */
    this._visible = false;
    /** @private 表示位置（FPS_POSITIONS のいずれか） */
    this._position = 'top-left';
  }

  /**
   * 直近に計算した FPS（整数）。最初の計算が終わるまでは null。
   * @returns {number|null}
   */
  get fps() {
    return this._fps;
  }

  /**
   * 表示するか。
   * @returns {boolean}
   */
  get visible() {
    return this._visible;
  }

  /**
   * 表示するかを設定する。検証しない（Engine が検証した値だけを渡すこと）。
   * @param {boolean} value 表示するか。
   */
  set visible(value) {
    this._visible = value;
  }

  /**
   * 表示位置。
   * @returns {string} FPS_POSITIONS のいずれか。
   */
  get position() {
    return this._position;
  }

  /**
   * 表示位置を設定する。検証しない（Engine が検証した値だけを渡すこと）。
   * @param {string} value FPS_POSITIONS のいずれか。
   */
  set position(value) {
    this._position = value;
  }

  /**
   * フレーム数と経過時間を足し、1000ミリ秒以上になったら FPS を更新する。表示の有無にかかわらず呼ぶ。
   * @param {number} realDelta 実時間のフレーム間隔（ミリ秒）。
   * @returns {void}
   */
  update(realDelta) {
    this._frames += 1;
    this._elapsed += realDelta;
    if (this._elapsed >= 1000) {
      this._fps = Math.round((this._frames * 1000) / this._elapsed);
      this._frames = 0;
      this._elapsed = 0;
    }
  }

  /**
   * 表示が有効なら、自分の save / restore の中で論理座標への拡大を設定し、選ばれた隅に FPS を描く。
   * 表示が無効なら ctx に触れずに戻る。呼ぶ前の ctx の変換に依存しない。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先。
   * @returns {void}
   */
  draw(ctx) {
    if (!this._visible) return;
    const layout = LAYOUTS[this._position];
    ctx.save();
    ctx.setTransform(ctx.canvas.width / this._width, 0, 0, ctx.canvas.height / this._height, 0, 0);
    ctx.font = '16px monospace';
    ctx.textAlign = layout.align;
    ctx.textBaseline = layout.baseline;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    const label = `FPS: ${this._fps === null ? '--' : this._fps}`;
    const x = layout.right ? this._width - MARGIN : MARGIN;
    const y = layout.bottom ? this._height - MARGIN : MARGIN;
    ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
    ctx.restore();
  }
}
