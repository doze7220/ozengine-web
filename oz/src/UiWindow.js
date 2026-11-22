/**
 * 責務: 1つの窓の設定の検証と保持、窓の形の計算、部品・タブの列・スクロールする領域の追加と並び、タブによる出し分け、ポインタの振り分け、描くための情報（view）の組み立て。
 * Canvas の操作、タブの切り替え・スクロールの計算・タップとドラッグの区別の中身、部品ごとの押下の中身と値の計算、値の保存は行わず、UiSpec・UiMetrics・UiRect・UiButton（閉じるボタン）・UiPartKinds・UiTabs・UiScroll だけを import する。
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
import { UiButton } from './UiButton.js';
import { PART_KINDS } from './UiPartKinds.js';
import { UiTabs, validateTabsSpec } from './UiTabs.js';
import { UiScroll, validateScrollSpec } from './UiScroll.js';

/**
 * 論理座標の矩形。
 * @typedef {import('./UiRect.js').UiRectangle} UiRectangle
 */

/**
 * 描く関数の種類ごとの、描く情報の1部品分。
 * @typedef {Object} UiPartView
 * @property {string} kind 部品の種類の名前（'button'・'value'・'checkbox'・'slider'・'choices'・'tabs' のどれか）
 * @property {Object} info 描く関数に渡す情報（座標は画面の論理座標）
 */

/**
 * view() の部品の情報1つ分。スクロールする領域だけ、中の部品と位置の表示の情報を持つ。
 * @typedef {UiPartView | import('./UiScroll.js').ScrollView} UiWindowPartView
 */

/**
 * 窓の部品の並びの1つ。tab は入っているタブの番号（どのタブにも入れないものは null）。
 * @typedef {Object} UiWindowEntry
 * @property {Object} part 部品（UiButton など、タブの列、スクロールする領域のどれか）
 * @property {number | null} tab 入っているタブの番号か null
 */

/**
 * ポインタの持ち主になれるもの（hitTest・pointerDown の後に pointerMove・pointerUp を受ける部品）。
 * @typedef {{pointerMove: function(number, number): void, pointerUp: function(number, number): void}} UiPointerOwner
 */

/**
 * view() が返す、窓を描くための情報（呼ぶたびに新しく作る）。
 * @typedef {Object} UiWindowView
 * @property {{x:number,y:number,width:number,height:number}} backdrop 暗幕の情報（論理解像度の全体）
 * @property {{x:number,y:number,width:number,height:number,title:string,textSize:number}} window 窓の全体の情報
 * @property {{x:number,y:number,width:number,height:number,title:string,textSize:number}} titleBar タイトルバーの情報
 * @property {{x:number,y:number,width:number,height:number,label:string,pressed:boolean,enabled:boolean,textSize:number}} closeButton 閉じるボタンの情報
 * @property {UiRectangle} content 窓の内側の矩形（部品の切り取りに使う）
 * @property {UiWindowPartView[]} parts 出ている部品の情報（足した順。選ばれていないタブの部品は含まない）
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
  /** @type {UiWindowEntry[]} */
  #parts = [];
  /** @type {UiTabs | null} タブの列（1つまで。無ければ null） */
  #tabs = null;
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
   * @param {number | null} [tab] 入れるタブの番号（Ui.js だけが渡す。検証しない。省略か undefined で窓に直接足す）
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addButton(spec, tab) {
    this.#addPart('addButton', spec, tab);
  }

  /**
   * 数値・文字の表示を足す。
   * @param {Object} spec 表示の設定（x・y・width・height・label・read・format）
   * @param {number | null} [tab] 入れるタブの番号（Ui.js だけが渡す。検証しない。省略か undefined で窓に直接足す）
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addValue(spec, tab) {
    this.#addPart('addValue', spec, tab);
  }

  /**
   * チェックボックスを足す。
   * @param {Object} spec チェックボックスの設定（x・y・width・height・label・read・write）
   * @param {number | null} [tab] 入れるタブの番号（Ui.js だけが渡す。検証しない。省略か undefined で窓に直接足す）
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addCheckbox(spec, tab) {
    this.#addPart('addCheckbox', spec, tab);
  }

  /**
   * スライダーを足す。
   * @param {Object} spec スライダーの設定（x・y・width・height・label・min・max・step・read・write・format）
   * @param {number | null} [tab] 入れるタブの番号（Ui.js だけが渡す。検証しない。省略か undefined で窓に直接足す）
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addSlider(spec, tab) {
    this.#addPart('addSlider', spec, tab);
  }

  /**
   * 選択肢の列を足す。
   * @param {Object} spec 選択肢の列の設定（x・y・width・height・choices・direction・read・write）
   * @param {number | null} [tab] 入れるタブの番号（Ui.js だけが渡す。検証しない。省略か undefined で窓に直接足す）
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  addChoices(spec, tab) {
    this.#addPart('addChoices', spec, tab);
  }

  /**
   * タブの列を足す（1つの窓に1つまで。タブには入れられない）。
   * @param {Object} spec タブの列の設定（x・y・width・height・labels）
   * @param {number | null} [tab] 入れるタブの番号（Ui.js だけが渡す。検証しない。null でなければエラー）
   * @returns {number} タブの数
   * @throws {Error} tab が null でないとき、すでにタブの列があるとき、設定が正しくないとき（足されない）
   */
  addTabs(spec, tab = null) {
    if (tab !== null) {
      throw new Error('[oz] タブの addTabs: タブの列はタブに入れられません');
    }
    if (this.#tabs !== null) {
      throw new Error('[oz] 窓の addTabs: タブの列は1つの窓に1つまでです');
    }
    const s = validateTabsSpec(spec, '[oz] 窓の addTabs:');
    const { rect, hitRect } = this.#partRects(s);
    const tabs = new UiTabs({ rect, hitRect, labels: s.labels });
    this.#tabs = tabs;
    this.#parts.push({ part: tabs, tab: null });
    return s.labels.length;
  }

  /**
   * スクロールする領域を足す。
   * @param {Object} spec 領域の設定（x・y・width・height）
   * @param {number | null} [tab] 入れるタブの番号（Ui.js だけが渡す。検証しない。省略か undefined で窓に直接足す）
   * @returns {UiScroll} 作った領域（中に部品を足す操作を持つ）
   * @throws {Error} 設定が正しくないとき（足されない）
   */
  addScroll(spec, tab) {
    const t = tab === undefined ? null : tab;
    const s = validateScrollSpec(spec, this.#prefix('addScroll', t));
    const { rect } = this.#partRects(s);
    const scroll = new UiScroll({ rect, clipRect: this.#contentRect });
    this.#parts.push({ part: scroll, tab: t });
    return scroll;
  }

  /**
   * エラー文の先頭を作る（tab が null なら窓、そうでなければタブ）。
   * @param {string} op 足す操作の名前
   * @param {number | null} tab タブの番号か null
   * @returns {string} エラー文の先頭
   */
  #prefix(op, tab) {
    return tab === null ? `[oz] 窓の ${op}:` : `[oz] タブの ${op}:`;
  }

  /**
   * 5種類の部品のどれかを、検証して矩形を求め、並びに足す。
   * @param {string} op 足す操作の名前（PART_KINDS のキー）
   * @param {Object} spec 部品の設定
   * @param {number | null | undefined} tab 入れるタブの番号（undefined は null と同じ）
   * @returns {void}
   * @throws {Error} 設定が正しくないとき（部品は足されない）
   */
  #addPart(op, spec, tab) {
    const t = tab === undefined ? null : tab;
    const kind = PART_KINDS[op];
    const s = kind.validate(spec, this.#prefix(op, t));
    const { rect, hitRect } = this.#partRects(s);
    this.#parts.push({ part: kind.create(s, rect, hitRect), tab: t });
  }

  /**
   * 部品が出ているか（どのタブにも入っていない、または選ばれているタブに入っている）。
   * @param {UiWindowEntry} entry 部品の並びの1つ
   * @returns {boolean} 出ていれば true
   */
  #isShown(entry) {
    return entry.tab === null || (this.#tabs !== null && entry.tab === this.#tabs.selected);
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
   * @returns {UiPointerOwner | symbol} 持ち主になる部品（閉じるボタン・5種類の部品・タブの列・スクロールする領域）、OUTSIDE、または NONE
   */
  #findOwner(x, y) {
    if (!containsPoint(this.#windowRect, x, y)) return OUTSIDE;
    if (containsPoint(this.#closeRect, x, y) && this.#closeButton.pointerDown(x, y)) {
      return this.#closeButton;
    }
    if (containsPoint(this.#contentRect, x, y)) {
      for (let i = this.#parts.length - 1; i >= 0; i--) {
        const entry = this.#parts[i];
        if (!this.#isShown(entry)) continue;
        const part = entry.part;
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
      parts: this.#parts
        .filter((entry) => this.#isShown(entry))
        .map(({ part }) =>
          part.kind === 'scroll' ? part.view(t) : { kind: part.kind, info: part.info(t) },
        ),
    };
  }
}
