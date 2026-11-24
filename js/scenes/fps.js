/**
 * 責務: 土台の FPS の表示の切り替え（OFF → 左上 → 右上 → 右下 → 左下 → OFF の順）と、今の状態を表す文字。
 * 位置の選択肢と文字は devPanel.js のものを使う。
 */
/* ozengine sample */
import { Engine } from 'oz';
import { FPS_POSITION_CHOICES, fpsPositionText } from './devPanel.js';

/** 表示している間の位置の切り替えの順（OFF の次は先頭、最後の次は OFF） */
const CYCLE = FPS_POSITION_CHOICES.map((choice) => choice.value);
/** FPS を表示しない状態の文字 */
const OFF_LABEL = 'OFF';

/**
 * 今の FPS の表示の状態を表す文字を返す（読み取りのみ。draw から呼んでよい）。
 * @returns {string} 表示を消していれば 'OFF'、出していれば位置の文字
 */
export function fpsStatusText() {
  return Engine.fpsVisible ? fpsPositionText() : OFF_LABEL;
}

/**
 * FPS の表示を次の状態に切り替える（OFF → 左上 → 右上 → 右下 → 左下 → OFF）。
 * @returns {void}
 */
export function cycleFps() {
  if (!Engine.fpsVisible) {
    Engine.fpsPosition = CYCLE[0];
    Engine.fpsVisible = true;
    return;
  }
  const index = CYCLE.indexOf(Engine.fpsPosition);
  if (index === CYCLE.length - 1) {
    Engine.fpsVisible = false;
  } else {
    Engine.fpsPosition = CYCLE[index + 1];
  }
}
