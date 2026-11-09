/**
 * 責務: 機体の見た目（白い多角形と2つの円）を描画する手書きのスプライト。
 * 位置や動きは持たない。外部に依存しない。既定のexportだけを持つ（エディタの書き出し形式に合わせる）。
 */

/**
 * 機体を原点 (0, 0)、前方 +X で描く。ctx の現在の変換の上に描き、ctx の状態は元に戻す。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @returns {void}
 */
function draw(ctx) {
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

/**
 * スプライトの既定のexport。描画関数 draw(ctx) だけを持つ。
 * @type {{draw: function(CanvasRenderingContext2D): void}}
 */
export default { draw };
