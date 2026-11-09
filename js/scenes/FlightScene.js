/**
 * 責務: タイトルとプレイに共通の、機体・星・トレイル・風の保持と更新と描画、カメラ、ミュートキー。
 */
/* ozengine sample */
import { Scene } from 'oz';
import shipSprite from 'assets/sprites/ship.js';
import { Ship } from '../entities/Ship.js';
import { Stars } from '../effect/Stars.js';
import { Trail } from '../effect/Trail.js';
import { Wind } from '../effect/Wind.js';
import { toggleMute } from './mute.js';
import { drawMuteLabel } from './uiText.js';

/**
 * @typedef {{ width: number, height: number }} Screen 解像度
 */
/**
 * @typedef {{ x: number, y: number }} Camera ワールド座標に足すと画面の座標になる値
 */

/** ミュートを切り替えるキー */
const MUTE_KEY = 'KeyM';

/** タイトルとプレイの共通の基底クラス */
export class FlightScene extends Scene {
  /**
   * @param {Screen} screen 解像度
   */
  constructor(screen) {
    super();
    /** @type {Screen} 解像度 */
    this.screen = screen;
    /** @type {Ship} 機体 */
    this.ship = new Ship();
    /** @type {Stars} 星と背景 */
    this.stars = new Stars(screen);
    /** @type {Trail} トレイル */
    this.trail = new Trail();
    /** @type {Wind} 風 */
    this.wind = new Wind(screen);
  }

  /**
   * 機体の旋回を指示する。
   * @param {number} delta 目標の角度の変化（ラジアン）
   * @returns {void}
   */
  turn(delta) {
    this.ship.turn(delta);
  }

  /**
   * 機体のブーストを指示する。成功したら風を発生させる。
   * @returns {boolean} ブーストが成功したら true
   */
  boost() {
    if (!this.ship.boost()) return false;
    this.wind.spawn(this.ship);
    return true;
  }

  /**
   * 機体が画面の中央に来るカメラを新しく作って返す（状態は持たない）。
   * @returns {Camera} カメラ
   */
  camera() {
    return {
      x: this.screen.width / 2 - this.ship.x,
      y: this.screen.height / 2 - this.ship.y,
    };
  }

  /**
   * 機体、トレイル、風を1ティック進める。dt は使わない（値が1ティック固定のため）。
   * @param {number} dt 経過時間（ミリ秒。未使用）
   * @returns {void}
   */
  update(dt) {
    this.ship.update();
    this.trail.update(this.ship);
    this.wind.update();
  }

  /**
   * ミュートキーでミュートを切り替える。
   * @param {string} code 押されたキーのコード
   * @returns {void}
   */
  onKeyDown(code) {
    if (code === MUTE_KEY) toggleMute();
  }

  /**
   * レイヤーごとに描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @param {{ realDelta: number, gameTime: number, timeScale: number }} time エンジンの時間（読み取り専用。変更しない）
   * @returns {void}
   */
  draw(ctx, layer, time) {
    switch (layer) {
      case 'stars':
        this.stars.draw(ctx, this.camera());
        break;
      case 'trail':
        this.trail.draw(ctx, this.camera());
        break;
      case 'ship':
        this.drawShip(ctx, this.camera());
        break;
      case 'wind':
        this.wind.draw(ctx, this.camera());
        break;
      case 'ui':
        drawMuteLabel(ctx, this.screen);
        break;
    }
  }

  /**
   * 機体のスプライトを位置と向きを設定して描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {Camera} camera カメラ
   * @returns {void}
   */
  drawShip(ctx, camera) {
    ctx.save();
    ctx.translate(camera.x + this.ship.x, camera.y + this.ship.y);
    ctx.rotate(this.ship.angle);
    shipSprite.draw(ctx);
    ctx.restore();
  }
}
