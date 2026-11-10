/**
 * @fileoverview 責務: レイヤー順の走査、画面の消去と論理座標への拡大の設定、呼び出しごとの save / restore だけを担う。
 * レイヤー名の固定値やゲーム固有の描画は持たない。
 */

/**
 * 利用側から渡されたレイヤー名の順に、奥から手前へシーンの描画を呼び出す。
 */
export class Layers {
  /**
   * @param {string[]} names レイヤー名（奥から手前の順）。配列はコピーして保持する。
   * @param {number} width 論理解像度の幅（起動設定の width）。
   * @param {number} height 論理解像度の高さ（起動設定の height）。
   */
  constructor(names, width, height) {
    /** @private */
    this._names = [...names];
    /** @private 論理解像度の幅 */
    this._width = width;
    /** @private 論理解像度の高さ */
    this._height = height;
  }

  /**
   * 画面全体（画素数）を透明に消去し、論理座標への拡大の変換を設定してから、
   * レイヤーごとに下のシーンから順に draw を呼ぶ。全体を save / restore で閉じるため、
   * 拡大の変換は render の外へ残らない。
   * @param {CanvasRenderingContext2D} ctx 描画先。
   * @param {{forEachFromBottom: function(function(object): void): void}} scenes シーンスタック。
   * @param {object} time draw に渡す読み取り専用の時間情報。
   * @returns {void}
   */
  render(ctx, scenes, time) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(ctx.canvas.width / this._width, 0, 0, ctx.canvas.height / this._height, 0, 0);
    for (const layer of this._names) {
      scenes.forEachFromBottom((scene) => {
        ctx.save();
        scene.draw(ctx, layer, time);
        ctx.restore();
      });
    }
    ctx.restore();
  }
}
