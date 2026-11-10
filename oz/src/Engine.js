/**
 * @fileoverview 責務: 起動設定の受け取りと各モジュールの初期化、公開操作（シーン操作、timeScale、ボタンの登録、キーの状態の取得、
 * バーチャルパッドの登録と状態の取得）の各モジュールへの委譲。ゲームループの中身や描画処理は持たない。
 */
import { Scene } from './Scene.js';
import { GameLoop } from './GameLoop.js';
import { Time } from './Time.js';
import { Screen } from './Screen.js';
import { Scenes } from './Scenes.js';
import { Layers } from './Layers.js';
import { DebugOverlay } from './DebugOverlay.js';
import { Input } from './Input.js';
import { Buttons } from './Buttons.js';
import { Keys } from './Keys.js';
import { VirtualPad, validatePadLayout } from './VirtualPad.js';
import { VirtualPads } from './VirtualPads.js';

/** tickRate を省略したときの既定値。 */
const DEFAULT_TICK_RATE = 60;

/** @type {Time|null} 起動後の Time。起動前は null */
let time = null;
/** @type {Scenes|null} 起動後の Scenes。起動前は null */
let scenes = null;
/** @type {Buttons|null} 起動後の Buttons。起動前は null */
let buttons = null;
/** @type {Keys|null} 起動後の Keys。起動前は null */
let keys = null;
/** @type {VirtualPads|null} バーチャルパッドが有効なときの VirtualPads。起動前と無効のときは null */
let pads = null;

/**
 * 正の有限数かを判定する。
 * @param {*} value 判定する値
 * @returns {boolean}
 */
function isPositiveFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * 起動設定を検証する。失敗したら項目名を含む Error を投げる。
 * @param {object} config Engine.start に渡された設定
 * @returns {void}
 * @throws {Error} 設定が正しくない場合
 */
function validateConfig(config) {
  if (config === null || typeof config !== 'object') {
    throw new Error('[oz] Engine.start: config (設定オブジェクト) が渡されていません');
  }
  if (!config.canvas || typeof config.canvas.getContext !== 'function') {
    throw new Error('[oz] Engine.start: canvas (canvas 要素) が渡されていません');
  }
  if (!isPositiveFinite(config.width) || !isPositiveFinite(config.height)) {
    throw new Error('[oz] Engine.start: width / height (論理解像度) は正の有限数で指定してください');
  }
  if (!Array.isArray(config.layers) || config.layers.length === 0) {
    throw new Error('[oz] Engine.start: layers (レイヤー名の配列) が渡されていません');
  }
  if (!(config.scene instanceof Scene)) {
    throw new Error('[oz] Engine.start: scene (Scene のインスタンス) が渡されていません');
  }
  if (config.tickRate !== undefined && !isPositiveFinite(config.tickRate)) {
    throw new Error('[oz] Engine.start: tickRate は正の有限数で指定してください');
  }
}

/**
 * 起動済みであることを確認し、Scenes を返す。
 * @param {string} apiName エラーメッセージに含める公開API名
 * @returns {Scenes}
 * @throws {Error} 起動前の場合
 */
function requireScenes(apiName) {
  if (scenes === null) {
    throw new Error(`[oz] ${apiName}: Engine.start の前には使えません`);
  }
  return scenes;
}

/**
 * 起動済みであることを確認する（バーチャルパッドの操作用）。
 * @param {string} apiName エラーメッセージに含める公開API名
 * @returns {void}
 * @throws {Error} 起動前の場合
 */
function requireStarted(apiName) {
  if (scenes === null) {
    throw new Error(`[oz] ${apiName}: Engine.start の前には使えません`);
  }
}

/**
 * シーン引数を検証する。
 * @param {string} apiName エラーメッセージに含める公開API名
 * @param {*} scene 検証する値
 * @returns {void}
 * @throws {Error} Scene のインスタンスでない場合
 */
function validateScene(apiName, scene) {
  if (!(scene instanceof Scene)) {
    throw new Error(`[oz] ${apiName}: scene (Scene のインスタンス) が渡されていません`);
  }
}

/**
 * エンジンの公開API。
 */
export const Engine = {
  /**
   * 設定を検証してエンジンを起動する。2回呼ぶとエラー。
   * @param {object} config 起動設定
   * @param {HTMLCanvasElement} config.canvas 描画先の canvas 要素
   * @param {number} config.width 論理解像度の幅（正の有限数）
   * @param {number} config.height 論理解像度の高さ（正の有限数）
   * @param {string[]} config.layers 奥から手前の順のレイヤー名（空でない配列）
   * @param {Scene} config.scene 最初のシーン（Scene のインスタンス）
   * @param {number} [config.tickRate=60] 1秒あたりのティック数（正の有限数）
   * @param {boolean} [config.debug=false] true なら FPS を表示する
   * @param {boolean} [config.virtualPad=false] true ならバーチャルパッドの仕組みを有効にする
   * @returns {void}
   * @throws {Error} 設定が正しくない場合、または2回目の呼び出しの場合
   */
  start(config) {
    if (scenes !== null) {
      throw new Error('[oz] Engine.start: すでに起動しています');
    }
    validateConfig(config);

    const screen = new Screen(config.canvas, config.width, config.height);
    const ctx = config.canvas.getContext('2d');
    const newTime = new Time(config.tickRate === undefined ? DEFAULT_TICK_RATE : config.tickRate);
    const newScenes = new Scenes();
    const layers = new Layers(config.layers, config.width, config.height);
    const newButtons = new Buttons();
    const newKeys = new Keys();
    const newPads = Boolean(config.virtualPad) ? new VirtualPads() : null;
    const newInput = new Input({ canvas: config.canvas, screen, scenes: newScenes, buttons: newButtons, keys: newKeys, pads: newPads });
    const overlay = Boolean(config.debug) ? new DebugOverlay(config.width, config.height) : null;
    const loop = new GameLoop({ ctx, time: newTime, scenes: newScenes, layers, input: newInput, overlay });

    time = newTime;
    scenes = newScenes;
    buttons = newButtons;
    keys = newKeys;
    pads = newPads;
    newScenes.push(config.scene);
    loop.start();
  },

  /**
   * スタックを全部外して、シーンを1つ積む。
   * @param {Scene} scene 新しいシーン
   * @returns {void}
   * @throws {Error} 起動前、または Scene のインスタンスでない場合
   */
  changeScene(scene) {
    const target = requireScenes('Engine.changeScene');
    validateScene('Engine.changeScene', scene);
    target.change(scene);
  },

  /**
   * シーンを最前面に積む。
   * @param {Scene} scene 積むシーン
   * @returns {void}
   * @throws {Error} 起動前、または Scene のインスタンスでない場合
   */
  pushScene(scene) {
    const target = requireScenes('Engine.pushScene');
    validateScene('Engine.pushScene', scene);
    target.push(scene);
  },

  /**
   * 最前面のシーンを外す。スタックが空なら何もしない。
   * @returns {void}
   * @throws {Error} 起動前の場合
   */
  popScene() {
    requireScenes('Engine.popScene').pop();
  },

  /**
   * 時間の進む速さの倍率（1 が等速）。
   * @returns {number}
   * @throws {Error} 起動前の場合
   */
  get timeScale() {
    if (time === null) {
      throw new Error('[oz] Engine.timeScale: Engine.start の前には使えません');
    }
    return time.timeScale;
  },

  /**
   * 時間の進む速さの倍率を設定する。
   * @param {number} value 有限の数値で 0 以上
   * @throws {Error} 起動前の場合
   * @throws {RangeError} 有限の数値でない、または負の場合
   */
  set timeScale(value) {
    if (time === null) {
      throw new Error('[oz] Engine.timeScale: Engine.start の前には使えません');
    }
    time.timeScale = value;
  },

  /**
   * シーンにボタン（論理座標の矩形）を登録する。押下の位置が矩形の内側なら onPress が呼ばれる。
   * @param {Scene} scene ボタンを持たせるシーン
   * @param {object} button ボタンの設定
   * @param {number} button.x 左端（有限の数値）
   * @param {number} button.y 上端（有限の数値）
   * @param {number} button.width 幅（正の有限数）
   * @param {number} button.height 高さ（正の有限数）
   * @param {function(): void} button.onPress 押されたときに引数なしで呼ばれる関数
   * @returns {void}
   * @throws {Error} 起動前、または引数が正しくない場合
   */
  addButton(scene, button) {
    if (buttons === null) {
      throw new Error('[oz] Engine.addButton: Engine.start の前には使えません');
    }
    validateScene('Engine.addButton', scene);
    if (button === null || typeof button !== 'object') {
      throw new Error('[oz] Engine.addButton: button (ボタンの設定オブジェクト) が渡されていません');
    }
    if (!Number.isFinite(button.x) || !Number.isFinite(button.y)) {
      throw new Error('[oz] Engine.addButton: x / y は有限の数値で指定してください');
    }
    if (!isPositiveFinite(button.width) || !isPositiveFinite(button.height)) {
      throw new Error('[oz] Engine.addButton: width / height は正の有限数で指定してください');
    }
    if (typeof button.onPress !== 'function') {
      throw new Error('[oz] Engine.addButton: onPress は関数で指定してください');
    }
    buttons.add(scene, button);
  },

  /**
   * キーを押している間 true を返す。値は入力の確定時だけ変わる。
   * @param {string} code KeyboardEvent.code の文字列（'Space' など）
   * @returns {boolean}
   * @throws {Error} 起動前の場合
   */
  isKeyDown(code) {
    if (keys === null) {
      throw new Error('[oz] Engine.isKeyDown: Engine.start の前には使えません');
    }
    return keys.isDown(code);
  },

  /**
   * シーンにバーチャルパッドを登録する。引数の検証は有効・無効に関係なく行い、無効のときは検証だけして何もしない。
   * @param {Scene} scene パッドを持たせるシーン
   * @param {object} layout パッドの配置（stick と buttons の少なくとも一方が必要）
   * @param {object} [layout.stick] スティック `{ x, y, radius, deadZone, keys }`
   * @param {object[]} [layout.buttons] ボタンの配列 `{ x, y, radius, key }`
   * @returns {void}
   * @throws {Error} 起動前、scene または layout が正しくない場合、有効なときに同じシーンへ2回登録した場合
   */
  addVirtualPad(scene, layout) {
    requireStarted('Engine.addVirtualPad');
    validateScene('Engine.addVirtualPad', scene);
    validatePadLayout(layout, 'Engine.addVirtualPad');
    if (pads === null) return;
    if (pads.has(scene)) {
      throw new Error('[oz] Engine.addVirtualPad: このシーンにはすでにバーチャルパッドを登録しています');
    }
    pads.add(scene, new VirtualPad(layout));
  },

  /**
   * 起動設定でバーチャルパッドが有効かどうか。
   * @returns {boolean}
   * @throws {Error} 起動前の場合
   */
  get virtualPadEnabled() {
    requireStarted('Engine.virtualPadEnabled');
    return pads !== null;
  },

  /**
   * 有効で、canvas の上を指で触れたことがあれば true。無効のときは常に false。
   * @returns {boolean}
   * @throws {Error} 起動前の場合
   */
  get virtualPadTouched() {
    requireStarted('Engine.virtualPadTouched');
    return pads !== null && pads.touched;
  },

  /**
   * シーンのバーチャルパッドの描画用の状態の写しを返す（毎回新しいオブジェクト）。
   * @param {Scene} scene 対象のシーン
   * @returns {{visible: boolean, stick: object|null, buttons: object[]}|null} 無効、またはシーンに登録が無ければ null
   * @throws {Error} 起動前、または Scene のインスタンスでない場合
   */
  virtualPadState(scene) {
    requireStarted('Engine.virtualPadState');
    validateScene('Engine.virtualPadState', scene);
    return pads === null ? null : pads.state(scene);
  },
};
