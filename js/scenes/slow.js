/**
 * 責務: 土台のスロー（timeScale の等速とスローの切り替えと、入り切りの指定）。
 */
/* ozengine sample */
import { Engine } from 'oz';

/** スロー時の timeScale */
const SLOW_TIME_SCALE = 0.25;
/** 等速の timeScale */
const NORMAL_TIME_SCALE = 1;

/**
 * スロー中かどうかを返す（読み取りのみ。draw から呼んでよい）。
 * @returns {boolean} timeScale が等速でなければ true
 */
export function isSlow() {
  return Engine.timeScale !== NORMAL_TIME_SCALE;
}

/**
 * 等速とスローを切り替える。
 * @returns {void}
 */
export function toggleSlow() {
  Engine.timeScale = isSlow() ? NORMAL_TIME_SCALE : SLOW_TIME_SCALE;
}

/**
 * スローの入り切りを指定して設定する（チェックボックスの write 用）。
 * @param {boolean} on 真ならスロー、偽なら等速
 * @returns {void}
 */
export function setSlow(on) {
  Engine.timeScale = on ? SLOW_TIME_SCALE : NORMAL_TIME_SCALE;
}

/**
 * 等速に戻す。
 * @returns {void}
 */
export function resetSlow() {
  Engine.timeScale = NORMAL_TIME_SCALE;
}
