/**
 * 責務: 土台の FPS の表示の切り替え（OFF → 左上 → 右上 → 右下 → 左下 → OFF の順）、今の状態を表す項目の文字、
 * 選択肢の値での読み書き。
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
/** FPS を表示しない選択肢の値 */
const OFF_VALUE = 'off';
/** FPS を表示しない選択肢の文字 */
const OFF_LABEL = 'OFF';

/**
 * FPS の表示の選択肢（OFF と位置4つ。選択肢の列の choices に渡す）。
 * @type {ReadonlyArray<{ label: string, value: string }>}
 */
export const FPS_CHOICES = Object.freeze([
  Object.freeze({ label: OFF_LABEL, value: OFF_VALUE }),
  ...CYCLE.map((position) => Object.freeze({ label: POSITION_LABELS[position], value: position })),
]);

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

/**
 * 今の FPS の表示の状態を選択肢の値で返す（読み取りのみ。draw から呼んでよい）。
 * @returns {string} 表示していなければ 'off'、表示していれば Engine.fpsPosition
 */
export function readFpsChoice() {
  return Engine.fpsVisible ? Engine.fpsPosition : OFF_VALUE;
}

/**
 * 選択肢の値で FPS の表示を設定する。
 * @param {string} value 'off'（表示を消す。位置は変えない）か、位置（'top-left' など）
 * @returns {void}
 */
export function writeFpsChoice(value) {
  if (value === OFF_VALUE) {
    Engine.fpsVisible = false;
    return;
  }
  Engine.fpsPosition = value;
  Engine.fpsVisible = true;
}
