/**
 * 責務: スライダーの設定の検証（min・max・step）、溝とつまみの形の計算、当たり判定、ドラッグの状態、
 * 位置から刻みの値への変換（遊びと小数の丸めを含む）と書き込み、描くための情報。
 * Canvas の操作は行わず、UiSpec・UiMetrics・UiRect だけを import する。
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
import {
  DEFAULT_SLIDER_HEIGHT,
  SLIDER_KNOB_SIZE,
  SLIDER_GROOVE_HEIGHT,
  SLIDER_HYSTERESIS,
} from './UiMetrics.js';
import { containsPoint } from './UiRect.js';

/**
 * 検証済みのスライダーの設定。
 * @typedef {Object} SliderSpec
 * @property {number} x 窓の内側の左上を原点とする x
 * @property {number} y 窓の内側の左上を原点とする y
 * @property {number} width 幅（SLIDER_KNOB_SIZE より大きい）
 * @property {number} height 高さ
 * @property {string | (() => *)} label 項目名の文字、または描くたびに呼ぶ関数
 * @property {number} min 最小
 * @property {number} max 最大（min より大きい）
 * @property {number} step 刻み（max - min の整数倍）
 * @property {() => *} read 値を読む関数（引数なし）
 * @property {(value: number) => void} write 値を書く関数（引数は刻みの値）
 * @property {((value: *) => *) | null} format 読んだ値を値の文字にする関数、または null
 */

/**
 * 描く関数に渡すスライダーの情報（座標は画面の論理座標）。
 * @typedef {Object} SliderInfo
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} label 読んだ文字
 * @property {*} value read の戻り値そのもの
 * @property {string} text 値の文字（read の戻り値を format で整えたもの）
 * @property {number} min
 * @property {number} max
 * @property {number} step
 * @property {{x:number,y:number,width:number,height:number}} textRow 文字の段（上の 1/3）
 * @property {{x:number,y:number,width:number,height:number}} track 溝
 * @property {{x:number,y:number,width:number,height:number}} knob つまみ
 * @property {boolean} pressed ドラッグ中か
 * @property {number} textSize 文字の大きさ
 */

/** スライダーの設定で使ってよい項目名の一覧。これ以外の項目名はエラーにする。 */
const ALLOWED = ['x', 'y', 'width', 'height', 'label', 'min', 'max', 'step', 'read', 'write', 'format'];

/**
 * max - min が step の整数倍かを判定するときに許す相対の誤差（刻みの数 k に掛けて使う）。
 * step が max - min 以下かの判定にも使う（(max - min) / step が 1 - この値より小さいときだけエラー）。
 */
const MULTIPLE_TOLERANCE = 1e-9;

/**
 * max - min が step の整数倍なら、刻みの数 k（max - min を step で割って丸めた整数）を返す。
 * @param {number} min 最小
 * @param {number} max 最大
 * @param {number} step 刻み
 * @returns {number} 整数倍なら刻みの数 k、そうでなければ -1
 */
function countSteps(min, max, step) {
  const n = (max - min) / step;
  const k = Math.round(n);
  return Math.abs(n - k) <= k * MULTIPLE_TOLERANCE ? k : -1;
}

/**
 * 数を丸めずに表せる最小の小数の桁数（0〜20）を返す。
 * @param {number} v 調べる数
 * @returns {number} 桁数。どの桁数でも表せなければ -1
 */
function decimalPlaces(v) {
  for (let d = 0; d <= 20; d += 1) {
    if (Number(v.toFixed(d)) === v) return d;
  }
  return -1;
}

/**
 * 窓の addSlider に渡された設定を検証し、既定を補って返す。
 * @param {*} spec 利用側から渡された設定オブジェクト
 * @param {string} prefix エラー文の先頭（例: '[oz] 窓の addSlider:'）
 * @returns {SliderSpec} 検証済みの設定（値は写したもの）
 * @throws {Error} 設定が正しくないとき
 */
export function validateSliderSpec(spec, prefix) {
  if (!isPlainObject(spec)) {
    throw new Error(`${prefix} spec (スライダーの設定オブジェクト) が渡されていません`);
  }
  checkNoExtra(spec, ALLOWED, 'spec', prefix);
  checkFinite(spec.x, 'x', prefix);
  checkFinite(spec.y, 'y', prefix);
  checkPositive(spec.width, 'width', prefix);
  if (spec.height !== undefined) checkPositive(spec.height, 'height', prefix);
  if (spec.width <= SLIDER_KNOB_SIZE) {
    throw new Error(`${prefix} width は ${SLIDER_KNOB_SIZE} より大きくしてください`);
  }
  checkText(spec.label, 'label', prefix);
  checkFinite(spec.min, 'min', prefix);
  checkFinite(spec.max, 'max', prefix);
  if (spec.max <= spec.min) {
    throw new Error(`${prefix} max は min より大きくしてください`);
  }
  checkPositive(spec.step, 'step', prefix);
  if ((spec.max - spec.min) / spec.step < 1 - MULTIPLE_TOLERANCE) {
    throw new Error(`${prefix} step は max - min 以下にしてください`);
  }
  if (countSteps(spec.min, spec.max, spec.step) < 0) {
    throw new Error(`${prefix} max - min は step の整数倍にしてください`);
  }
  checkFunction(spec.read, 'read', prefix);
  checkFunction(spec.write, 'write', prefix);
  if (spec.format !== undefined) checkFunction(spec.format, 'format', prefix);
  return {
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height === undefined ? DEFAULT_SLIDER_HEIGHT : spec.height,
    label: spec.label,
    min: spec.min,
    max: spec.max,
    step: spec.step,
    read: spec.read,
    write: spec.write,
    format: spec.format === undefined ? null : spec.format,
  };
}

/**
 * スライダー（部品）。溝を押すと値がその位置の刻みへ飛び、ドラッグで追う。値は持たない。
 */
export class UiSlider {
  #rect;
  #hitRect;
  #label;
  #min;
  #max;
  #step;
  #read;
  #write;
  #format;
  #k;
  #digits;
  #textRow;
  #track;
  #knobSize;
  #cy;
  #pressed = false;
  #dragIndex = null;

  /**
   * @param {Object} params
   * @param {{x:number,y:number,width:number,height:number}} params.rect 画面の論理座標の部品の矩形
   * @param {{x:number,y:number,width:number,height:number}} params.hitRect 押せる範囲（窓が求めて渡す）
   * @param {string | (() => *)} params.label 項目名の文字、または描くたびに呼ぶ関数
   * @param {number} params.min 最小
   * @param {number} params.max 最大
   * @param {number} params.step 刻み（検証済み。max - min の整数倍）
   * @param {() => *} params.read 値を読む関数
   * @param {(value: number) => void} params.write 値を書く関数
   * @param {((value: *) => *) | null} params.format 読んだ値を文字にする関数、または null
   */
  constructor({ rect, hitRect, label, min, max, step, read, write, format }) {
    this.#rect = rect;
    this.#hitRect = hitRect;
    this.#label = label;
    this.#min = min;
    this.#max = max;
    this.#step = step;
    this.#read = read;
    this.#write = write;
    this.#format = format;
    this.#k = countSteps(min, max, step);

    const digitsList = [min, max, step].map(decimalPlaces);
    this.#digits = digitsList.includes(-1) ? -1 : Math.max(...digitsList);

    const third = rect.height / 3;
    this.#textRow = { x: rect.x, y: rect.y, width: rect.width, height: third };
    const grooveRowHeight = (rect.height * 2) / 3;
    this.#knobSize = Math.min(SLIDER_KNOB_SIZE, grooveRowHeight);
    this.#cy = rect.y + (rect.height * 2) / 3;
    this.#track = {
      x: rect.x + this.#knobSize / 2,
      y: this.#cy - SLIDER_GROOVE_HEIGHT / 2,
      width: rect.width - this.#knobSize,
      height: SLIDER_GROOVE_HEIGHT,
    };
  }

  /**
   * 部品の種類の名前。
   * @type {string}
   */
  get kind() {
    return 'slider';
  }

  /**
   * 点が押せる範囲に入っているか（左端・上端を含み、右端・下端を含まない。縦の位置は使わない設計だが範囲は矩形全体）。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 入っていれば true
   */
  hitTest(x, y) {
    return containsPoint(this.#hitRect, x, y);
  }

  /**
   * 刻みの番号の値を、小数の誤差を出さずに求める。
   * @param {number} i 刻みの番号（0〜k の整数）
   * @returns {number} 刻みの値（0 番は min、k 番は max そのもの）
   */
  #valueAt(i) {
    if (i === 0) return this.#min;
    if (i === this.#k) return this.#max;
    const v = this.#min + i * this.#step;
    return this.#digits < 0 ? v : Number(v.toFixed(this.#digits));
  }

  /**
   * 刻みの番号の位置（つまみの中心の x）を求める。
   * @param {number} i 刻みの番号
   * @returns {number} 画面の論理座標の x
   */
  #positionAt(i) {
    return this.#track.x + (this.#track.width * i) / this.#k;
  }

  /**
   * ポインタの x から、刻みの番号（遊びなし）を求める。溝の端より外は 0・k に寄せる。
   * @param {number} px 画面の論理座標の x
   * @returns {number} 刻みの番号
   */
  #indexAt(px) {
    const t = Math.min(1, Math.max(0, (px - this.#track.x) / this.#track.width));
    return Math.round(t * this.#k);
  }

  /**
   * 番号の刻みの値が今の値と違えば write に渡す。
   * @param {number} i 刻みの番号
   * @returns {void}
   */
  #writeIndex(i) {
    const value = this.#valueAt(i);
    if (this.#read() !== value) this.#write(value);
  }

  /**
   * 押し始め。押せる範囲の中なら、押した位置の刻みの値を書き（遊びは使わない）、ドラッグ中にして持ち主になる。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y
   * @returns {boolean} 持ち主になるなら true
   */
  pointerDown(x, y) {
    if (!this.hitTest(x, y)) return false;
    const i = this.#indexAt(x);
    this.#writeIndex(i);
    this.#pressed = true;
    this.#dragIndex = i;
    return true;
  }

  /**
   * ドラッグ中の移動。指が部品の外へずれても横の位置で追う。端の外は端に止め、
   * それ以外は刻みの境目を遊びの幅以上越えたときだけ番号を変えて書く。
   * @param {number} x 画面の論理座標の x
   * @param {number} y 画面の論理座標の y（使わない）
   * @returns {void}
   */
  pointerMove(x, y) {
    if (this.#dragIndex === null) return;
    let next = this.#dragIndex;
    if (x <= this.#track.x) {
      next = 0;
    } else if (x >= this.#track.x + this.#track.width) {
      next = this.#k;
    } else {
      const c = this.#indexAt(x);
      const half = this.#track.width / this.#k / 2;
      if (c !== this.#dragIndex && Math.abs(x - this.#positionAt(this.#dragIndex)) >= half + SLIDER_HYSTERESIS) {
        next = c;
      }
    }
    if (next === this.#dragIndex) return;
    this.#dragIndex = next;
    this.#writeIndex(next);
  }

  /**
   * 離したとき。ドラッグを終えるだけで、離した位置では値を変えない（取り消しも無い）。
   * @returns {void}
   */
  pointerUp() {
    this.#pressed = false;
    this.#dragIndex = null;
  }

  /**
   * 描く関数に渡す情報を作る（状態は変えない。read を1回、label・format の関数を呼ぶ）。
   * @param {number} textSize 文字の大きさ
   * @returns {SliderInfo} 新しい情報オブジェクト
   */
  info(textSize) {
    const value = this.#read();
    const text = this.#format ? String(this.#format(value)) : String(value);
    let t = 0;
    if (typeof value === 'number' && !Number.isNaN(value)) {
      t = Math.min(1, Math.max(0, (value - this.#min) / (this.#max - this.#min)));
    }
    const center = this.#track.x + this.#track.width * t;
    return {
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#rect.width,
      height: this.#rect.height,
      label: readText(this.#label),
      value,
      text,
      min: this.#min,
      max: this.#max,
      step: this.#step,
      textRow: { ...this.#textRow },
      track: { ...this.#track },
      knob: {
        x: center - this.#knobSize / 2,
        y: this.#cy - this.#knobSize / 2,
        width: this.#knobSize,
        height: this.#knobSize,
      },
      pressed: this.#pressed,
      textSize,
    };
  }
}
