/**
 * 責務: UI 部品の公開の口 Ui（createWindow）と、利用側に返す窓・タブ・スクロールする領域のオブジェクトの受け渡し、
 * Engine から受け取る論理解像度の保持。
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
 * 利用側に返すタブのオブジェクト（凍結した7つの操作だけを持つ。そのタブの中に部品を足す）。
 * @typedef {Object} UiTabHandle
 * @property {function(Object): void} addButton ボタンをこのタブに足す
 * @property {function(Object): void} addValue 数値・文字の表示をこのタブに足す
 * @property {function(Object): void} addCheckbox チェックボックスをこのタブに足す
 * @property {function(Object): void} addSlider スライダーをこのタブに足す
 * @property {function(Object): void} addChoices 選択肢の列をこのタブに足す
 * @property {function(Object): UiScrollHandle} addScroll スクロールする領域をこのタブに足す
 * @property {function(Object): never} addTabs 呼ぶと必ずエラー（タブの列はタブに入れられない）
 */

/**
 * 利用側に返すスクロールする領域のオブジェクト（凍結した7つの操作だけを持つ。領域の中に部品を足す）。
 * @typedef {Object} UiScrollHandle
 * @property {function(Object): void} addButton ボタンを領域の中に足す
 * @property {function(Object): void} addValue 数値・文字の表示を領域の中に足す
 * @property {function(Object): void} addCheckbox チェックボックスを領域の中に足す
 * @property {function(Object): void} addSlider スライダーを領域の中に足す
 * @property {function(Object): void} addChoices 選択肢の列を領域の中に足す
 * @property {function(Object): never} addTabs 呼ぶと必ずエラー（タブの列は領域に入れられない）
 * @property {function(Object): never} addScroll 呼ぶと必ずエラー（領域は領域に入れられない）
 */

/**
 * スクロールする領域のモデルから、領域のオブジェクトを作る（受け渡しだけ）。
 * @param {import('./UiScroll.js').UiScroll} scroll 領域のモデル
 * @returns {UiScrollHandle} 凍結した領域のオブジェクト
 */
function makeScrollHandle(scroll) {
  return Object.freeze({
    addButton(spec) {
      scroll.addButton(spec);
    },
    addValue(spec) {
      scroll.addValue(spec);
    },
    addCheckbox(spec) {
      scroll.addCheckbox(spec);
    },
    addSlider(spec) {
      scroll.addSlider(spec);
    },
    addChoices(spec) {
      scroll.addChoices(spec);
    },
    addTabs(spec) {
      scroll.addTabs(spec);
    },
    addScroll(spec) {
      scroll.addScroll(spec);
    },
  });
}

/**
 * 窓のモデルから、i 番目のタブのオブジェクトを作る（受け渡しだけ）。
 * @param {UiWindow} model 窓のモデル
 * @param {number} i タブの番号
 * @returns {UiTabHandle} 凍結したタブのオブジェクト
 */
function makeTabHandle(model, i) {
  return Object.freeze({
    addButton(spec) {
      model.addButton(spec, i);
    },
    addValue(spec) {
      model.addValue(spec, i);
    },
    addCheckbox(spec) {
      model.addCheckbox(spec, i);
    },
    addSlider(spec) {
      model.addSlider(spec, i);
    },
    addChoices(spec) {
      model.addChoices(spec, i);
    },
    addScroll(spec) {
      return makeScrollHandle(model.addScroll(spec, i));
    },
    addTabs(spec) {
      model.addTabs(spec, i);
    },
  });
}

/**
 * 利用側に返す窓のオブジェクト（凍結した9つの操作だけを持つ）。
 * @typedef {Object} UiWindowHandle
 * @property {function(Object): void} addButton ボタンを足す（spec は窓の addButton の設定オブジェクト）
 * @property {function(Object): void} addValue 数値・文字の表示を足す（spec は窓の addValue の設定オブジェクト）
 * @property {function(Object): void} addCheckbox チェックボックスを足す（spec は窓の addCheckbox の設定オブジェクト）
 * @property {function(Object): void} addSlider スライダーを足す（spec は窓の addSlider の設定オブジェクト）
 * @property {function(Object): void} addChoices 選択肢の列を足す（spec は窓の addChoices の設定オブジェクト）
 * @property {function(Object): ReadonlyArray<UiTabHandle>} addTabs タブの列を足し、タブごとのオブジェクトの配列（凍結）を返す
 * @property {function(Object): UiScrollHandle} addScroll スクロールする領域を足し、領域のオブジェクトを返す
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
   * @returns {UiWindowHandle} 窓の操作（addButton・addValue・addCheckbox・addSlider・addChoices・addTabs・addScroll・onPointer・draw）
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
      addCheckbox(spec) {
        model.addCheckbox(spec);
      },
      addSlider(spec) {
        model.addSlider(spec);
      },
      addChoices(spec) {
        model.addChoices(spec);
      },
      addTabs(spec) {
        const count = model.addTabs(spec);
        const handles = [];
        for (let i = 0; i < count; i++) {
          handles.push(makeTabHandle(model, i));
        }
        return Object.freeze(handles);
      },
      addScroll(spec) {
        return makeScrollHandle(model.addScroll(spec));
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
