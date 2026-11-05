/**
 * @fileoverview 責務: Canvas の論理解像度の設定、縦横比を保った表示サイズの調整、画面座標から論理座標への変換を担う。
 * 描画と入力の配信は行わない。
 */

/**
 * 論理解像度を設定し、表示サイズをウィンドウに合わせ、画面座標を論理座標へ変換する。
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
   * Pointer Events の clientX / clientY を論理座標へ変換する。呼ぶたびに矩形を取り、範囲外の値は丸めない。
   * @param {number} clientX ビューポート基準の X 座標。
   * @param {number} clientY ビューポート基準の Y 座標。
   * @returns {{x: number, y: number}} 論理座標。
   */
  toLogical(clientX, clientY) {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * this._width) / rect.width,
      y: ((clientY - rect.top) * this._height) / rect.height,
    };
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
