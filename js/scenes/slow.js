/**
 * 責務: 土台の速度の切り替え（timeScale の等速とスローの切り替え、等速に戻すこと）と、今の速度を表す文字。
 */
/* ozengine sample */
import { Engine } from 'oz';
import { timeScaleText } from './devPanel.js';

/** スロー時の timeScale */
const SLOW_TIME_SCALE = 0.25;
/** 等速の timeScale */
const NORMAL_TIME_SCALE = 1;
/** 速度の文字の前に付ける文字 */
const SPEED_LABEL = '速度';

/**
 * 等速かどうかを返す（読み取りのみ。draw から呼んでよい）。
 * @returns {boolean} timeScale が等速なら true
 */
export function isNormalSpeed() {
  return Engine.timeScale === NORMAL_TIME_SCALE;
}

/**
 * 等速とスローを切り替える。
 * @returns {void}
 */
export function toggleSlow() {
  Engine.timeScale = isNormalSpeed() ? SLOW_TIME_SCALE : NORMAL_TIME_SCALE;
}

/**
 * 等速に戻す。
 * @returns {void}
 */
export function resetSlow() {
  Engine.timeScale = NORMAL_TIME_SCALE;
}

/**
 * 今の速度を表す文字を返す（読み取りのみ。draw から呼んでよい）。
 * @returns {string} 例: 速度 ×0.25
 */
export function speedText() {
  return `${SPEED_LABEL} ${timeScaleText(Engine.timeScale)}`;
}
