/**
 * 責務: 窓を1つ置くシーン（窓を作る関数の呼び出しとポインタ・描画の受け渡し、窓の下でのバーチャルパッドの指の受け止め）と、その開き方。
 * 窓の中身は呼ぶ側から受け取る。
 */
import { Engine, Scene } from 'oz';
import { VIRTUAL_PAD_LAYOUT } from '../ui/virtualPadConfig.js';

/**
 * @typedef {Object} PlacedWindow 窓の操作のオブジェクト（Ui.createWindow の戻り値のうち、このシーンが使う2つ）
 * @property {(pointer: object) => void} onPointer ポインタを窓へ渡す
 * @property {(ctx: CanvasRenderingContext2D) => void} draw 窓を描く
 */

/**
 * @typedef {Object} WindowSceneOptions WindowScene と openWindow に渡すオプション
 * @property {string} layer 窓を描くレイヤー名
 * @property {() => PlacedWindow} createWindow 窓を作って返す関数（init で1回呼ぶ）。窓の onClose で Engine.popScene() すると閉じる
 */

/** 窓を1つ置くシーン。今の画面の上に積まれ、積んでいる間は下のシーンの update が止まる */
export class WindowScene extends Scene {
  /**
   * @param {WindowSceneOptions} options 描くレイヤー名と、窓を作る関数
   */
  constructor({ layer, createWindow }) {
    super();
    /** @type {string} 窓を描くレイヤー名 */
    this.layer = layer;
    /** @type {() => PlacedWindow} 窓を作る関数 */
    this.createWindow = createWindow;
    /** @type {PlacedWindow | null} 窓。init で作る */
    this.window = null;
  }

  /**
   * パッドを登録し、窓を作る。パッドは描かない（背面のシーンが描く）。
   * パッドが反応するのは最前面のシーンに登録したパッドだけなので、登録しないと、背面のパッドの位置を押した指が
   * このシーンの onPointer に窓の外の押下として届き、closeOnOutside が true の窓が閉じてしまう（ENGINE_API 26章「注意」）。
   * 登録するのは背面と同じ配置（VIRTUAL_PAD_LAYOUT）の固定で、背面の配置が違う画面の上に窓を置くときは、このシーンを直すこと。
   * virtualPad: false のゲームでは Engine.addVirtualPad は何も登録しないので、そのまま動く。
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

/**
 * 窓を最前面に積んで開く。閉じる操作は持たない（窓の onClose で Engine.popScene() する）。
 * @param {WindowSceneOptions} options 窓を描くレイヤー名と、窓を作る関数
 * @returns {void}
 */
export function openWindow(options) {
  Engine.pushScene(new WindowScene(options));
}
