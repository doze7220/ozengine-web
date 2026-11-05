/**
 * 責務: 背景のグラデーションと、視差のある星空の生成と描画。
 * ゲーム進行に影響する処理は持たない。
 */
/* ozengine sample */

/** 星の数 */
const STAR_COUNT = 250;
/** 星の半径の最小 */
const SIZE_MIN = 0.5;
/** 星の半径の幅（最小に加える乱数の範囲） */
const SIZE_RANGE = 1.5;
/** 星の追従の割合の最小 */
const DEPTH_MIN = 0.2;
/** 星の追従の割合の幅（最小に加える乱数の範囲） */
const DEPTH_RANGE = 0.8;
/** 背景グラデーションの開始色（0） */
const BG_COLOR_START = '#02050a';
/** 背景グラデーションの終了色（1） */
const BG_COLOR_END = '#0a1128';

/**
 * @typedef {Object} Screen
 * @property {number} width 画面の幅
 * @property {number} height 画面の高さ
 */

/**
 * @typedef {Object} Camera
 * @property {number} x ワールド座標に足すと画面の座標になる値（x）
 * @property {number} y ワールド座標に足すと画面の座標になる値（y）
 */

/**
 * @typedef {Object} Star
 * @property {number} x 配置のx（0〜width）
 * @property {number} y 配置のy（0〜height）
 * @property {number} size 半径
 * @property {number} opacity 不透明度（0〜1）
 * @property {number} depth カメラの動きに対する追従の割合（遠いほど小さい）
 */

/** 背景と星空を描く。 */
export class Stars {
  /**
   * 星をランダムに配置する。
   * @param {Screen} screen 画面の大きさ
   */
  constructor(screen) {
    /** @type {Screen} */
    this.screen = screen;
    /** @type {Star[]} */
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * screen.width,
        y: Math.random() * screen.height,
        size: Math.random() * SIZE_RANGE + SIZE_MIN,
        opacity: Math.random(),
        depth: Math.random() * DEPTH_RANGE + DEPTH_MIN,
      });
    }
  }

  /**
   * 背景を塗ってから星を描く。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {Camera} camera カメラ
   * @returns {void}
   */
  draw(ctx, camera) {
    const { width, height } = this.screen;
    ctx.save();

    // CSS の linear-gradient(135deg, ...) と同じ見え方にする
    const r = (width + height) / 4;
    const grad = ctx.createLinearGradient(width / 2 - r, height / 2 - r, width / 2 + r, height / 2 + r);
    grad.addColorStop(0, BG_COLOR_START);
    grad.addColorStop(1, BG_COLOR_END);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    for (const star of this.stars) {
      ctx.globalAlpha = star.opacity;

      let sx = (star.x + camera.x * star.depth) % width;
      let sy = (star.y + camera.y * star.depth) % height;
      if (sx < 0) sx += width;
      if (sy < 0) sy += height;

      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
