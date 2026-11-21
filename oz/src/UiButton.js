/**
 * 責務: ボタンの設定の検証、当たり判定、押されているかの状態、離したときの反応と取り消し、描くための情報。
 * Canvas の操作と窓の外の判定は行わず、UiSpec・UiMetrics・UiRect だけを import する。
 */

import {
  isPlainObject,
  checkNoExtra,
  checkFinite,
  checkPositive,
  checkFunction,
  checkText,
  readText,
} from './UiSpec.js';
import { DEFAULT_PART_HEIGHT } from './UiMetrics.js';
import { containsPoint } from './UiRect.js';

/**
 * 検証済みのボタンの設定。
 * @typedef {Object} ButtonSpec
 * @property {number} x 窓の内側の左上を原点とする x
 * @property {number} y 窓の内側の左上を原点とする y
 * @property {number} width 幅
 * @property {number} height 高さ
 * @property {string | (() => *)} label 文字、または描くたびに呼ぶ関数
 * @property {() => void} onPress 押されたとき（離したとき）に呼ぶ関数
 * @property {(() => *) | null} enabled 押せるかを返す関数。無ければ null（常に押せる）
 */

/**
 * 描く関数に渡すボタンの情報（座標は画面の論理座標）。
 * @typedef {Object} ButtonInfo
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} label 読んだ文字
 * @property {boolean} pressed 押されているか
 * @property {boolean} enabled 押せるか
 * @property {number} textSize 文字の大きさ
 */

/** ボタンの設定で使ってよい項目名の一覧。これ以外の項目名はエラーにする。 */
const ALLOWED = ['x', 'y', 'width', 'height', 'label', 'onPress', 'enabled'];

/**
 * 窓の addButton に渡された設定を検証し、既定を補って返す。
 * @param {*} spec 利用側から渡された設定オブジェクト
 * @param {string} prefix エラー文の先頭（例: '[oz] 窓の addButton:'）
 * @returns {ButtonSpec} 検証済みの設定（値は写したもの）
 * @throws {Error} 設定が正しくないとき
 */
export function validateButtonSpec(spec, prefix) {
  if (!isPlainObject(spec)) {
    throw new Error(`${prefix} spec (ボタンの設定オブジェクト) が渡されていません`);
  }
  checkNoExtra(spec, ALLOWED, 'spec', prefix);
  checkFinite(spec.x, 'x', prefix);
  checkFinite(spec.y, 'y', prefix);
  checkPositive(spec.width, 'width', prefix);
  if (spec.height !== undefined) checkPositive(spec.height, 'height', prefix);
  checkText(spec.label, 'label', prefix);
  checkFunction(spec.onPress, 'onPress', prefix);
  if (spec.enabled !== undefined) checkFunction(spec.enabled, 'enabled', prefix);
  return {
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height === undefined ? DEFAULT_PART_HEIGHT : spec.height,
    label: spec.label,
    onPress: spec.onPress,
    enabled: spec.enabled === undefined ? null : spec.enabled,
  };
}

/**
 * ボタン（部品）。離したときに反応し、外へずらすと取り消せる。値は持たない。
 */
export class UiButton {
  #rect;
  #hitRect;
  #label;
  #onPress;
  #enabled;
  #pressed = false;

  /**
   * @param {Object} params
   * @param {{x:number,y:number,width:number,height:number}} params.rect 画面の論理座標の部品の矩形
   * @param {{x:number,y:number,width:number,height:number}} params.hitRect 押せる範囲（窓が求めて渡す）
   * @param {string | (() => *)} params.label 文字、または描くたびに呼ぶ関数
   * @param {() => void} params.onPress 離したときに呼ぶ関数
   * @param {(() => *) | null} params.enabled 押せるかを返す関数、または null
   */
  constructor({ rect, hitRect, label, onPress, enabled }) {
    this.#rect = rect;
    this.#hitRect = hitRect;
    this.#label = label;
    this.#onPress = onPress;
    this.#enabled = enabled;
  }

  /**
   * 部品の種類の名前。
   * @type {string}
   */
  get kind() {
    return 'button';
  }

  /**
   * 押されているか。
   * @type {boolean}
   */
  get pressed() {
    return this.#pressed;
  }

  /**
   * 今押せるか（enabled が無ければ常に押せる）。
   * @returns {boolean} 押せるなら true
   */
  isEnabled() {
    return this.#enabled === null ? true : Boolean(this.#enabled());
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
   * 押し始め。押せる範囲の中で押せるなら押されている状態にして、持ち主になる。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 持ち主になるなら true
   */
  pointerDown(x, y) {
    if (this.hitTest(x, y) && this.isEnabled()) {
      this.#pressed = true;
      return true;
    }
    return false;
  }

  /**
   * 押している間の移動。押せる範囲の外では押されている状態を解く。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {void}
   */
  pointerMove(x, y) {
    this.#pressed = this.hitTest(x, y);
  }

  /**
   * 離したとき。押せる範囲の中で離し、押せるなら onPress を呼ぶ（外で離せば取り消し）。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {void}
   */
  pointerUp(x, y) {
    this.#pressed = false;
    if (this.hitTest(x, y) && this.isEnabled()) {
      this.#onPress();
    }
  }

  /**
   * 描く関数に渡す情報を作る（状態は変えない）。
   * @param {number} textSize 文字の大きさ
   * @returns {ButtonInfo} 新しい情報オブジェクト
   */
  info(textSize) {
    return {
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#rect.width,
      height: this.#rect.height,
      label: readText(this.#label),
      pressed: this.#pressed,
      enabled: this.isEnabled(),
      textSize,
    };
  }
}
