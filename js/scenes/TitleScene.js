/**
 * 責務: タイトル画面（自動操縦のデモ、ゲーム名・画像・ボタンの表示）と、BGM の開始、プレイへの遷移。
 */
/* ozengine sample */
import { Assets, Engine, Sound } from 'oz';
import { steerByAutopilot } from '../entities/autopilot.js';
import { FlightScene } from './FlightScene.js';
import { PlayScene } from './PlayScene.js';
import { drawText } from './uiText.js';

/** BGM のフェードインの長さ（ミリ秒） */
const BGM_FADE_MS = 1000;
/** BGM の素材名 */
const BGM_NAME = 'bgm';
/** 画像の素材名 */
const IMAGE_NAME = 'sample';
/** 文字を描くレイヤー名 */
const UI_LAYER = 'ui';

/** ゲーム名の表示文字 */
const TITLE_TEXT = 'Vernier Trail';
/** ゲーム名のフォント */
const TITLE_FONT = '64px sans-serif';
/** ゲーム名の y 座標（px） */
const TITLE_Y = 70;

/** 画像の上端の y 座標（px） */
const IMAGE_Y = 120;
/** 画像を描く高さ（px。幅は縦横比から求める） */
const IMAGE_HEIGHT = 160;

/** ボタンの幅（px） */
const BUTTON_WIDTH = 240;
/** ボタンの高さ（px） */
const BUTTON_HEIGHT = 72;
/** ボタンの上端の y 座標（px） */
const BUTTON_Y = 540;
/** ボタンの塗りの色 */
const BUTTON_FILL_COLOR = 'rgba(255, 255, 255, 0.15)';
/** ボタンの枠の色 */
const BUTTON_STROKE_COLOR = '#ffffff';
/** ボタンの枠の太さ（px） */
const BUTTON_STROKE_WIDTH = 2;
/** ボタンの表示文字 */
const BUTTON_TEXT = 'スタート';
/** ボタンの文字のフォント */
const BUTTON_FONT = '32px sans-serif';

/**
 * @typedef {{ width: number, height: number }} Screen 解像度
 */
/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Rect 矩形
 */

/** タイトルのシーン。背景で自動操縦のデモを流す */
export class TitleScene extends FlightScene {
  /**
   * @param {Screen} screen 解像度
   */
  constructor(screen) {
    super(screen);
    /** @type {Rect} スタートボタンの矩形 */
    this.button = {
      x: (screen.width - BUTTON_WIDTH) / 2,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
    };
  }

  /**
   * スタートボタンを登録する。
   * @returns {void}
   */
  init() {
    Engine.addButton(this, { ...this.button, onPress: () => this.startPlay() });
  }

  /**
   * BGM を流し始める（同じ曲なら何も起きない）。
   * @returns {void}
   */
  playBgm() {
    Sound.playBgm(BGM_NAME, { fadeMs: BGM_FADE_MS });
  }

  /**
   * BGM を流してプレイへ切り替える。
   * @returns {void}
   */
  startPlay() {
    this.playBgm();
    Engine.changeScene(new PlayScene(this.screen, () => Engine.changeScene(new TitleScene(this.screen))));
  }

  /**
   * 画面を押したらプレイを始める。
   * @param {{ type: string, x: number, y: number }} pointer ポインタ入力
   * @returns {void}
   */
  onPointer(pointer) {
    if (pointer.type === 'down') this.startPlay();
  }

  /**
   * 何かキーを押したら BGM を流す（開始はしない）。続けてミュートキーを処理する。
   * @param {string} code 押されたキーのコード
   * @returns {void}
   */
  onKeyDown(code) {
    this.playBgm();
    super.onKeyDown(code);
  }

  /**
   * 自動操縦の指示を出してから、機体などを進める。
   * @param {number} dt 経過時間（ミリ秒。未使用）
   * @returns {void}
   */
  update(dt) {
    steerByAutopilot(this);
    super.update(dt);
  }

  /**
   * デモを描き、ui レイヤーにゲーム名・画像・ボタンを重ねる。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @param {{ realDelta: number, gameTime: number, timeScale: number }} time エンジンの時間（読み取り専用。変更しない）
   * @returns {void}
   */
  draw(ctx, layer, time) {
    super.draw(ctx, layer, time);
    if (layer !== UI_LAYER) return;
    const centerX = this.screen.width / 2;
    drawText(ctx, TITLE_TEXT, centerX, TITLE_Y, TITLE_FONT);
    this.drawImage(ctx, centerX);
    this.drawButton(ctx);
  }

  /**
   * 画像を縦横比を保って、横の中央に描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {number} centerX 横の中央の x 座標
   * @returns {void}
   */
  drawImage(ctx, centerX) {
    const image = Assets.image(IMAGE_NAME);
    const width = (image.width / image.height) * IMAGE_HEIGHT;
    ctx.drawImage(image, centerX - width / 2, IMAGE_Y, width, IMAGE_HEIGHT);
  }

  /**
   * スタートボタン（塗り、枠、文字）を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  drawButton(ctx) {
    const { x, y, width, height } = this.button;
    ctx.save();
    ctx.fillStyle = BUTTON_FILL_COLOR;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = BUTTON_STROKE_COLOR;
    ctx.lineWidth = BUTTON_STROKE_WIDTH;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
    drawText(ctx, BUTTON_TEXT, x + width / 2, y + height / 2, BUTTON_FONT);
  }
}
