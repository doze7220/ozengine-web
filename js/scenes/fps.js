/**
 * 責務: 土台の FPS の表示の切り替え（OFF → 左上 → 右上 → 右下 → 左下 → OFF の順）と、今の状態を表す項目の文字。
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

/**
 * 今の FPS の表示の状態を表す文字を返す（読み取りのみ。draw から呼んでよい）。
 * @returns {string} 表示していなければ 'FPS: OFF'、表示していれば 'FPS: ' と位置の文字
 */
export function fpsLabel() {
  if (!Engine.fpsVisible) return 'FPS: OFF';
  return `FPS: ${POSITION_LABELS[Engine.fpsPosition]}`;
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
