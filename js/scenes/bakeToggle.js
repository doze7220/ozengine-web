/**
 * 責務: 見比べ用の一時的な切り替え（機体を焼き付けで描くか、直接描くか）の状態。テストプレイの後に消す。
 */
/* ozengine sample */

/** 機体を焼き付けで描くなら true（既定）。ページを開いている間だけ持ち、保存しない */
let baked = true;

/**
 * 焼き付けで描くかを返す（読み取りのみ。draw から呼んでよい）。
 * @returns {boolean} 焼き付けで描くなら true
 */
export function isBaked() {
  return baked;
}

/**
 * 焼き付けで描くか直接描くかを切り替える（入力の処理から呼ぶ）。
 * @returns {void}
 */
export function toggleBaked() {
  baked = !baked;
}
