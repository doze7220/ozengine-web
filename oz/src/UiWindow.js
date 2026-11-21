/**
 * 責務: 1つの窓の設定の検証と保持、窓の形の計算、部品の追加と並び、ポインタの振り分け、描くための情報（view）の組み立て。
 * Canvas の操作、部品ごとの押下の中身、値の保存は行わず、UiSpec・UiMetrics・UiRect・UiButton・UiValue だけを import する。
 */

import {
  LOOK_KINDS,
  isPlainObject,
  checkNoExtra,
  checkFinite,
  checkPositive,
  checkFunction,
  checkString,
  checkBoolean,
} from './UiSpec.js';
import { DEFAULT_TITLE_BAR_HEIGHT, DEFAULT_TEXT_SIZE } from './UiMetrics.js';
import { containsPoint, intersectRect } from './UiRect.js';
import { UiButton, validateButtonSpec } from './UiButton.js';
import { UiValue, validateValueSpec } from './UiValue.js';

/**
 * 論理座標の矩形。
 * @typedef {import('./UiRect.js').UiRectangle} UiRectangle
 */

/**
 * 描く関数の種類ごとの、描く情報の1部品分。
 * @typedef {Object} UiPartView
 * @property {string} kind 部品の種類の名前（'button' か 'value'）
 * @property {Object} info 描く関数に渡す情報（座標は画面の論理座標）
 */

/**
 * view() が返す、窓を描くための情報（呼ぶたびに新しく作る）。
 * @typedef {Object} UiWindowView
 * @property {{x:number,y:number,width:number,height:number}} backdrop 暗幕の情報（論理解像度の全体）
 * @property {{x:number,y:number,width:number,height:number,title:string,textSize:number}} window 窓の全体の情報
 * @property {{x:number,y:number,width:number,height:number,title:string,textSize:number}} titleBar タイトルバーの情報
 * @property {{x:number,y:number,width:number,height:number,label:string,pressed:boolean,enabled:boolean,textSize:number}} closeButton 閉じるボタンの情報
 * @property {UiRectangle} content 窓の内側の矩形（部品の切り取りに使う）
 * @property {UiPartView[]} parts 部品の情報（足した順）
 */

/** Ui.createWindow の options で使ってよい項目名の一覧。これ以外の項目名はエラーにする。 */
const ALLOWED = [
  'title',
  'width',
  'height',
  'x',
  'y',
  'onClose',
  'closeOnOutside',
  'titleBarHeight',
  'textSize',
  'look',
];

/** 窓の設定のエラー文の先頭。 */
const CREATE_PREFIX = '[oz] Ui.createWindow:';

/** addButton のエラー文の先頭。 */
const BUTTON_PREFIX = '[oz] 窓の addButton:';

/** addValue のエラー文の先頭。 */
const VALUE_PREFIX = '[oz] 窓の addValue:';

/** 押し始めの持ち主: 窓の外で押し始めた（離したときに閉じる判定を行う）。 */
const OUTSIDE = Symbol('outside');

/** 押し始めの持ち主: 窓の中の、反応しないところで押し始めた（何も起きない）。 */
const NONE = Symbol('none');

/**
 * 窓の幅か高さが titleBarHeight より大きいことを確かめる。
 * @param {number} v 窓の幅か高さ
 * @param {string} name エラー文での項目名
 * @param {number} titleBarHeight タイトルバーの高さ
 * @returns {void}
 * @throws {Error} titleBarHeight 以下のとき
 */
function checkLargerThanBar(v, name, titleBarHeight) {
  if (v <= titleBarHeight) {
    throw new Error(`${CREATE_PREFIX} ${name} は titleBarHeight より大きくしてください`);
  }
}

/**
 * look を検証し、渡された種類だけを写した凍結したオブジェクトを返す。
 * @param {*} look 利用側から渡された look
 * @returns {Readonly<Object<string, Function>>} 写した look
 * @throws {Error} look が正しくないとき
 */
function copyLook(look) {
  if (!isPlainObject(look)) {
    throw new Error(`${CREATE_PREFIX} look は描く関数のオブジェクトで指定してください`);
  }
  checkNoExtra(look, LOOK_KINDS, 'look', CREATE_PREFIX);
  const copy = {};
  for (const key of Object.keys(look)) {
    checkFunction(look[key], `look.${key}`, CREATE_PREFIX);
    copy[key] = look[key];
  }
  return Object.freeze(copy);
}

/**
 * 1つの窓。設定と形を持ち、部品を並べ、ポインタを振り分け、描くための情報を作る。
 */
export class UiWindow {
  #title;
  #onClose;
  #closeOnOutside;
  #textSize;
  #look;
  #windowRect;
  #titleBarRect;
  #closeRect;
  #contentRect;
  #backdropRect;
  #closeButton;
  #parts = [];
  #capture = null;

  /**
   * @param {Object} options 窓の設定（title・width・height・x・y・onClose・closeOnOutside・titleBarHeight・textSize・look）
   * @param {{width:number,height:number}} screen 論理解像度
   * @throws {Error} options が正しくないとき
   */
  constructor(options, screen) {
    if (!isPlainObject(options)) {
      throw new Error(`${CREATE_PREFIX} options (窓の設定オブジェクト) が渡されていません`);
    }
    checkNoExtra(options, ALLOWED, 'options', CREATE_PREFIX);
    checkString(options.title, 'title', CREATE_PREFIX);
    checkPositive(options.width, 'width', CREATE_PREFIX);
    checkPositive(options.height, 'height', CREATE_PREFIX);
    if (options.titleBarHeight !== undefined) {
      checkPositive(options.titleBarHeight, 'titleBarHeight', CREATE_PREFIX);
    }
    const titleBarHeight =
      options.titleBarHeight === undefined ? DEFAULT_TITLE_BAR_HEIGHT : options.titleBarHeight;
    checkLargerThanBar(options.width, 'width', titleBarHeight);
    checkLargerThanBar(options.height, 'height', titleBarHeight);
    if (options.x !== undefined) checkFinite(options.x, 'x', CREATE_PREFIX);
    if (options.y !== undefined) checkFinite(options.y, 'y', CREATE_PREFIX);
    checkFunction(options.onClose, 'onClose', CREATE_PREFIX);
    if (options.closeOnOutside !== undefined) {
      checkBoolean(options.closeOnOutside, 'closeOnOutside', CREATE_PREFIX);
    }
    if (options.textSize !== undefined) checkPositive(options.textSize, 'textSize', CREATE_PREFIX);
    const look = options.look === undefined ? Object.freeze({}) : copyLook(options.look);

    const { width, height } = options;
    const x = options.x === undefined ? (screen.width - width) / 2 : options.x;
    const y = options.y === undefined ? (screen.height - height) / 2 : options.y;

    this.#title = options.title;
    this.#onClose = options.onClose;
    this.#closeOnOutside = options.closeOnOutside === undefined ? true : options.closeOnOutside;
    this.#textSize = options.textSize === undefined ? DEFAULT_TEXT_SIZE : options.textSize;
    this.#look = look;
    this.#windowRect = { x, y, width, height };
    this.#titleBarRect = { x, y, width, height: titleBarHeight };
    this.#closeRect = {
      x: x + width - titleBarHeight,
      y,
      width: titleBarHeight,
      height: titleBarHeight,
    };
    this.#contentRect = { x, y: y + titleBarHeight, width, height: height - titleBarHeight };
    this.#backdropRect = { x: 0, y: 0, width: screen.width, height: screen.height };
    this.#closeButton = new UiButton({
      rect: this.#closeRect,
      hitRect: this.#closeRect,
      label: '',
      onPress: this.#onClose,
      enabled: null,
    });
  }

  /**
   * 渡された種類だけを写した、凍結した描く関数のオブジェクト。
   * @type {Readonly<Object<string, Function>>}
   */
  get look() {
    return this.#look;
  }

  /**
   * ボタンを足す。
   * @param {Object} spec ボタンの設定（x・y・width・height・label・onPress・enabled）
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addButton(spec) {
    const s = validateButtonSpec(spec, BUTTON_PREFIX);
    const { rect, hitRect } = this.#partRects(s);
    this.#parts.push(
      new UiButton({ rect, hitRect, label: s.label, onPress: s.onPress, enabled: s.enabled }),
    );
  }

  /**
   * 数値・文字の表示を足す。
   * @param {Object} spec 表示の設定（x・y・width・height・label・read・format）
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addValue(spec) {
    const s = validateValueSpec(spec, VALUE_PREFIX);
    const { rect, hitRect } = this.#partRects(s);
    this.#parts.push(
      new UiValue({ rect, hitRect, label: s.label, read: s.read, format: s.format }),
    );
  }

  /**
   * 部品の画面の矩形と、窓の内側との重なり（押せる範囲）を求める。
   * @param {{x:number,y:number,width:number,height:number}} s 検証済みの設定（窓の内側の左上が原点）
   * @returns {{rect: UiRectangle, hitRect: UiRectangle}} 画面の論理座標の矩形と当たりの矩形
   */
  #partRects(s) {
    const rect = {
      x: this.#windowRect.x + s.x,
      y: this.#contentRect.y + s.y,
      width: s.width,
      height: s.height,
    };
    return { rect, hitRect: intersectRect(rect, this.#contentRect) };
  }

  /**
   * ポインタを受けて、押し始めの持ち主に振り分ける。知らない type は何もしない。
   * @param {{type: string, x: number, y: number}} pointer ポインタ（論理座標）
   * @returns {void}
   */
  onPointer({ type, x, y }) {
    if (type === 'down') {
      if (this.#capture === null) this.#capture = this.#findOwner(x, y);
    } else if (type === 'move') {
      const owner = this.#capture;
      if (owner !== null && owner !== OUTSIDE && owner !== NONE) owner.pointerMove(x, y);
    } else if (type === 'up') {
      const owner = this.#capture;
      this.#capture = null;
      if (owner === OUTSIDE) {
        if (this.#closeOnOutside && !containsPoint(this.#windowRect, x, y)) this.#onClose();
      } else if (owner !== null && owner !== NONE) {
        owner.pointerUp(x, y);
      }
    }
  }

  /**
   * 押し始めの位置から持ち主を決める。
   * @param {number} x 論理座標の x
   * @param {number} y 論理座標の y
   * @returns {UiButton | UiValue | symbol} 部品、OUTSIDE、または NONE
   */
  #findOwner(x, y) {
    if (!containsPoint(this.#windowRect, x, y)) return OUTSIDE;
    if (containsPoint(this.#closeRect, x, y) && this.#closeButton.pointerDown(x, y)) {
      return this.#closeButton;
    }
    if (containsPoint(this.#contentRect, x, y)) {
      for (let i = this.#parts.length - 1; i >= 0; i--) {
        const part = this.#parts[i];
        if (part.hitTest(x, y)) return part.pointerDown(x, y) ? part : NONE;
      }
    }
    return NONE;
  }

  /**
   * 窓を描くための情報を毎回新しく作る（label・enabled・read・format を呼ぶだけで状態は変えない）。
   * @returns {UiWindowView} 描くための情報
   */
  view() {
    const t = this.#textSize;
    const w = this.#windowRect;
    const b = this.#titleBarRect;
    const c = this.#contentRect;
    return {
      backdrop: { ...this.#backdropRect },
      window: { x: w.x, y: w.y, width: w.width, height: w.height, title: this.#title, textSize: t },
      titleBar: { x: b.x, y: b.y, width: b.width, height: b.height, title: this.#title, textSize: t },
      closeButton: this.#closeButton.info(t),
      content: { x: c.x, y: c.y, width: c.width, height: c.height },
      parts: this.#parts.map((part) => ({ kind: part.kind, info: part.info(t) })),
    };
  }
}
