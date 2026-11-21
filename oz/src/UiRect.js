/**
 * 責務: 論理座標の矩形の計算（点を含むか、2つの矩形の重なり）。
 * 部品の知識は持たず、何も import しない。
 */

/**
 * 論理座標の矩形。
 * @typedef {Object} UiRectangle
 * @property {number} x 左端
 * @property {number} y 上端
 * @property {number} width 幅
 * @property {number} height 高さ
 */

/**
 * 点が矩形に含まれるか（左端・上端を含み、右端・下端を含まない。幅か高さが 0 なら常に偽）。
 * @param {UiRectangle} rect 矩形
 * @param {number} x 点の x
 * @param {number} y 点の y
 * @returns {boolean} 含まれるなら true
 */
export function containsPoint(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

/**
 * 2つの矩形の重なりの矩形を返す（重ならなければ幅・高さ 0）。
 * @param {UiRectangle} a 矩形
 * @param {UiRectangle} b 矩形
 * @returns {UiRectangle} 重なりの矩形
 */
export function intersectRect(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) {
    return { x: left, y: top, width: 0, height: 0 };
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}
