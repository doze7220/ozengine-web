/**
 * 責務: 数値・文字の表示の設定の検証、当たり判定、値の読み出しと文字への整え、描くための情報。
 * Canvas の操作と値の書き換え・保存は行わず、UiSpec・UiMetrics・UiRect だけを import する。
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
 * 検証済みの数値・文字の表示の設定。
 * @typedef {Object} ValueSpec
 * @property {number} x 窓の内側の左上を原点とする x
 * @property {number} y 窓の内側の左上を原点とする y
 * @property {number} width 幅
 * @property {number} height 高さ
 * @property {string | (() => *)} label 項目名、または描くたびに呼ぶ関数
 * @property {() => *} read 値を読む関数
 * @property {((value: *) => *) | null} format 読んだ値を文字にする関数。無ければ null
 */

/**
 * 描く関数に渡す数値・文字の表示の情報（座標は画面の論理座標）。
 * @typedef {Object} ValueInfo
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} label 読んだ項目名
 * @property {*} value read の戻り値そのもの
 * @property {string} text 表示の文字
 * @property {number} textSize 文字の大きさ
 */

/** 数値・文字の表示の設定で使ってよい項目名の一覧。これ以外の項目名はエラーにする。 */
const ALLOWED = ['x', 'y', 'width', 'height', 'label', 'read', 'format'];

/**
 * 窓の addValue に渡された設定を検証し、既定を補って返す。
 * @param {*} spec 利用側から渡された設定オブジェクト
 * @param {string} prefix エラー文の先頭（例: '[oz] 窓の addValue:'）
 * @returns {ValueSpec} 検証済みの設定（値は写したもの）
 * @throws {Error} 設定が正しくないとき
 */
export function validateValueSpec(spec, prefix) {
  if (!isPlainObject(spec)) {
    throw new Error(`${prefix} spec (表示の設定オブジェクト) が渡されていません`);
  }
  checkNoExtra(spec, ALLOWED, 'spec', prefix);
  checkFinite(spec.x, 'x', prefix);
  checkFinite(spec.y, 'y', prefix);
  checkPositive(spec.width, 'width', prefix);
  if (spec.height !== undefined) checkPositive(spec.height, 'height', prefix);
  checkText(spec.label, 'label', prefix);
  checkFunction(spec.read, 'read', prefix);
  if (spec.format !== undefined) checkFunction(spec.format, 'format', prefix);
  return {
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height === undefined ? DEFAULT_PART_HEIGHT : spec.height,
    label: spec.label,
    read: spec.read,
    format: spec.format === undefined ? null : spec.format,
  };
}

/**
 * 数値・文字の表示（部品）。押しても何も起きず、値は読むだけで書き換えない。
 */
export class UiValue {
  #rect;
  #hitRect;
  #label;
  #read;
  #format;

  /**
   * @param {Object} params
   * @param {{x:number,y:number,width:number,height:number}} params.rect 画面の論理座標の部品の矩形
   * @param {{x:number,y:number,width:number,height:number}} params.hitRect 当たりの範囲（窓が求めて渡す）
   * @param {string | (() => *)} params.label 項目名、または描くたびに呼ぶ関数
   * @param {() => *} params.read 値を読む関数
   * @param {((value: *) => *) | null} params.format 読んだ値を文字にする関数、または null
   */
  constructor({ rect, hitRect, label, read, format }) {
    this.#rect = rect;
    this.#hitRect = hitRect;
    this.#label = label;
    this.#read = read;
    this.#format = format;
  }

  /**
   * 部品の種類の名前。
   * @type {string}
   */
  get kind() {
    return 'value';
  }

  /**
   * 点が当たりの範囲に入っているか（左端・上端を含み、右端・下端を含まない）。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 入っていれば true
   */
  hitTest(x, y) {
    return containsPoint(this.#hitRect, x, y);
  }

  /**
   * 押し始め。持ち主にならない。
   * @returns {boolean} 常に false
   */
  pointerDown() {
    return false;
  }

  /**
   * 描く関数に渡す情報を作る（read を1回呼ぶ。状態は変えない）。
   * @param {number} textSize 文字の大きさ
   * @returns {ValueInfo} 新しい情報オブジェクト
   */
  info(textSize) {
    const value = this.#read();
    const text = this.#format ? String(this.#format(value)) : String(value);
    return {
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#rect.width,
      height: this.#rect.height,
      label: readText(this.#label),
      value,
      text,
      textSize,
    };
  }
}
