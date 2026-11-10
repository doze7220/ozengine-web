/**
 * 責務: 素材のロード中の表示と、ミュート設定の反映、ロード完了後のタイトルへの切り替え。
 */
/* ozengine sample */
import { Assets, Engine, Scene } from 'oz';
import { loadVirtualPadImages } from '../ui/virtualPadView.js';
import { TitleScene } from './TitleScene.js';
import { openMute } from './mute.js';
import { drawMuteLabel, drawText } from './uiText.js';

/**
 * @typedef {{ width: number, height: number }} Screen 解像度
 */

/** ロードする素材の一覧（パスは index.html からの相対） */
const ASSET_LIST = {
  images: { sample: './assets/images/sample.png' },
  sounds: {
    se: './assets/sounds/sample_se.mp3',
    bgm: './assets/sounds/sample_bgm.mp3',
  },
};
/** 「ロード中」の表示文字 */
const LOADING_TEXT = 'ロード中';
/** 「ロード中」のフォント */
const LOADING_FONT = '32px sans-serif';
/** 文字を描くレイヤー名 */
const UI_LAYER = 'ui';

/** 最初のシーン。素材をロードしてタイトルへ切り替える */
export class LoadScene extends Scene {
  /**
   * @param {Screen} screen 解像度
   */
  constructor(screen) {
    super();
    /** @type {Screen} 解像度 */
    this.screen = screen;
  }

  /**
   * ミュート設定を反映し、素材をロードして、終わったらタイトルへ切り替える。
   * @returns {void}
   */
  init() {
    openMute();
    Promise.all([Assets.load(ASSET_LIST), loadVirtualPadImages()]).then(() => Engine.changeScene(new TitleScene(this.screen)));
  }

  /**
   * ui レイヤーに「ロード中」とミュートの表示を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @returns {void}
   */
  draw(ctx, layer) {
    if (layer !== UI_LAYER) return;
    drawText(ctx, LOADING_TEXT, this.screen.width / 2, this.screen.height / 2, LOADING_FONT);
    drawMuteLabel(ctx, this.screen);
  }
}
