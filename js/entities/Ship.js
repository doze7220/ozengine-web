/**
 * 責務: 機体の位置・向き・速さの保持と、1ティックごとの動きの更新。
 * 操作の違い（キー、自動操縦）は知らず、描画もしない。
 */
/* ozengine sample */

/*
 * 以下の定数は 1 ティックあたりの値であり、tickRate 60 を前提とする。
 */
/** 通常の速さ（1ティックあたりの移動量） */
const BASE_SPEED = 12;
/** 向きが目標の角度へ近づく割合（1ティックあたり） */
const TURN_RATE = 0.08;
/** ブースト直後の速さ */
const BOOST_SPEED = 40;
/** 速さがこの値未満のときだけブーストできる */
const BOOST_READY_BELOW = 15;
/** 速さが通常へ戻る割合（1ティックあたり） */
const SPEED_RECOVERY = 0.05;

/** 機体の状態と動き */
export class Ship {
  /** 初期状態（原点、角度 0、通常の速さ）で作る */
  constructor() {
    /** @type {number} ワールドのx座標 */
    this.x = 0;
    /** @type {number} ワールドのy座標 */
    this.y = 0;
    /** @type {number} 現在の向き（ラジアン） */
    this.angle = 0;
    /** @type {number} 目標の向き（ラジアン） */
    this.targetAngle = 0;
    /** @type {number} 現在の速さ */
    this.speed = BASE_SPEED;
  }

  /**
   * 目標の角度を変える。
   * @param {number} delta 目標の角度に足す値（ラジアン）
   * @returns {void}
   */
  turn(delta) {
    this.targetAngle += delta;
  }

  /**
   * 速さが十分に戻っているときだけブーストする。
   * @returns {boolean} ブーストしたら true、不発なら false
   */
  boost() {
    if (this.speed < BOOST_READY_BELOW) {
      this.speed = BOOST_SPEED;
      return true;
    }
    return false;
  }

  /**
   * 1ティック進める。
   * @returns {void}
   */
  update() {
    let diff = this.targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * TURN_RATE;
    this.speed += (BASE_SPEED - this.speed) * SPEED_RECOVERY;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }
}
