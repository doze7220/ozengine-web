/**
 * @fileoverview 責務: FPS の計算と、論理座標での左上への表示（拡大の設定を含む）だけを担う。
 * 時間は引数でのみ受け取り、ゲーム状態は参照しない。
 */

/**
 * FPS を計算して描画するデバッグ表示。
 */
export class DebugOverlay {
  /**
   * 集計を初期化し、論理解像度を保持する。
   * @param {number} width 論理解像度の幅（起動設定の width）。
   * @param {number} height 論理解像度の高さ（起動設定の height）。
   */
  constructor(width, height) {
    /** @private 論理解像度の幅 */
    this._width = width;
    /** @private 論理解像度の高さ */
    this._height = height;
    /** @private 集計中のフレーム数 */
    this._frames = 0;
    /** @private 集計中の経過時間（ミリ秒） */
    this._elapsed = 0;
    /** @private 表示する文字列。最初の計算が終わるまでは '--' */
    this._text = '--';
  }

  /**
   * フレーム数と経過時間を足し、1000ミリ秒以上になったら表示値を更新する。
   * @param {number} realDelta 実時間のフレーム間隔（ミリ秒）。
   * @returns {void}
   */
  update(realDelta) {
    this._frames += 1;
    this._elapsed += realDelta;
    if (this._elapsed >= 1000) {
      this._text = String(Math.round((this._frames * 1000) / this._elapsed));
      this._frames = 0;
      this._elapsed = 0;
    }
  }

  /**
   * 自分の save / restore の中で論理座標への拡大を設定し、左上に FPS を描く。
   * 呼ぶ前の ctx の変換に依存しない。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先。
   * @returns {void}
   */
  draw(ctx) {
    ctx.save();
    ctx.setTransform(ctx.canvas.width / this._width, 0, 0, ctx.canvas.height / this._height, 0, 0);
    ctx.font = '16px monospace';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    const label = `FPS: ${this._text}`;
    ctx.strokeText(label, 8, 8);
    ctx.fillText(label, 8, 8);
    ctx.restore();
  }
}
