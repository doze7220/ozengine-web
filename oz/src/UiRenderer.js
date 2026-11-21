/**
 * 責務: 窓を描く手順（種類の順、部品の窓の内側での切り取り、描く関数の選択と save / restore で囲んだ呼び出し）。
 * 状態の変更・当たり判定・標準の見た目の中身は持たず、UiStandardLook だけを import する。
 */

import { STANDARD_LOOK } from './UiStandardLook.js';

/**
 * 1つの描く関数を ctx.save() / ctx.restore() で囲んで呼ぶ。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {function(CanvasRenderingContext2D, Object): void} fn 描く関数
 * @param {Object} info 描く関数に渡す情報
 * @returns {void}
 */
function callGuarded(ctx, fn, info) {
  ctx.save();
  try {
    fn(ctx, info);
  } finally {
    ctx.restore();
  }
}

/**
 * 窓を描く。暗幕、窓、タイトルバー、閉じるボタン、部品（足した順。窓の内側で切り取る）の順に呼ぶ。
 * 描く関数が投げた例外は包み直さずに伝える。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {import('./UiWindow.js').UiWindowView} view UiWindow.view() の戻り値
 * @param {Object<string, function(CanvasRenderingContext2D, Object): void>} look 差し替える描く関数（種類の名前 → 関数。無い種類は標準の見た目）
 * @returns {void}
 */
export function drawUiWindow(ctx, view, look) {
  /**
   * 種類に対応する描く関数を選ぶ。
   * @param {string} kind 種類の名前
   * @returns {function(CanvasRenderingContext2D, Object): void} 描く関数
   */
  const pick = (kind) => look[kind] ?? STANDARD_LOOK[kind];

  callGuarded(ctx, pick('backdrop'), view.backdrop);
  callGuarded(ctx, pick('window'), view.window);
  callGuarded(ctx, pick('titleBar'), view.titleBar);
  callGuarded(ctx, pick('closeButton'), view.closeButton);

  ctx.save();
  try {
    const c = view.content;
    ctx.beginPath();
    ctx.rect(c.x, c.y, c.width, c.height);
    ctx.clip();
    for (const part of view.parts) {
      callGuarded(ctx, pick(part.kind), part.info);
    }
  } finally {
    ctx.restore();
  }
}
