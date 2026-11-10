/**
 * @fileoverview 責務: 論理解像度の保持、縦横比を保った表示サイズの調整、表示サイズと画素密度（devicePixelRatio、上限 2）に合わせた
 * Canvas の画素数の調整、画面座標から論理座標への変換を担う。ctx の操作、描画、入力の配信は行わない。
 */

/**
 * 画素密度（devicePixelRatio）の上限。画素数が増えすぎて重くならないようにするエンジンの仕様。
 * @type {number}
 */
const MAX_PIXEL_RATIO = 2;

/**
 * 論理解像度を保持し、表示サイズと Canvas の画素数をウィンドウと画素密度に合わせ、画面座標を論理座標へ変換する。
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
   * 縦横比を保ち、ウィンドウに収まる最大の表示サイズを canvas の style に設定し、
   * その CSS 画素数 × 画素密度（上限 MAX_PIXEL_RATIO、使えない値なら 1）を canvas の画素数にする。
   * 画素数の代入は ctx の状態を初期化するため、値が違うときだけ行う。
   * @private
   * @returns {void}
   */
  _fit() {
    const scale = Math.min(window.innerWidth / this._width, window.innerHeight / this._height);
    const cssWidth = Math.floor(this._width * scale);
    const cssHeight = Math.floor(this._height * scale);
    this._canvas.style.width = `${cssWidth}px`;
    this._canvas.style.height = `${cssHeight}px`;

    const dpr = window.devicePixelRatio;
    const ratio = Number.isFinite(dpr) && dpr > 0 ? Math.min(dpr, MAX_PIXEL_RATIO) : 1;
    const pixelWidth = Math.max(1, Math.round(cssWidth * ratio));
    const pixelHeight = Math.max(1, Math.round(cssHeight * ratio));
    if (this._canvas.width !== pixelWidth) this._canvas.width = pixelWidth;
    if (this._canvas.height !== pixelHeight) this._canvas.height = pixelHeight;
  }
}
