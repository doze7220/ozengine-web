/**
 * 責務: チェックボックスの設定の検証、当たり判定、押されているかの状態、離したときの入り・切りの書き込みと取り消し、描くための情報。
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
 * 検証済みのチェックボックスの設定。
 * @typedef {Object} CheckboxSpec
 * @property {number} x 窓の内側の左上を原点とする x
 * @property {number} y 窓の内側の左上を原点とする y
 * @property {number} width 幅
 * @property {number} height 高さ
 * @property {string | (() => *)} label 項目名の文字、または描くたびに呼ぶ関数
 * @property {() => *} read 値を読む関数（引数なし）
 * @property {(value: boolean) => void} write 値を書く関数（引数は新しい真偽）
 */

/**
 * 描く関数に渡すチェックボックスの情報（座標は画面の論理座標）。
 * @typedef {Object} CheckboxInfo
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} label 読んだ文字
 * @property {boolean} checked 入りか（Boolean(read())）
 * @property {boolean} pressed 押されているか
 * @property {number} textSize 文字の大きさ
 */

/** チェックボックスの設定で使ってよい項目名の一覧。これ以外の項目名はエラーにする。 */
const ALLOWED = ['x', 'y', 'width', 'height', 'label', 'read', 'write'];

/**
 * 窓の addCheckbox に渡された設定を検証し、既定を補って返す。
 * @param {*} spec 利用側から渡された設定オブジェクト
 * @param {string} prefix エラー文の先頭（例: '[oz] 窓の addCheckbox:'）
 * @returns {CheckboxSpec} 検証済みの設定（値は写したもの）
 * @throws {Error} 設定が正しくないとき
 */
export function validateCheckboxSpec(spec, prefix) {
  if (!isPlainObject(spec)) {
    throw new Error(`${prefix} spec (チェックボックスの設定オブジェクト) が渡されていません`);
  }
  checkNoExtra(spec, ALLOWED, 'spec', prefix);
  checkFinite(spec.x, 'x', prefix);
  checkFinite(spec.y, 'y', prefix);
  checkPositive(spec.width, 'width', prefix);
  if (spec.height !== undefined) checkPositive(spec.height, 'height', prefix);
  checkText(spec.label, 'label', prefix);
  checkFunction(spec.read, 'read', prefix);
  checkFunction(spec.write, 'write', prefix);
  return {
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height === undefined ? DEFAULT_PART_HEIGHT : spec.height,
    label: spec.label,
    read: spec.read,
    write: spec.write,
  };
}

/**
 * チェックボックス（部品）。離したときに入り・切りを反転して書き、外へずらすと取り消せる。値は持たない。
 */
export class UiCheckbox {
  #rect;
  #hitRect;
  #label;
  #read;
  #write;
  #pressed = false;

  /**
   * @param {Object} params
   * @param {{x:number,y:number,width:number,height:number}} params.rect 画面の論理座標の部品の矩形
   * @param {{x:number,y:number,width:number,height:number}} params.hitRect 押せる範囲（窓が求めて渡す）
   * @param {string | (() => *)} params.label 項目名の文字、または描くたびに呼ぶ関数
   * @param {() => *} params.read 値を読む関数
   * @param {(value: boolean) => void} params.write 値を書く関数
   */
  constructor({ rect, hitRect, label, read, write }) {
    this.#rect = rect;
    this.#hitRect = hitRect;
    this.#label = label;
    this.#read = read;
    this.#write = write;
  }

  /**
   * 部品の種類の名前。
   * @type {string}
   */
  get kind() {
    return 'checkbox';
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
   * 押し始め。押せる範囲の中なら押されている状態にして、持ち主になる。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 持ち主になるなら true
   */
  pointerDown(x, y) {
    if (this.hitTest(x, y)) {
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
   * 離したとき。押せる範囲の中で離したら、読んだ値の反対の真偽を write に渡す（外で離せば取り消し）。
   * 押されている状態は write を呼ぶ前に解く。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {void}
   */
  pointerUp(x, y) {
    this.#pressed = false;
    if (this.hitTest(x, y)) {
      this.#write(!Boolean(this.#read()));
    }
  }

  /**
   * 描く関数に渡す情報を作る（状態は変えない。read と label の関数を呼ぶ）。
   * @param {number} textSize 文字の大きさ
   * @returns {CheckboxInfo} 新しい情報オブジェクト
   */
  info(textSize) {
    return {
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#rect.width,
      height: this.#rect.height,
      label: readText(this.#label),
      checked: Boolean(this.#read()),
      pressed: this.#pressed,
      textSize,
    };
  }
}
