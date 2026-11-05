/**
 * @fileoverview 責務: レイヤー順の走査、画面の消去、呼び出しごとの save / restore だけを担う。
 * レイヤー名の固定値やゲーム固有の描画は持たない。
 */

/**
 * 利用側から渡されたレイヤー名の順に、奥から手前へシーンの描画を呼び出す。
 */
export class Layers {
  /**
   * @param {string[]} names レイヤー名（奥から手前の順）。配列はコピーして保持する。
   */
  constructor(names) {
    /** @private */
    this._names = [...names];
  }

  /**
   * 画面を透明に消去し、レイヤーごとに下のシーンから順に draw を呼ぶ。
   * @param {CanvasRenderingContext2D} ctx 描画先。
   * @param {{forEachFromBottom: function(function(object): void): void}} scenes シーンスタック。
   * @param {object} time draw に渡す読み取り専用の時間情報。
   * @returns {void}
   */
  render(ctx, scenes, time) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const layer of this._names) {
      scenes.forEachFromBottom((scene) => {
        ctx.save();
        scene.draw(ctx, layer, time);
        ctx.restore();
      });
    }
  }
}
