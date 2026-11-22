/**
 * 責務: タブの列の設定の検証と写し、タブごとの矩形（等分）、当たり判定、押されているタブの状態、離したときの切り替え、選ばれているタブの保持、描くための情報。
 * Canvas の操作と窓の外の判定は行わず、UiSpec・UiMetrics・UiRect だけを import する。
 */

import {
  isPlainObject,
  checkNoExtra,
  checkFinite,
  checkPositive,
  checkText,
  readText,
} from './UiSpec.js';
import { DEFAULT_TAB_HEIGHT } from './UiMetrics.js';
import { containsPoint } from './UiRect.js';

/**
 * 検証済みのタブの列の設定。
 * @typedef {Object} TabsSpec
 * @property {number} x 窓の内側の左上を原点とする x
 * @property {number} y 窓の内側の左上を原点とする y
 * @property {number} width 幅
 * @property {number} height 列の高さ（既定 DEFAULT_TAB_HEIGHT）
 * @property {Array<string | (() => *)>} labels タブの名前（写した新しい配列。文字列か描くたびに呼ぶ関数）
 */

/**
 * 描く関数に渡すタブ1つの情報（座標は画面の論理座標）。
 * @typedef {Object} TabInfo
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} label 読んだ文字
 * @property {boolean} selected 選ばれているか
 * @property {boolean} pressed 押されているか
 */

/**
 * 描く関数に渡すタブの列の情報（座標は画面の論理座標）。
 * @typedef {Object} TabsInfo
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {TabInfo[]} tabs タブごとの情報（新しい配列）
 * @property {number} textSize 文字の大きさ
 */

/** タブの列の設定で使ってよい項目名の一覧。これ以外の項目名はエラーにする。 */
const ALLOWED = ['x', 'y', 'width', 'height', 'labels'];

/**
 * 窓の addTabs に渡された設定を検証し、既定を補って返す。
 * @param {*} spec 利用側から渡された設定オブジェクト
 * @param {string} prefix エラー文の先頭（例: '[oz] 窓の addTabs:'）
 * @returns {TabsSpec} 検証済みの設定（labels は写した新しい配列）
 * @throws {Error} 設定が正しくないとき
 */
export function validateTabsSpec(spec, prefix) {
  if (!isPlainObject(spec)) {
    throw new Error(`${prefix} spec (タブの列の設定オブジェクト) が渡されていません`);
  }
  checkNoExtra(spec, ALLOWED, 'spec', prefix);
  checkFinite(spec.x, 'x', prefix);
  checkFinite(spec.y, 'y', prefix);
  checkPositive(spec.width, 'width', prefix);
  if (spec.height !== undefined) checkPositive(spec.height, 'height', prefix);
  if (!Array.isArray(spec.labels)) {
    throw new Error(`${prefix} labels は配列で指定してください`);
  }
  if (spec.labels.length === 0) {
    throw new Error(`${prefix} labels にタブがありません`);
  }
  const labels = [];
  for (let i = 0; i < spec.labels.length; i++) {
    checkText(spec.labels[i], `labels[${i}]`, prefix);
    labels.push(spec.labels[i]);
  }
  return {
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height === undefined ? DEFAULT_TAB_HEIGHT : spec.height,
    labels,
  };
}

/**
 * タブの列（部品）。幅を等分して間を空けずに並べ、押し始めたタブの上で離したらそのタブを選ぶ。選ばれているタブの番号を持つ。
 */
export class UiTabs {
  #rect;
  #hitRect;
  #labels;
  /** 境 b_0〜b_n（タブ i は b_i 以上 b_{i+1} 未満）。x の値。 */
  #bounds;
  /** タブごとの矩形（画面の論理座標）。 */
  #rects;
  #selected = 0;
  #pressed = false;
  #pressedIndex = null;

  /**
   * @param {Object} params
   * @param {{x:number,y:number,width:number,height:number}} params.rect 画面の論理座標の列全体の矩形
   * @param {{x:number,y:number,width:number,height:number}} params.hitRect 押せる範囲（窓が求めて渡す）
   * @param {Array<string | (() => *)>} params.labels 検証済みのタブの名前
   */
  constructor({ rect, hitRect, labels }) {
    this.#rect = rect;
    this.#hitRect = hitRect;
    this.#labels = labels;
    const n = labels.length;
    this.#bounds = [];
    for (let i = 0; i <= n; i++) {
      this.#bounds.push(rect.x + (rect.width * i) / n);
    }
    this.#rects = [];
    for (let i = 0; i < n; i++) {
      const start = this.#bounds[i];
      this.#rects.push({ x: start, y: rect.y, width: this.#bounds[i + 1] - start, height: rect.height });
    }
  }

  /**
   * 部品の種類の名前。
   * @type {string}
   */
  get kind() {
    return 'tabs';
  }

  /**
   * 選ばれているタブの番号（最初は 0）。窓が部品の出し分けに使う。
   * @type {number}
   */
  get selected() {
    return this.#selected;
  }

  /**
   * 点が押せる範囲に入っているか（左端・上端を含み、右端・下端を含まない）。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 入っていれば true
   */
  hitTest(x, y) {
    return containsPoint(this.#hitRect, x, y);
  }

  /**
   * 点を含むタブの番号を、境 b_i で決める（境を含む側が i。列の外の点は両端のタブに寄せる）。
   * @param {number} x 画面の論理座標の x
   * @returns {number} タブの番号（0 から）
   */
  #indexAt(x) {
    const last = this.#labels.length - 1;
    for (let i = 0; i < last; i++) {
      if (x < this.#bounds[i + 1]) return i;
    }
    return last;
  }

  /**
   * 押し始め。押せる範囲の中なら、点を含むタブを押されている状態にして、持ち主になる。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 持ち主になるなら true
   */
  pointerDown(x, y) {
    if (this.hitTest(x, y)) {
      this.#pressedIndex = this.#indexAt(x);
      this.#pressed = true;
      return true;
    }
    return false;
  }

  /**
   * 押している間の移動。押し始めたタブの上にあるときだけ押されている状態にする。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {void}
   */
  pointerMove(x, y) {
    this.#pressed = this.hitTest(x, y) && this.#indexAt(x) === this.#pressedIndex;
  }

  /**
   * 離したとき。押されている状態を解いてから、押し始めたタブの上で離したときだけ、そのタブを選ぶ。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {void}
   */
  pointerUp(x, y) {
    const index = this.#pressedIndex;
    this.#pressed = false;
    this.#pressedIndex = null;
    if (index !== null && this.hitTest(x, y) && this.#indexAt(x) === index) {
      this.#selected = index;
    }
  }

  /**
   * 描く関数に渡す情報を作る（状態は変えない。label の関数はタブごとに呼ぶ）。
   * @param {number} textSize 文字の大きさ
   * @returns {TabsInfo} 新しい情報オブジェクト
   */
  info(textSize) {
    return {
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#rect.width,
      height: this.#rect.height,
      tabs: this.#labels.map((label, i) => ({
        x: this.#rects[i].x,
        y: this.#rects[i].y,
        width: this.#rects[i].width,
        height: this.#rects[i].height,
        label: readText(label),
        selected: i === this.#selected,
        pressed: this.#pressed && this.#pressedIndex === i,
      })),
      textSize,
    };
  }
}
