/**
 * 責務: 土台の FPS の表示の切り替え（OFF → 左上 → 右上 → 右下 → 左下 → OFF の順）、表示の位置の選択肢と、
 * 今の状態を表す文字。
 */
/* ozengine sample */
import { Engine } from 'oz';

/** 表示している間の位置の切り替えの順（OFF の次は先頭、最後の次は OFF） */
const CYCLE = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
/** 位置ごとの項目の文字 */
const POSITION_LABELS = {
  'top-left': '左上',
  'top-right': '右上',
  'bottom-right': '右下',
  'bottom-left': '左下',
};
/** FPS を表示しない状態の文字 */
const OFF_LABEL = 'OFF';

/**
 * FPS の表示の位置の選択肢（左上・右上・右下・左下。選択肢の列の choices に渡す）。
 * @type {ReadonlyArray<{ label: string, value: string }>}
 */
export const FPS_POSITION_CHOICES = Object.freeze(
  CYCLE.map((position) => Object.freeze({ label: POSITION_LABELS[position], value: position })),
);

/**
 * 今の FPS の表示の位置の文字を返す（読み取りのみ。draw から呼んでよい。表示を消している間も位置を返す）。
 * @returns {string} 位置の文字（'左上' など）
 */
export function fpsPositionText() {
  return POSITION_LABELS[Engine.fpsPosition];
}

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
