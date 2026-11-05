/**
 * @fileoverview 責務: FPS の計算と左上への表示だけを担う。
 * 時間は引数でのみ受け取り、ゲーム状態は参照しない。
 */

/**
 * FPS を計算して描画するデバッグ表示。
 */
export class DebugOverlay {
  /**
   * 集計を初期化する。引数はない。
   */
  constructor() {
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
   * 左上に FPS を描く。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先。
   * @returns {void}
   */
  draw(ctx) {
    ctx.save();
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
