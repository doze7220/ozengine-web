/**
 * @fileoverview 責務: Canvas の論理解像度の設定と、縦横比を保った表示サイズの調整を担う。
 * 描画と入力の配信は行わない（座標変換は現時点では未実装）。
 */

/**
 * 論理解像度を設定し、表示サイズをウィンドウに合わせる。
 */
export class Screen {
  /**
   * @param {HTMLCanvasElement} canvas 利用側から渡された canvas。
   * @param {number} width 論理解像度の幅（正の有限数）。
   * @param {number} height 論理解像度の高さ（正の有限数）。
   */
  constructor(canvas, width, height) {
    /** @private */
    this._canvas = canvas;
    /** @private */
    this._width = width;
    /** @private */
    this._height = height;

    // 代入すると ctx の状態が初期化されるため、起動時の1回だけ設定する。
    canvas.width = width;
    canvas.height = height;

    this._fit();
    window.addEventListener('resize', () => this._fit());
  }

  /**
   * 縦横比を保ち、ウィンドウに収まる最大の表示サイズを canvas の style に設定する。
   * @private
   * @returns {void}
   */
  _fit() {
    const scale = Math.min(window.innerWidth / this._width, window.innerHeight / this._height);
    this._canvas.style.width = `${Math.floor(this._width * scale)}px`;
    this._canvas.style.height = `${Math.floor(this._height * scale)}px`;
  }
}
