/**
 * 責務: UI 部品の公開の口 Ui（createWindow）と、利用側に返す窓の操作の受け渡し、Engine から受け取る論理解像度の保持。
 * 窓・部品の処理の中身と描画の中身は UiWindow・UiRenderer に任せ、この2つだけを import する。
 */

import { UiWindow } from './UiWindow.js';
import { drawUiWindow } from './UiRenderer.js';

/**
 * 論理解像度（画面の大きさ）。Engine.start が setUiScreenSize で渡すまでは null（起動前）。
 * @type {{width:number, height:number}|null}
 */
let screenSize = null;

/**
 * 論理解像度を受け取って保持する。Engine だけが起動時に呼ぶ（利用側は呼ばない。oz/index.js からは出さない）。引数は検証しない。
 * @param {number} width 論理解像度の幅
 * @param {number} height 論理解像度の高さ
 * @returns {void}
 */
export function setUiScreenSize(width, height) {
  screenSize = { width, height };
}

/**
 * 利用側に返す窓のオブジェクト（凍結した4つの操作だけを持つ）。
 * @typedef {Object} UiWindowHandle
 * @property {function(Object): void} addButton ボタンを足す（spec は窓の addButton の設定オブジェクト）
 * @property {function(Object): void} addValue 数値・文字の表示を足す（spec は窓の addValue の設定オブジェクト）
 * @property {function(Object): void} onPointer シーンの onPointer で受けたポインタを渡す
 * @property {function(CanvasRenderingContext2D): void} draw 窓を描く（シーンの draw の中で呼ぶ）
 */

/**
 * UI 部品の公開の口。
 * @type {{createWindow: function(Object): UiWindowHandle}}
 */
export const Ui = {
  /**
   * 窓を作る。Engine.start の後でだけ使える。
   * @param {Object} options 窓の設定（title, width, height, x, y, onClose, closeOnOutside, titleBarHeight, textSize, look）
   * @returns {UiWindowHandle} 窓の操作（addButton・addValue・onPointer・draw）
   * @throws {Error} 起動前、または options が正しくない場合
   */
  createWindow(options) {
    if (screenSize === null) {
      throw new Error('[oz] Ui.createWindow: Engine.start の前には使えません');
    }
    const model = new UiWindow(options, screenSize);
    return Object.freeze({
      addButton(spec) {
        model.addButton(spec);
      },
      addValue(spec) {
        model.addValue(spec);
      },
      onPointer(pointer) {
        model.onPointer(pointer);
      },
      draw(ctx) {
        drawUiWindow(ctx, model.view(), model.look);
      },
    });
  },
};
