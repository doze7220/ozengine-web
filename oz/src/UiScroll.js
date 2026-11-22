/**
 * 責務: スクロールする領域の設定の検証、中の部品の追加と並び、スクロールの位置の計算とその位置での中の部品の作り直し、領域による当たり判定、位置の表示の形の計算、描くための情報。
 * Canvas の操作とタップとドラッグの区別の中身は行わず、UiSpec・UiMetrics・UiRect・UiPartKinds・UiScrollGesture だけを import する。
 */

import { isPlainObject, checkNoExtra, checkFinite, checkPositive } from './UiSpec.js';
import { SCROLL_BAR_WIDTH, SCROLL_THUMB_MIN_LENGTH } from './UiMetrics.js';
import { containsPoint, intersectRect } from './UiRect.js';
import { PART_KINDS } from './UiPartKinds.js';
import { UiScrollGesture } from './UiScrollGesture.js';

/**
 * 論理座標の矩形。
 * @typedef {import('./UiRect.js').UiRectangle} UiRectangle
 */

/**
 * 検証済みのスクロールする領域の設定。
 * @typedef {Object} ScrollSpec
 * @property {number} x 窓の内側の左上を原点とする x
 * @property {number} y 窓の内側の左上を原点とする y
 * @property {number} width 幅
 * @property {number} height 見せる範囲の高さ
 */

/**
 * 描く関数に渡すスクロールする領域の情報（座標は画面の論理座標）。
 * @typedef {Object} ScrollInfo
 * @property {number} x 領域の矩形の左端
 * @property {number} y 領域の矩形の上端
 * @property {number} width 領域の矩形の幅
 * @property {number} height 領域の矩形の高さ
 * @property {number} scrollY スクロールの位置（0 が上端）
 * @property {number} contentHeight 中身の高さ
 * @property {boolean} scrollable スクロールできるか
 * @property {boolean} dragging スクロールのドラッグ中か
 * @property {number} textSize 文字の大きさ
 */

/**
 * 描く関数に渡す位置の表示の情報（座標は画面の論理座標）。
 * @typedef {Object} ScrollBarInfo
 * @property {number} x 帯の左端
 * @property {number} y 帯の上端
 * @property {number} width 帯の幅
 * @property {number} height 帯の高さ
 * @property {UiRectangle} thumb つまみの矩形
 * @property {number} scrollY スクロールの位置
 * @property {number} contentHeight 中身の高さ
 * @property {boolean} dragging スクロールのドラッグ中か
 */

/**
 * 窓の view() に入れる、スクロールする領域の描く情報。
 * @typedef {Object} ScrollView
 * @property {'scroll'} kind 常に 'scroll'
 * @property {ScrollInfo} info 領域の地・枠の情報
 * @property {Array<{kind: string, info: Object}>} parts 領域の矩形と重なる中の部品の情報（足した順）
 * @property {ScrollBarInfo | null} scrollBar 位置の表示の情報（スクロールできるときだけ。できなければ null）
 */

/** スクロールする領域の設定で使ってよい項目名の一覧。これ以外の項目名はエラーにする。 */
const ALLOWED = ['x', 'y', 'width', 'height'];

/**
 * 窓・タブの addScroll に渡された設定を検証して返す（すべて必須）。
 * @param {*} spec 利用側から渡された設定オブジェクト
 * @param {string} prefix エラー文の先頭（例: '[oz] 窓の addScroll:'）
 * @returns {ScrollSpec} 検証済みの設定
 * @throws {Error} 設定が正しくないとき
 */
export function validateScrollSpec(spec, prefix) {
  if (!isPlainObject(spec)) {
    throw new Error(`${prefix} spec (スクロールする領域の設定オブジェクト) が渡されていません`);
  }
  checkNoExtra(spec, ALLOWED, 'spec', prefix);
  checkFinite(spec.x, 'x', prefix);
  checkFinite(spec.y, 'y', prefix);
  checkPositive(spec.width, 'width', prefix);
  checkPositive(spec.height, 'height', prefix);
  return { x: spec.x, y: spec.y, width: spec.width, height: spec.height };
}

/**
 * スクロールする領域（部品）。中に5種類の部品を並べ、縦にずらせる。スクロールの位置が変わるたびに中の部品を作り直す。
 */
export class UiScroll {
  #rect;
  #visible;
  #scrollY = 0;
  #contentHeight;
  /** 中の部品の検証済みの設定と作り方の並び（足した順）。 */
  #items = [];
  /** 今のスクロールの位置での中の部品と画面の矩形の並び（#items と同じ順）。 */
  #children = [];
  #gesture;

  /**
   * @param {Object} params
   * @param {UiRectangle} params.rect 画面の論理座標の領域の矩形
   * @param {UiRectangle} params.clipRect 窓の内側の矩形（見える範囲を求めるのに使う）
   */
  constructor({ rect, clipRect }) {
    this.#rect = rect;
    this.#visible = intersectRect(rect, clipRect);
    this.#contentHeight = rect.height;
    this.#gesture = new UiScrollGesture({
      scrollBy: (dy) => this.#scrollBy(dy),
      cancel: () => this.#rebuild(),
    });
  }

  /**
   * 部品の種類の名前。
   * @type {string}
   */
  get kind() {
    return 'scroll';
  }

  /**
   * ボタンを領域の中に足す。
   * @param {Object} spec ボタンの設定
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addButton(spec) {
    this.#addPart('addButton', spec);
  }

  /**
   * 数値・文字の表示を領域の中に足す。
   * @param {Object} spec 表示の設定
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addValue(spec) {
    this.#addPart('addValue', spec);
  }

  /**
   * チェックボックスを領域の中に足す。
   * @param {Object} spec チェックボックスの設定
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addCheckbox(spec) {
    this.#addPart('addCheckbox', spec);
  }

  /**
   * スライダーを領域の中に足す。
   * @param {Object} spec スライダーの設定
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addSlider(spec) {
    this.#addPart('addSlider', spec);
  }

  /**
   * 選択肢の列を領域の中に足す。
   * @param {Object} spec 選択肢の列の設定
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addChoices(spec) {
    this.#addPart('addChoices', spec);
  }

  /**
   * タブの列は領域に入れられない。必ずエラーにする（設定は調べない）。
   * @returns {never}
   * @throws {Error} 常に
   */
  addTabs() {
    throw new Error('[oz] スクロールする領域の addTabs: タブの列はスクロールする領域に入れられません');
  }

  /**
   * スクロールする領域は領域に入れられない。必ずエラーにする（設定は調べない）。
   * @returns {never}
   * @throws {Error} 常に
   */
  addScroll() {
    throw new Error(
      '[oz] スクロールする領域の addScroll: スクロールする領域はスクロールする領域に入れられません',
    );
  }

  /**
   * 5種類の部品のどれかを、検証して中身の高さを更新し、今のスクロールの位置で作って並びに足す。
   * @param {string} op 足す操作の名前（PART_KINDS のキー）
   * @param {Object} spec 部品の設定
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  #addPart(op, spec) {
    const kind = PART_KINDS[op];
    const s = kind.validate(spec, `[oz] スクロールする領域の ${op}:`);
    this.#contentHeight = Math.max(this.#contentHeight, s.y + s.height);
    const item = { kind, s };
    this.#items.push(item);
    this.#children.push(this.#create(item));
  }

  /**
   * 中の部品1つを、今のスクロールの位置での画面の矩形と当たりの矩形で作る。
   * @param {{kind: Object, s: Object}} item 検証済みの設定と作り方
   * @returns {{part: Object, rect: UiRectangle}} 部品と画面の矩形
   */
  #create(item) {
    const { s } = item;
    const rect = {
      x: this.#rect.x + s.x,
      y: this.#rect.y + s.y - this.#scrollY,
      width: s.width,
      height: s.height,
    };
    const hitRect = intersectRect(rect, this.#visible);
    return { part: item.kind.create(s, rect, hitRect), rect };
  }

  /**
   * 中の部品をすべて、今のスクロールの位置で新しく作り直す（押されている状態は消える）。
   * @returns {void}
   */
  #rebuild() {
    this.#children = this.#items.map((item) => this.#create(item));
  }

  /**
   * スクロールの位置を dy だけ動かす（上端・下端で止める）。変わったときだけ中の部品を作り直す。
   * @param {number} dy 動かす量（正で下へ）
   * @returns {void}
   */
  #scrollBy(dy) {
    const max = Math.max(0, this.#contentHeight - this.#rect.height);
    const next = Math.min(max, Math.max(0, this.#scrollY + dy));
    if (next !== this.#scrollY) {
      this.#scrollY = next;
      this.#rebuild();
    }
  }

  /**
   * 点が見える範囲（領域の矩形と窓の内側の重なり）に入っているか。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 入っていれば true
   */
  hitTest(x, y) {
    return containsPoint(this.#visible, x, y);
  }

  /**
   * 押し始め。見える範囲の中なら、押した位置のいちばん上の中の部品を探してジェスチャに渡し、持ち主になる。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 持ち主になるなら true
   */
  pointerDown(x, y) {
    if (!this.hitTest(x, y)) return false;
    let child = null;
    for (let i = this.#children.length - 1; i >= 0; i--) {
      if (this.#children[i].part.hitTest(x, y)) {
        child = this.#children[i].part;
        break;
      }
    }
    this.#gesture.down(x, y, child);
    return true;
  }

  /**
   * 押している間の移動。ジェスチャに渡す。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {void}
   */
  pointerMove(x, y) {
    this.#gesture.move(x, y);
  }

  /**
   * 離したとき。ジェスチャに渡す。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {void}
   */
  pointerUp(x, y) {
    this.#gesture.up(x, y);
  }

  /**
   * 描くための情報を毎回新しく作る（状態は変えない）。
   * @param {number} textSize 文字の大きさ
   * @returns {ScrollView} 領域の情報、領域の矩形と重なる中の部品の情報、位置の表示の情報
   */
  view(textSize) {
    const rect = this.#rect;
    const height = rect.height;
    const contentHeight = this.#contentHeight;
    const scrollable = contentHeight - height > 0;
    const dragging = this.#gesture.dragging;
    const parts = [];
    for (const child of this.#children) {
      const o = intersectRect(child.rect, rect);
      if (o.width > 0 && o.height > 0) {
        parts.push({ kind: child.part.kind, info: child.part.info(textSize) });
      }
    }
    let scrollBar = null;
    if (scrollable) {
      const thumbH = Math.min(
        height,
        Math.max(SCROLL_THUMB_MIN_LENGTH, (height * height) / contentHeight),
      );
      const thumbY = rect.y + ((height - thumbH) * this.#scrollY) / (contentHeight - height);
      const barX = rect.x + rect.width - SCROLL_BAR_WIDTH;
      scrollBar = {
        x: barX,
        y: rect.y,
        width: SCROLL_BAR_WIDTH,
        height,
        thumb: { x: barX, y: thumbY, width: SCROLL_BAR_WIDTH, height: thumbH },
        scrollY: this.#scrollY,
        contentHeight,
        dragging,
      };
    }
    return {
      kind: 'scroll',
      info: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height,
        scrollY: this.#scrollY,
        contentHeight,
        scrollable,
        dragging,
        textSize,
      },
      parts,
      scrollBar,
    };
  }
}
