/**
 * 責務: プレイ画面のキー操作（旋回、ブースト、スロー、ポーズ）と状態表示。
 */
/* ozengine sample */
import { Engine, Sound } from 'oz';
import { FlightScene } from './FlightScene.js';
import { PauseScene } from './PauseScene.js';
import { drawSlowLabel } from './uiText.js';

/** 1ティックあたりの目標の角度の変化（ラジアン）。tickRate 60 前提 */
const TURN_PER_TICK = 0.06;
/** スロー時の timeScale */
const SLOW_TIME_SCALE = 0.25;
/** 等速の timeScale */
const NORMAL_TIME_SCALE = 1;
/** 左に旋回するキー */
const LEFT_KEY = 'ArrowLeft';
/** 右に旋回するキー */
const RIGHT_KEY = 'ArrowRight';
/** ブーストのキー */
const BOOST_KEY = 'Space';
/** スローを切り替えるキー */
const SLOW_KEY = 'KeyS';
/** ポーズのキー */
const PAUSE_KEY = 'KeyP';
/** ブースト時の SE の名前 */
const BOOST_SE = 'se';
/** 状態表示を描くレイヤー名 */
const UI_LAYER = 'ui';

/** プレイ用のシーン。キーで機体を操作する */
export class PlayScene extends FlightScene {
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
   * ブースト、スロー、ポーズのキーを受ける。
   * @param {string} code 押されたキーのコード
   * @returns {void}
   */
  onKeyDown(code) {
    super.onKeyDown(code);
    if (code === BOOST_KEY) {
      if (this.boost()) Sound.playSe(BOOST_SE);
    } else if (code === SLOW_KEY) {
      Engine.timeScale = Engine.timeScale === NORMAL_TIME_SCALE ? SLOW_TIME_SCALE : NORMAL_TIME_SCALE;
    } else if (code === PAUSE_KEY) {
      Engine.pushScene(new PauseScene(this.screen));
    }
  }

  /**
   * 共通の描画のあと、スロー中なら ui レイヤーに「スロー」を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @param {{ realDelta: number, gameTime: number, timeScale: number }} time エンジンの時間（読み取り専用。変更しない）
   * @returns {void}
   */
  draw(ctx, layer, time) {
    super.draw(ctx, layer, time);
    if (layer === UI_LAYER && time.timeScale !== NORMAL_TIME_SCALE) drawSlowLabel(ctx, this.screen);
  }
}
