/**
 * 責務: ポーズ中の暗幕と「ポーズ」の表示、再開とミュートの入力。
 */
/* ozengine sample */
import { Engine, Scene } from 'oz';
import { toggleMute } from './mute.js';
import { drawMuteLabel, drawText } from './uiText.js';

/**
 * @typedef {{ width: number, height: number }} Screen 解像度
 */

/** 暗幕の色 */
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.5)';
/** 「ポーズ」のフォント */
const PAUSE_FONT = '48px sans-serif';
/** 「ポーズ」の表示文字 */
const PAUSE_TEXT = 'ポーズ';
/** 再開するキー */
const RESUME_KEY = 'KeyP';
/** ミュートを切り替えるキー */
const MUTE_KEY = 'KeyM';
/** 文字を描くレイヤー名 */
const UI_LAYER = 'ui';

/** ポーズ用のシーン。PlayScene の上に積まれる */
export class PauseScene extends Scene {
  /**
   * @param {Screen} screen 解像度
   */
  constructor(screen) {
    super();
    /** @type {Screen} 解像度 */
    this.screen = screen;
  }

  /**
   * 画面を押したら再開する。
   * @param {{ type: string, x: number, y: number }} pointer ポインタ入力
   * @returns {void}
   */
  onPointer(pointer) {
    if (pointer.type === 'down') Engine.popScene();
  }

  /**
   * ポーズキーで再開し、ミュートキーでミュートを切り替える。
   * @param {string} code 押されたキーのコード
   * @returns {void}
   */
  onKeyDown(code) {
    if (code === RESUME_KEY) Engine.popScene();
    else if (code === MUTE_KEY) toggleMute();
  }

  /**
   * ui レイヤーに暗幕と「ポーズ」とミュートの表示を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @returns {void}
   */
  draw(ctx, layer) {
    if (layer !== UI_LAYER) return;
    ctx.save();
    ctx.fillStyle = OVERLAY_COLOR;
    ctx.fillRect(0, 0, this.screen.width, this.screen.height);
    ctx.restore();
    drawText(ctx, PAUSE_TEXT, this.screen.width / 2, this.screen.height / 2, PAUSE_FONT);
    drawMuteLabel(ctx, this.screen);
  }
}
