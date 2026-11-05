/**
 * @fileoverview 責務: シーンごとのボタン（矩形と押下時のコールバック）の登録と、論理座標での当たり判定を担う。
 * 描画、onPress の呼び出し、入力の受信は行わない。
 */

/**
 * @typedef {Object} ButtonDef
 * @property {number} x 左端の論理X座標。
 * @property {number} y 上端の論理Y座標。
 * @property {number} width 幅。
 * @property {number} height 高さ。
 * @property {() => void} onPress 押下時に呼ぶ関数。
 */

/**
 * シーンをキーにボタンを保持し、座標からボタンを探す。
 */
export class Buttons {
  /** @type {WeakMap<object, ButtonDef[]>} シーンごとのボタン（登録順） */
  #map = new WeakMap();

  /**
   * シーンのボタンの末尾に追加する。値はコピーして持つ。引数は検証しない。
   * @param {object} scene ボタンを結び付けるシーン。
   * @param {ButtonDef} button ボタンの設定。
   * @returns {void}
   */
  add(scene, { x, y, width, height, onPress }) {
    let list = this.#map.get(scene);
    if (!list) {
      list = [];
      this.#map.set(scene, list);
    }
    list.push({ x, y, width, height, onPress });
  }

  /**
   * シーンのボタンを後に登録したものから調べ、座標を含む最初のボタンを返す。
   * 左端・上端を含み、右端・下端を含まない。
   * @param {object} scene 調べるシーン。
   * @param {number} px 論理X座標。
   * @param {number} py 論理Y座標。
   * @returns {ButtonDef | null} 見つかったボタン。なければ null。
   */
  find(scene, px, py) {
    const list = this.#map.get(scene);
    if (!list) return null;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (b.x <= px && px < b.x + b.width && b.y <= py && py < b.y + b.height) return b;
    }
    return null;
  }
}
