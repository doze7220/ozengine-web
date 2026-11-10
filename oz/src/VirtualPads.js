/**
 * @fileoverview 責務: シーンごとのバーチャルパッドの登録、指で触れたかの記録、最前面のシーンのパッドへのタッチの振り分けと、
 * パッドのキーの変化の入力の列への差し込みを担う。当たり判定の中身とキーの確定は持たない。
 */

/**
 * @typedef {Object} PadLike 振り分けに必要なパッドの形（VirtualPad のインスタンス。import せず構造で書く）。
 * @property {(id: number, x: number, y: number) => boolean} down 押し始めた指を渡す。円の内側なら true。
 * @property {(id: number, x: number, y: number) => void} move 指が動いたことを渡す。
 * @property {(id: number) => boolean} up 指が離れたことを渡す。
 * @property {() => void} releaseAll 持っている指をすべて死んだ指にする。
 * @property {() => Set<string>} heldKeys いま押しているキーの集合。
 * @property {() => object} snapshot 描画用の状態の写し。
 */

/**
 * @typedef {Object} PadEvent 振り分けで扱う入力イベント（Input が溜めるものと同じ形）。
 * @property {'pointer'|'keydown'|'keyup'|'blur'} kind イベントの種類。
 * @property {'down'|'move'|'up'} [type] kind が 'pointer' のときの種類。
 * @property {number} [x] kind が 'pointer' のときの論理座標 x。
 * @property {number} [y] kind が 'pointer' のときの論理座標 y。
 * @property {number} [id] kind が 'pointer' のときの pointerId。
 * @property {boolean} [touch] kind が 'pointer' のとき、タッチなら true。
 * @property {string} [code] kind が 'keydown' / 'keyup' のときの KeyboardEvent.code。
 * @property {string} [source] kind が 'keydown' / 'keyup' のときの入力元。
 */

/**
 * シーンごとのバーチャルパッドの登録と、タッチの指の振り分けを行う。
 */
export class VirtualPads {
  /** @type {WeakMap<object, PadLike>} シーンごとのパッド */
  #pads = new WeakMap();
  /** @type {boolean} 指で触れたことがあるか */
  #touched = false;
  /** @type {Map<number, PadLike>} パッドが持っている指（pointerId）とそのパッド */
  #owners = new Map();
  /** @type {WeakMap<PadLike, Set<string>>} パッドごとの、前回までに差し込んだ押下キーの集合 */
  #held = new WeakMap();

  /**
   * シーンにパッドを登録する。検証はしない。
   * @param {object} scene 登録先のシーン。
   * @param {PadLike} pad 登録するパッド。
   * @returns {void}
   */
  add(scene, pad) {
    this.#pads.set(scene, pad);
  }

  /**
   * シーンにパッドが登録されているか調べる。
   * @param {object} scene 調べるシーン。
   * @returns {boolean} 登録されていれば true。
   */
  has(scene) {
    return this.#pads.has(scene);
  }

  /**
   * 指で触れたことがあるか。
   * @returns {boolean} 一度でもタッチの押し始めを処理していれば true。
   */
  get touched() {
    return this.#touched;
  }

  /**
   * イベントの列を振り分け、パッドが処理した指のイベントを除いて、パッドのキーの変化を差し込んだ新しい列を返す。
   * @param {PadEvent[]} events 取り出したイベント（届いた順）。
   * @param {object|null} top 配信の始めの最前面のシーン。
   * @returns {PadEvent[]} 振り分け後のイベントの列（新しい配列）。
   */
  route(events, top) {
    const active = (top !== null && top !== undefined ? this.#pads.get(top) : undefined) ?? null;
    const out = [];

    // 反応するパッドでないパッドの指を解除する（keyup を列の先頭に入れる）。
    for (const pad of new Set(this.#owners.values())) {
      if (pad !== active) {
        pad.releaseAll();
        this.#diff(pad, out);
      }
    }

    for (const event of events) {
      if (event.kind === 'blur') {
        for (const pad of new Set(this.#owners.values())) {
          pad.releaseAll();
          this.#diff(pad, out);
        }
        out.push(event);
        continue;
      }
      if (event.kind !== 'pointer' || !event.touch) {
        out.push(event);
        continue;
      }
      if (event.type === 'down') this.#touched = true;

      const owner = this.#owners.get(event.id);
      if (owner) {
        if (event.type === 'move') {
          owner.move(event.id, event.x, event.y);
        } else if (event.type === 'up') {
          owner.up(event.id);
          this.#owners.delete(event.id);
        }
        this.#diff(owner, out);
        continue;
      }
      if (event.type === 'down' && active && active.down(event.id, event.x, event.y)) {
        this.#owners.set(event.id, active);
        this.#diff(active, out);
        continue;
      }
      out.push(event);
    }
    return out;
  }

  /**
   * シーンのパッドの描画用の状態を返す。
   * @param {object} scene 対象のシーン。
   * @returns {object|null} 登録が無ければ null。あれば `{ visible, stick, buttons }`（毎回新しいオブジェクト）。
   */
  state(scene) {
    const pad = this.#pads.get(scene);
    if (!pad) return null;
    return { visible: this.#touched, ...pad.snapshot() };
  }

  /**
   * パッドの押下キーの前回との差を、keyup（先）と keydown（後）にして列の末尾へ足す。
   * @param {PadLike} pad 対象のパッド。
   * @param {PadEvent[]} out 足し先の列。
   * @returns {void}
   */
  #diff(pad, out) {
    const prev = this.#held.get(pad) ?? new Set();
    const now = pad.heldKeys();
    for (const code of prev) {
      if (!now.has(code)) out.push({ kind: 'keyup', code, source: 'pad' });
    }
    for (const code of now) {
      if (!prev.has(code)) out.push({ kind: 'keydown', code, source: 'pad' });
    }
    this.#held.set(pad, new Set(now));
  }
}
