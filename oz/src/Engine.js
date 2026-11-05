/**
 * @fileoverview 責務: 起動設定の受け取りと各モジュールの初期化、公開操作（シーン操作、timeScale）の各モジュールへの委譲。
 * ゲームループの中身や描画処理は持たない。
 */
import { Scene } from './Scene.js';
import { GameLoop } from './GameLoop.js';
import { Time } from './Time.js';
import { Screen } from './Screen.js';
import { Scenes } from './Scenes.js';
import { Layers } from './Layers.js';
import { DebugOverlay } from './DebugOverlay.js';

/** tickRate を省略したときの既定値。 */
const DEFAULT_TICK_RATE = 60;

/** @type {Time|null} 起動後の Time。起動前は null */
let time = null;
/** @type {Scenes|null} 起動後の Scenes。起動前は null */
let scenes = null;

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
   * @returns {void}
   * @throws {Error} 設定が正しくない場合、または2回目の呼び出しの場合
   */
  start(config) {
    if (scenes !== null) {
      throw new Error('[oz] Engine.start: すでに起動しています');
    }
    validateConfig(config);

    new Screen(config.canvas, config.width, config.height);
    const ctx = config.canvas.getContext('2d');
    const newTime = new Time(config.tickRate === undefined ? DEFAULT_TICK_RATE : config.tickRate);
    const newScenes = new Scenes();
    const layers = new Layers(config.layers);
    const overlay = Boolean(config.debug) ? new DebugOverlay() : null;
    const loop = new GameLoop({ ctx, time: newTime, scenes: newScenes, layers, overlay });

    time = newTime;
    scenes = newScenes;
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
};
