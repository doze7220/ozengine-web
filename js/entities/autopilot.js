/**
 * 責務: 機体の自動操縦（ランダムな旋回とブーストの指示）を行う。
 * 状態を持たない関数だけを提供する。
 */
/* ozengine sample */

/**
 * 操作の指示を受ける対象。
 * @typedef {object} ShipControls
 * @property {function(number): void} turn 目標の角度を変える
 * @property {function(): boolean} boost ブーストする（成否を返す）
 */

/* 以下の確率は 1 ティックあたりの値 */
/** 旋回の指示を出す確率 */
const TURN_CHANCE = 0.03;
/** 旋回の角度の幅（ラジアン） */
const TURN_RANGE = Math.PI * 1.5;
/** ブーストの指示を出す確率 */
const BOOST_CHANCE = 0.01;

/**
 * 1ティック分の自動操縦の指示を出す。
 * @param {ShipControls} controls 指示を受ける対象
 * @returns {void}
 */
export function steerByAutopilot(controls) {
  if (Math.random() < TURN_CHANCE) {
    controls.turn((Math.random() - 0.5) * TURN_RANGE);
  }
  if (Math.random() < BOOST_CHANCE) {
    controls.boost();
  }
}
