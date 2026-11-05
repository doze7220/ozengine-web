/**
 * 責務: 機体の見た目（白い多角形と2つの円）を描画する手書きのスプライト。
 * 位置や動きは持たない。外部に依存しない。
 */

/** スプライトJSの形式の版 */
export const format = 1;

/**
 * 機体を原点 (0, 0)、前方 +X で描く。ctx の状態は元に戻す。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {number} [t=0] 予約引数（未使用）
 * @param {object} [opts={}] 予約引数（未使用）
 * @returns {void}
 */
export function draw(ctx, t = 0, opts = {}) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-23, 18);
  ctx.lineTo(-13, 0);
  ctx.lineTo(-23, -18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-18, -12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-18, 12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
