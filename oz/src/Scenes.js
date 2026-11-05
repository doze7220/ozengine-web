/**
 * @fileoverview 責務: シーンスタックの管理（切り替え、積む、戻す）、最前面のシーンの参照、操作があったことの通知。
 * 遷移演出や時間管理には関与しない。
 */

/**
 * シーンスタックを管理するクラス。
 */
export class Scenes {
  /** @type {import('./Scene.js').Scene[]} 下から順のスタック */
  #stack = [];
  /** @type {boolean} シーン操作があったか */
  #changed = false;

  /**
   * 最前面のシーン。空なら null。
   * @returns {import('./Scene.js').Scene | null}
   */
  get top() {
    return this.#stack.length > 0 ? this.#stack[this.#stack.length - 1] : null;
  }

  /**
   * シーンをスタックに積み、init を呼ぶ。init の前に積み、変更フラグを立てる。
   * @param {import('./Scene.js').Scene} scene 積むシーン
   * @returns {void}
   */
  push(scene) {
    this.#stack.push(scene);
    this.#changed = true;
    scene.init();
  }

  /**
   * 最前面のシーンを外して destroy を呼ぶ。空なら何もしない（フラグも立てない）。
   * @returns {void}
   */
  pop() {
    if (this.#stack.length === 0) return;
    const scene = this.#stack.pop();
    this.#changed = true;
    scene.destroy();
  }

  /**
   * 最前面から順に全シーンを外して destroy を呼び、新しいシーンを積む。
   * @param {import('./Scene.js').Scene} scene 新しく積むシーン
   * @returns {void}
   */
  change(scene) {
    while (this.#stack.length > 0) {
      this.pop();
    }
    this.push(scene);
  }

  /**
   * 最前面のシーンの update を呼ぶ。空なら何もしない。
   * @param {number} dt ティック長（ミリ秒）
   * @returns {void}
   */
  update(dt) {
    const top = this.#stack[this.#stack.length - 1];
    if (top) top.update(dt);
  }

  /**
   * スタックの下から順にコールバックを呼ぶ。空なら何もしない。
   * @param {(scene: import('./Scene.js').Scene) => void} callback 各シーンに対して呼ぶ関数
   * @returns {void}
   */
  forEachFromBottom(callback) {
    for (const scene of this.#stack.slice()) {
      callback(scene);
    }
  }

  /**
   * 変更フラグを返し、false に戻す。
   * @returns {boolean} 前回の呼び出し以降にシーン操作があったか
   */
  consumeChanged() {
    const changed = this.#changed;
    this.#changed = false;
    return changed;
  }
}
