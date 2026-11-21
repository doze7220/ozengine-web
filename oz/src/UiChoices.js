/**
 * 責務: 選択肢の列の設定の検証（選択肢の一覧と向き）と写し、選択肢ごとの矩形（等分）、当たり判定、押されている選択肢の状態、離したときの書き込みと取り消し、描くための情報。
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
 * 検証済みの選択肢1つ（写したもの）。
 * @typedef {Object} ChoiceSpec
 * @property {string | (() => *)} label 選択肢の文字、または描くたびに呼ぶ関数
 * @property {*} value 選択肢の値（undefined 以外）
 */

/**
 * 検証済みの選択肢の列の設定。
 * @typedef {Object} ChoicesSpec
 * @property {number} x 窓の内側の左上を原点とする x
 * @property {number} y 窓の内側の左上を原点とする y
 * @property {number} width 幅
 * @property {number} height 列の全体の高さ
 * @property {'horizontal' | 'vertical'} direction 並べる向き
 * @property {ChoiceSpec[]} choices 選択肢の一覧（写した新しい配列）
 * @property {() => *} read 値を読む関数（引数なし）
 * @property {(value: *) => void} write 値を書く関数（引数は選ばれた選択肢の値）
 */

/**
 * 描く関数に渡す選択肢1つの情報（座標は画面の論理座標）。
 * @typedef {Object} ChoiceInfo
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} label 読んだ文字
 * @property {*} value 選択肢の値
 * @property {boolean} selected 選ばれているか（read() と === で同じ値か）
 * @property {boolean} pressed 押されているか
 */

/**
 * 描く関数に渡す選択肢の列の情報（座標は画面の論理座標）。
 * @typedef {Object} ChoicesInfo
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {'horizontal' | 'vertical'} direction 並べる向き
 * @property {ChoiceInfo[]} choices 選択肢ごとの情報（新しい配列）
 * @property {number} textSize 文字の大きさ
 */

/** 選択肢の列の設定で使ってよい項目名の一覧。これ以外の項目名はエラーにする。 */
const ALLOWED = ['x', 'y', 'width', 'height', 'choices', 'direction', 'read', 'write'];

/** 選択肢1つで使ってよい項目名の一覧。 */
const CHOICE_ALLOWED = ['label', 'value'];

/**
 * 窓の addChoices に渡された設定を検証し、既定を補って返す。
 * @param {*} spec 利用側から渡された設定オブジェクト
 * @param {string} prefix エラー文の先頭（例: '[oz] 窓の addChoices:'）
 * @returns {ChoicesSpec} 検証済みの設定（選択肢の一覧は要素ごとに写した新しい配列）
 * @throws {Error} 設定が正しくないとき
 */
export function validateChoicesSpec(spec, prefix) {
  if (!isPlainObject(spec)) {
    throw new Error(`${prefix} spec (選択肢の列の設定オブジェクト) が渡されていません`);
  }
  checkNoExtra(spec, ALLOWED, 'spec', prefix);
  checkFinite(spec.x, 'x', prefix);
  checkFinite(spec.y, 'y', prefix);
  checkPositive(spec.width, 'width', prefix);
  if (spec.height !== undefined) checkPositive(spec.height, 'height', prefix);
  if (spec.direction !== undefined && spec.direction !== 'horizontal' && spec.direction !== 'vertical') {
    throw new Error(`${prefix} direction は 'horizontal' か 'vertical' で指定してください`);
  }
  if (!Array.isArray(spec.choices)) {
    throw new Error(`${prefix} choices は配列で指定してください`);
  }
  if (spec.choices.length === 0) {
    throw new Error(`${prefix} choices に選択肢がありません`);
  }
  const choices = [];
  for (let i = 0; i < spec.choices.length; i++) {
    const c = spec.choices[i];
    const where = `choices[${i}]`;
    if (!isPlainObject(c)) {
      throw new Error(`${prefix} ${where} は label と value を持つオブジェクトで指定してください`);
    }
    checkNoExtra(c, CHOICE_ALLOWED, where, prefix);
    checkText(c.label, `${where}.label`, prefix);
    if (c.value === undefined) {
      throw new Error(`${prefix} ${where}.value を指定してください`);
    }
    for (let j = 0; j < choices.length; j++) {
      if (choices[j].value === c.value) {
        throw new Error(`${prefix} ${where}.value が choices[${j}].value と同じです`);
      }
    }
    choices.push({ label: c.label, value: c.value });
  }
  checkFunction(spec.read, 'read', prefix);
  checkFunction(spec.write, 'write', prefix);
  const direction = spec.direction === undefined ? 'horizontal' : spec.direction;
  let height = spec.height;
  if (height === undefined) {
    height = direction === 'vertical' ? DEFAULT_PART_HEIGHT * choices.length : DEFAULT_PART_HEIGHT;
  }
  return {
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height,
    direction,
    choices,
    read: spec.read,
    write: spec.write,
  };
}

/**
 * 選択肢の列（部品）。幅（縦なら高さ）を等分して間を空けずに並べ、押し始めた選択肢の上で離したら値を書く。値は持たない。
 */
export class UiChoices {
  #rect;
  #hitRect;
  #direction;
  #choices;
  #read;
  #write;
  /** 境 b_0〜b_n（選択肢 i は b_i 以上 b_{i+1} 未満）。横なら x、縦なら y の値。 */
  #bounds;
  /** 選択肢ごとの矩形（画面の論理座標）。 */
  #rects;
  #pressed = false;
  #pressedIndex = null;

  /**
   * @param {Object} params
   * @param {{x:number,y:number,width:number,height:number}} params.rect 画面の論理座標の列全体の矩形
   * @param {{x:number,y:number,width:number,height:number}} params.hitRect 押せる範囲（窓が求めて渡す）
   * @param {'horizontal' | 'vertical'} params.direction 並べる向き
   * @param {ChoiceSpec[]} params.choices 検証済みの選択肢の一覧
   * @param {() => *} params.read 値を読む関数
   * @param {(value: *) => void} params.write 値を書く関数
   */
  constructor({ rect, hitRect, direction, choices, read, write }) {
    this.#rect = rect;
    this.#hitRect = hitRect;
    this.#direction = direction;
    this.#choices = choices;
    this.#read = read;
    this.#write = write;
    const n = choices.length;
    const vertical = direction === 'vertical';
    const origin = vertical ? rect.y : rect.x;
    const length = vertical ? rect.height : rect.width;
    this.#bounds = [];
    for (let i = 0; i <= n; i++) {
      this.#bounds.push(origin + (length * i) / n);
    }
    this.#rects = [];
    for (let i = 0; i < n; i++) {
      const start = this.#bounds[i];
      const size = this.#bounds[i + 1] - start;
      this.#rects.push(
        vertical
          ? { x: rect.x, y: start, width: rect.width, height: size }
          : { x: start, y: rect.y, width: size, height: rect.height },
      );
    }
  }

  /**
   * 部品の種類の名前。
   * @type {string}
   */
  get kind() {
    return 'choices';
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
   * 点を含む選択肢の番号を、境 b_i で決める（境を含む側が i。列の外の点は両端の選択肢に寄せる）。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {number} 選択肢の番号（0 から）
   */
  #indexAt(x, y) {
    const p = this.#direction === 'vertical' ? y : x;
    const last = this.#choices.length - 1;
    for (let i = 0; i < last; i++) {
      if (p < this.#bounds[i + 1]) return i;
    }
    return last;
  }

  /**
   * 押し始め。押せる範囲の中なら、点を含む選択肢を押されている状態にして、持ち主になる。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 持ち主になるなら true
   */
  pointerDown(x, y) {
    if (this.hitTest(x, y)) {
      this.#pressedIndex = this.#indexAt(x, y);
      this.#pressed = true;
      return true;
    }
    return false;
  }

  /**
   * 押している間の移動。押し始めた選択肢の上にあるときだけ押されている状態にする。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {void}
   */
  pointerMove(x, y) {
    this.#pressed = this.hitTest(x, y) && this.#indexAt(x, y) === this.#pressedIndex;
  }

  /**
   * 離したとき。押し始めた選択肢の上で離し、読んだ値がその値と違うときだけ write に渡す。
   * 押されている状態は write を呼ぶ前に解く。外やほかの選択肢の上で離せば取り消し。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {void}
   */
  pointerUp(x, y) {
    const index = this.#pressedIndex;
    this.#pressed = false;
    this.#pressedIndex = null;
    if (index !== null && this.hitTest(x, y) && this.#indexAt(x, y) === index) {
      const value = this.#choices[index].value;
      if (this.#read() !== value) {
        this.#write(value);
      }
    }
  }

  /**
   * 描く関数に渡す情報を作る（状態は変えない。read は1回、label の関数は選択肢ごとに呼ぶ）。
   * @param {number} textSize 文字の大きさ
   * @returns {ChoicesInfo} 新しい情報オブジェクト
   */
  info(textSize) {
    const current = this.#read();
    return {
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#rect.width,
      height: this.#rect.height,
      direction: this.#direction,
      choices: this.#choices.map((c, i) => ({
        x: this.#rects[i].x,
        y: this.#rects[i].y,
        width: this.#rects[i].width,
        height: this.#rects[i].height,
        label: readText(c.label),
        value: c.value,
        selected: c.value === current,
        pressed: this.#pressed && this.#pressedIndex === i,
      })),
      textSize,
    };
  }
}
