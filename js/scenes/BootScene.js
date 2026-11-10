/**
 * 責務: 最初の入力を受ける画面（黒い背景と「TAP SCREEN」の表示）と、入力で次の画面へ進むこと。
 */
import { Engine, Scene } from 'oz';
/* ozengine sample: begin */
import { Sound } from 'oz';
/* ozengine sample: end */

/**
 * @typedef {Object} BootOptions BootScene に渡すオプション
 * @property {{ width: number, height: number }} screen 解像度（背景を塗る範囲と文字の中央の位置に使う）
 * @property {string} layer 背景と文字を描くレイヤー名
 * @property {() => Scene} next 次の画面のシーンを作る関数（進むときに呼ぶ。新規プロジェクトでは自分の最初のシーンを作る関数に書き換える）
 */

/** 背景の色 */
const BACKGROUND_COLOR = '#000000';
/** 表示する文字 */
const BOOT_TEXT = 'TAP SCREEN';
/** 文字の色 */
const BOOT_TEXT_COLOR = '#ffffff';
/** 文字のフォント */
const BOOT_FONT = '48px sans-serif';
/* ozengine sample: begin */
/** 押した瞬間に鳴らす SE の名前 */
const BOOT_SE = 'se';
/* ozengine sample: end */

/** 最初の入力を受け、押す（離す）かキーを押すと次の画面へ進む画面 */
export class BootScene extends Scene {
  /**
   * @param {BootOptions} options オプション
   */
  constructor({ screen, layer, next }) {
    super();
    /** @type {{ width: number, height: number }} 解像度 */
    this.screen = screen;
    /** @type {string} 描くレイヤー名 */
    this.layer = layer;
    /** @type {() => Scene} 次の画面のシーンを作る関数 */
    this.next = next;
    /** @type {boolean} このシーンで押したか（前の画面で押した 'up' では進まないため） */
    this.pressed = false;
  }

  /**
   * 黒い背景と「TAP SCREEN」を画面の中央に描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @returns {void}
   */
  draw(ctx, layer) {
    if (layer !== this.layer) return;
    ctx.save();
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, this.screen.width, this.screen.height);
    ctx.fillStyle = BOOT_TEXT_COLOR;
    ctx.font = BOOT_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(BOOT_TEXT, this.screen.width / 2, this.screen.height / 2);
    ctx.restore();
  }

  /**
   * 押したことを記録し、このシーンで押していれば離したときに次の画面へ進む。
   * @param {{ type: string, x: number, y: number }} pointer ポインタ入力
   * @returns {void}
   */
  onPointer(pointer) {
    if (pointer.type === 'down') {
      this.pressed = true;
      /* ozengine sample: begin */
      Sound.playSe(BOOT_SE);
      /* ozengine sample: end */
    } else if (pointer.type === 'up' && this.pressed) {
      Engine.changeScene(this.next());
    }
  }

  /**
   * Escape 以外のキーで次の画面へ進む（Escape は最初の入力に数えられないため何もしない）。
   * @param {string} code KeyboardEvent.code
   * @returns {void}
   */
  onKeyDown(code) {
    if (code === 'Escape') return;
    /* ozengine sample: begin */
    Sound.playSe(BOOT_SE);
    /* ozengine sample: end */
    Engine.changeScene(this.next());
  }
}
