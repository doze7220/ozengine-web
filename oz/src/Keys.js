/**
 * @fileoverview 責務: キーボードとバーチャルパッドの入力元をまとめたキーの押下状態の確定と、押した瞬間の判定を担う。
 * イベントの受信と配信は行わない。
 */

/**
 * @typedef {Object} KeyEvent
 * @property {'pointer'|'keydown'|'keyup'|'blur'} kind イベントの種類。
 * @property {string} [code] kind が 'keydown' / 'keyup' のときの KeyboardEvent.code。
 * @property {'keyboard'|'pad'} [source] kind が 'keydown' / 'keyup' のときの入力元。
 */

/**
 * キーの押下状態を確定する。確定は confirm() の中でだけ行い、値は次の confirm() まで変わらない。
 */
export class Keys {
  /** @type {Set<string>} 押している状態のキー */
  #down = new Set();
  /** @type {Set<string>} 次のフレームの確定で外すキー */
  #releaseNext = new Set();
  /** @type {Map<string, Set<string>>} キーごとの、いま押している入力元の集合 */
  #sources = new Map();

  /**
   * そのフレームの全イベントについて押下状態を一度に確定し、配る列を返す。
   * 他の入力元がすでに押しているキーの keydown は、返す列から除く。
   * @param {KeyEvent[]} events 取り出したイベント（届いた順）。
   * @returns {KeyEvent[]} 配るイベント（ポインタのイベントと、onKeyDown を呼ぶ keydown）。
   */
  confirm(events) {
    for (const code of this.#releaseNext) this.#down.delete(code);
    this.#releaseNext.clear();
    const pressedNow = new Set();
    const out = [];
    /**
     * キーを離した扱いにする。同じフレームで押されたキーは次のフレームの確定まで押下を保つ。
     * @param {string} code KeyboardEvent.code。
     * @returns {void}
     */
    const release = (code) => {
      if (pressedNow.has(code)) this.#releaseNext.add(code);
      else this.#down.delete(code);
    };
    for (const event of events) {
      if (event.kind === 'keydown') {
        let held = this.#sources.get(event.code);
        if (!held) {
          held = new Set();
          this.#sources.set(event.code, held);
        }
        const heldByOther = [...held].some((source) => source !== event.source);
        held.add(event.source);
        this.#down.add(event.code);
        pressedNow.add(event.code);
        this.#releaseNext.delete(event.code);
        if (!heldByOther) out.push(event);
      } else if (event.kind === 'keyup') {
        const held = this.#sources.get(event.code);
        if (!held || !held.has(event.source)) continue;
        held.delete(event.source);
        if (held.size === 0) {
          this.#sources.delete(event.code);
          release(event.code);
        }
      } else if (event.kind === 'blur') {
        for (const code of this.#sources.keys()) release(code);
        this.#sources.clear();
      } else if (event.kind === 'pointer') {
        out.push(event);
      }
    }
    return out;
  }

  /**
   * キーを押している状態かを返す。値は confirm() でだけ変わる。
   * @param {string} code KeyboardEvent.code。
   * @returns {boolean} 押していれば true。未知のコードや文字列以外は false。
   */
  isDown(code) {
    return this.#down.has(code);
  }
}
