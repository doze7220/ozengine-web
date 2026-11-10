/**
 * 責務: プレイ画面のキー操作（旋回、ブースト、スロー、メニュー）、バーチャルパッドとメニューを開くボタンの登録、状態表示。
 */
/* ozengine sample */
import { Engine, Sound } from 'oz';
import { VIRTUAL_PAD_LAYOUT } from '../ui/virtualPadConfig.js';
import { drawVirtualPad } from '../ui/virtualPadView.js';
import { FlightScene } from './FlightScene.js';
import { drawMenuButton } from './MenuScene.js';
import { openPlayMenu } from './playMenu.js';
import { isSlow, toggleSlow } from './slow.js';
import { drawSlowLabel } from './uiText.js';

/** 1ティックあたりの目標の角度の変化（ラジアン）。tickRate 60 前提 */
const TURN_PER_TICK = 0.06;
/** 左に旋回するキー */
const LEFT_KEY = 'ArrowLeft';
/** 右に旋回するキー */
const RIGHT_KEY = 'ArrowRight';
/** ブーストのキー */
const BOOST_KEY = 'Space';
/** スローを切り替えるキー */
const SLOW_KEY = 'KeyS';
/** メニューを開くキー */
const MENU_KEY = 'KeyP';
/** ブースト時の SE の名前 */
const BOOST_SE = 'se';
/** 状態表示を描くレイヤー名 */
const UI_LAYER = 'ui';
/** メニューを開く画面のボタンの矩形（論理座標。上の中央） */
const MENU_BUTTON = { x: 560, y: 20, width: 160, height: 60 };
/** メニューを開く画面のボタンの表示文字 */
const MENU_BUTTON_TEXT = 'メニュー';

/** プレイ用のシーン。キーとバーチャルパッドで機体を操作する */
export class PlayScene extends FlightScene {
  /**
   * @param {{ width: number, height: number }} screen 解像度
   * @param {() => void} backToTitle タイトルへ切り替える処理（引数なし）。メニューの「タイトルに戻る」で呼ばれる
   */
  constructor(screen, backToTitle) {
    super(screen);
    /** @type {() => void} タイトルへ切り替える処理 */
    this.backToTitle = backToTitle;
  }

  /**
   * バーチャルパッドとメニューを開く画面のボタンを登録する。
   * @returns {void}
   */
  init() {
    Engine.addVirtualPad(this, VIRTUAL_PAD_LAYOUT);
    Engine.addButton(this, { ...MENU_BUTTON, onPress: () => openPlayMenu(this.screen, this.backToTitle) });
  }

  /**
   * 左右キーで旋回を指示してから、機体などを1ティック進める。
   * @param {number} dt 経過時間（ミリ秒。FlightScene.update では未使用）
   * @returns {void}
   */
  update(dt) {
    if (Engine.isKeyDown(LEFT_KEY)) this.turn(-TURN_PER_TICK);
    if (Engine.isKeyDown(RIGHT_KEY)) this.turn(TURN_PER_TICK);
    super.update(dt);
  }

  /**
   * ブースト、スロー、メニューのキーを受ける。
   * @param {string} code 押されたキーのコード
   * @returns {void}
   */
  onKeyDown(code) {
    super.onKeyDown(code);
    if (code === BOOST_KEY) {
      if (this.boost()) Sound.playSe(BOOST_SE);
    } else if (code === SLOW_KEY) {
      toggleSlow();
    } else if (code === MENU_KEY) {
      openPlayMenu(this.screen, this.backToTitle);
    }
  }

  /**
   * 共通の描画のあと、ui レイヤーに状態表示（スロー）、メニューを開くボタン、バーチャルパッドを描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @param {{ realDelta: number, gameTime: number, timeScale: number }} time エンジンの時間（読み取り専用。変更しない）
   * @returns {void}
   */
  draw(ctx, layer, time) {
    super.draw(ctx, layer, time);
    if (layer !== UI_LAYER) return;
    if (isSlow()) drawSlowLabel(ctx, this.screen);
    drawMenuButton(ctx, MENU_BUTTON, MENU_BUTTON_TEXT);
    drawVirtualPad(ctx, this);
  }
}
