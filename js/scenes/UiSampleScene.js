/**
 * 責務: UI の見本の窓を1つ置くシーン（窓を作る関数の呼び出しとポインタ・描画の受け渡し、窓の下でのバーチャルパッドの指の受け止め）。
 */
/* ozengine sample */
import { Engine, Scene } from 'oz';
import { VIRTUAL_PAD_LAYOUT } from '../ui/virtualPadConfig.js';

/**
 * @typedef {Object} SampleWindow 窓の操作のオブジェクト（Ui.createWindow の戻り値のうち、このシーンが使う2つ）
 * @property {(pointer: object) => void} onPointer ポインタを窓へ渡す
 * @property {(ctx: CanvasRenderingContext2D) => void} draw 窓を描く
 */

/**
 * @typedef {Object} UiSampleSceneOptions UiSampleScene に渡すオプション
 * @property {string} layer 窓を描くレイヤー名
 * @property {() => SampleWindow} createWindow 窓を作って返す関数（init で1回呼ぶ）
 */

/** UI の見本の窓を1つ置くシーン。PlayScene の上に積まれ、積んでいる間は下のシーンの update が止まる */
export class UiSampleScene extends Scene {
  /**
   * @param {UiSampleSceneOptions} options 描くレイヤー名と、窓を作る関数
   */
  constructor({ layer, createWindow }) {
    super();
    /** @type {string} 窓を描くレイヤー名 */
    this.layer = layer;
    /** @type {() => SampleWindow} 窓を作る関数 */
    this.createWindow = createWindow;
    /** @type {SampleWindow | null} 窓。init で作る */
    this.window = null;
  }

  /**
   * パッドを登録し（パッドの指を窓に届かせないため）、窓を作る。パッドは描かない（背面の PlayScene が描く）。
   * @returns {void}
   */
  init() {
    Engine.addVirtualPad(this, VIRTUAL_PAD_LAYOUT);
    this.window = this.createWindow();
  }

  /**
   * ポインタを窓へ渡す。
   * @param {object} pointer エンジンから受けたポインタ
   * @returns {void}
   */
  onPointer(pointer) {
    this.window.onPointer(pointer);
  }

  /**
   * 指定のレイヤーが窓のレイヤーのとき、窓を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @returns {void}
   */
  draw(ctx, layer) {
    if (layer === this.layer) this.window.draw(ctx);
  }
}
