/**
 * @fileoverview 責務: 1つのバーチャルパッドの配置の検証、当たり判定、指ごとの押下状態、キーへの変換、つまみの位置を担う。
 * 描画・画像・window には関与せず、配置やキーの既定値も持たない。
 */

/**
 * 8方向を45度ずつに分けるための係数。スティックの傾きの長さに掛けて斜めの判定のしきい値にする。
 * ゲーム固有の値ではない。
 * @type {number}
 */
const DIAGONAL_SIN = Math.sin(Math.PI / 8);

/** @type {string[]} stick.keys に書ける方向 */
const STICK_DIRECTIONS = ['left', 'right', 'up', 'down'];

/**
 * @typedef {Object} StickLayout
 * @property {number} x 中心の論理座標 x。
 * @property {number} y 中心の論理座標 y。
 * @property {number} radius 半径（当たり判定とつまみが動ける範囲）。
 * @property {number} deadZone 遊びの大きさ（radius に対する割合。0 以上 1 未満）。
 * @property {{left?: string, right?: string, up?: string, down?: string}} keys 方向ごとの KeyboardEvent.code。
 */

/**
 * @typedef {Object} ButtonLayout
 * @property {number} x 中心の論理座標 x。
 * @property {number} y 中心の論理座標 y。
 * @property {number} radius 半径。
 * @property {string} key KeyboardEvent.code。
 */

/**
 * @typedef {Object} PadLayout
 * @property {StickLayout} [stick] スティック。
 * @property {ButtonLayout[]} [buttons] ボタンの配列。
 */

/**
 * @typedef {Object} PadSnapshot
 * @property {{x: number, y: number, radius: number, knobX: number, knobY: number, active: boolean}|null} stick スティックの描画用の状態。無ければ null。
 * @property {{x: number, y: number, radius: number, key: string, pressed: boolean}[]} buttons ボタンの描画用の状態（layout.buttons と同じ順）。
 */

/**
 * 値がプレーンなオブジェクトか調べる。
 * @param {*} v 調べる値。
 * @returns {boolean} プレーンなオブジェクトなら true。
 */
function isObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 表にない項目があればエラーにする。
 * @param {object} obj 調べるオブジェクト。
 * @param {string[]} allowed 使える項目名。
 * @param {string} path エラーに入れる項目の場所（例 'stick'）。空文字なら layout 自身。
 * @param {string} prefix エラーの先頭（`[oz] API名:`）。
 * @returns {void}
 */
function checkNoExtra(obj, allowed, path, prefix) {
  for (const name of Object.keys(obj)) {
    if (!allowed.includes(name)) {
      const where = path ? `${path} に` : 'layout に';
      throw new Error(`${prefix} ${where}使えない項目 ${name} があります`);
    }
  }
}

/**
 * 有限の数値かを調べて、違えばエラーにする。
 * @param {*} v 値。
 * @param {string} name 項目名。
 * @param {string} prefix エラーの先頭。
 * @param {string} desc 条件の説明（例 '有限の数値'）。
 * @param {(n: number) => boolean} [extra] 追加の条件。
 * @returns {void}
 */
function checkNumber(v, name, prefix, desc, extra) {
  if (typeof v !== 'number' || !Number.isFinite(v) || (extra && !extra(v))) {
    throw new Error(`${prefix} ${name} は${desc}で指定してください`);
  }
}

/**
 * 空でない文字列かを調べて、違えばエラーにする。
 * @param {*} v 値。
 * @param {string} name 項目名。
 * @param {string} prefix エラーの先頭。
 * @returns {void}
 */
function checkKey(v, name, prefix) {
  if (typeof v !== 'string' || v === '') {
    throw new Error(`${prefix} ${name} は空でない文字列で指定してください`);
  }
}

/**
 * Engine.addVirtualPad の layout を検証する。不正なら Error を投げる。
 * @param {*} layout 検証する値。
 * @param {string} apiName エラーの先頭に入れる API 名（例 'Engine.addVirtualPad'）。
 * @returns {void}
 * @throws {Error} 先頭が `[oz] ${apiName}:` で項目名を含む Error。
 */
export function validatePadLayout(layout, apiName) {
  const prefix = `[oz] ${apiName}:`;
  if (!isObject(layout)) {
    throw new Error(`${prefix} layout はオブジェクトで指定してください`);
  }
  checkNoExtra(layout, ['stick', 'buttons'], '', prefix);

  const hasStick = layout.stick !== undefined;
  if (hasStick) {
    const stick = layout.stick;
    if (!isObject(stick)) {
      throw new Error(`${prefix} stick はオブジェクトで指定してください`);
    }
    checkNoExtra(stick, ['x', 'y', 'radius', 'deadZone', 'keys'], 'stick', prefix);
    checkNumber(stick.x, 'stick.x', prefix, '有限の数値');
    checkNumber(stick.y, 'stick.y', prefix, '有限の数値');
    checkNumber(stick.radius, 'stick.radius', prefix, '正の有限数', (n) => n > 0);
    checkNumber(stick.deadZone, 'stick.deadZone', prefix, '0 以上 1 未満の有限の数値', (n) => n >= 0 && n < 1);
    if (!isObject(stick.keys)) {
      throw new Error(`${prefix} stick.keys はオブジェクトで指定してください`);
    }
    checkNoExtra(stick.keys, STICK_DIRECTIONS, 'stick.keys', prefix);
    for (const dir of STICK_DIRECTIONS) {
      if (stick.keys[dir] !== undefined) checkKey(stick.keys[dir], `stick.keys.${dir}`, prefix);
    }
  }

  let buttonCount = 0;
  if (layout.buttons !== undefined) {
    if (!Array.isArray(layout.buttons)) {
      throw new Error(`${prefix} buttons は配列で指定してください`);
    }
    buttonCount = layout.buttons.length;
    layout.buttons.forEach((b, i) => {
      const name = `buttons[${i}]`;
      if (!isObject(b)) {
        throw new Error(`${prefix} ${name} はオブジェクトで指定してください`);
      }
      checkNoExtra(b, ['x', 'y', 'radius', 'key'], name, prefix);
      checkNumber(b.x, `${name}.x`, prefix, '有限の数値');
      checkNumber(b.y, `${name}.y`, prefix, '有限の数値');
      checkNumber(b.radius, `${name}.radius`, prefix, '正の有限数', (n) => n > 0);
      checkKey(b.key, `${name}.key`, prefix);
    });
  }

  if (!hasStick && buttonCount === 0) {
    throw new Error(`${prefix} stick か buttons（1つ以上）のどちらかを指定してください`);
  }
}

/**
 * 1つのバーチャルパッド。指ごとにスティックとボタンの押下状態を持ち、押しているキーの集合を返す。
 */
export class VirtualPad {
  /** @type {{x: number, y: number, radius: number, deadZone: number, keys: object}|null} スティックの配置（コピー） */
  #stick;
  /** @type {{x: number, y: number, radius: number, key: string}[]} ボタンの配置（コピー） */
  #buttons;
  /** @type {number|null} スティックを操作している指の id */
  #stickId = null;
  /** @type {number} スティックの指の中心からのずれ x */
  #dx = 0;
  /** @type {number} スティックの指の中心からのずれ y */
  #dy = 0;
  /** @type {Set<number>[]} ボタンごとの、押している指の id の集合 */
  #pressers;
  /** @type {Set<number>} 何も押さない「死んだ指」の id */
  #dead = new Set();

  /**
   * @param {PadLayout} layout 検証済みの配置。深くコピーして持つ。
   */
  constructor(layout) {
    const s = layout.stick;
    this.#stick = s === undefined
      ? null
      : { x: s.x, y: s.y, radius: s.radius, deadZone: s.deadZone, keys: { ...s.keys } };
    this.#buttons = (layout.buttons ?? []).map((b) => ({ x: b.x, y: b.y, radius: b.radius, key: b.key }));
    this.#pressers = this.#buttons.map(() => new Set());
  }

  /**
   * 押し始めた指を受け取る。ボタン（配列の後ろから）、スティックの順に調べる。
   * @param {number} id 指の id。
   * @param {number} x 論理座標 x。
   * @param {number} y 論理座標 y。
   * @returns {boolean} 円の内側（縁を含む）で指を持ったら true。どれにも入らなければ false。
   */
  down(id, x, y) {
    if (this.#holds(id)) return true;
    for (let i = this.#buttons.length - 1; i >= 0; i--) {
      const b = this.#buttons[i];
      if (Math.hypot(x - b.x, y - b.y) <= b.radius) {
        this.#pressers[i].add(id);
        return true;
      }
    }
    const s = this.#stick;
    if (s && Math.hypot(x - s.x, y - s.y) <= s.radius) {
      if (this.#stickId === null) {
        this.#stickId = id;
        this.#dx = x - s.x;
        this.#dy = y - s.y;
      } else {
        this.#dead.add(id);
      }
      return true;
    }
    return false;
  }

  /**
   * 指が動いたことを受け取る。スティックの指のときだけずれを更新する。
   * @param {number} id 指の id。
   * @param {number} x 論理座標 x。
   * @param {number} y 論理座標 y。
   * @returns {void}
   */
  move(id, x, y) {
    if (this.#stick && this.#stickId === id) {
      this.#dx = x - this.#stick.x;
      this.#dy = y - this.#stick.y;
    }
  }

  /**
   * 指が離れたことを受け取る。
   * @param {number} id 指の id。
   * @returns {boolean} このパッドが持っていた指なら true。
   */
  up(id) {
    if (this.#stickId === id) {
      this.#stickId = null;
      this.#dx = 0;
      this.#dy = 0;
      return true;
    }
    for (const set of this.#pressers) {
      if (set.delete(id)) return true;
    }
    return this.#dead.delete(id);
  }

  /**
   * 持っている指をすべて死んだ指にし、何も押さない状態にする。死んだ指は up で外れるまで持ち続ける。
   * @returns {void}
   */
  releaseAll() {
    if (this.#stickId !== null) {
      this.#dead.add(this.#stickId);
      this.#stickId = null;
      this.#dx = 0;
      this.#dy = 0;
    }
    for (const set of this.#pressers) {
      for (const id of set) this.#dead.add(id);
      set.clear();
    }
  }

  /**
   * いまパッドで押しているキーを返す。
   * @returns {Set<string>} KeyboardEvent.code の集合。
   */
  heldKeys() {
    const keys = new Set();
    const s = this.#stick;
    if (s && this.#stickId !== null) {
      const dx = this.#dx;
      const dy = this.#dy;
      const dist = Math.hypot(dx, dy);
      if (!(dist < s.deadZone * s.radius)) {
        const t = dist * DIAGONAL_SIN;
        if (dx > t && s.keys.right !== undefined) keys.add(s.keys.right);
        if (dx < -t && s.keys.left !== undefined) keys.add(s.keys.left);
        if (dy > t && s.keys.down !== undefined) keys.add(s.keys.down);
        if (dy < -t && s.keys.up !== undefined) keys.add(s.keys.up);
      }
    }
    this.#buttons.forEach((b, i) => {
      if (this.#pressers[i].size > 0) keys.add(b.key);
    });
    return keys;
  }

  /**
   * 描画用の状態の写しを返す（毎回新しいオブジェクト）。
   * @returns {PadSnapshot} スティックとボタンの状態。
   */
  snapshot() {
    let stick = null;
    const s = this.#stick;
    if (s) {
      let knobX = s.x;
      let knobY = s.y;
      if (this.#stickId !== null) {
        const dist = Math.hypot(this.#dx, this.#dy);
        const k = dist <= s.radius ? 1 : s.radius / dist;
        knobX = s.x + this.#dx * k;
        knobY = s.y + this.#dy * k;
      }
      stick = { x: s.x, y: s.y, radius: s.radius, knobX, knobY, active: this.#stickId !== null };
    }
    const buttons = this.#buttons.map((b, i) => ({
      x: b.x, y: b.y, radius: b.radius, key: b.key, pressed: this.#pressers[i].size > 0,
    }));
    return { stick, buttons };
  }

  /**
   * 指をこのパッドが持っているか調べる。
   * @param {number} id 指の id。
   * @returns {boolean} 持っていれば true。
   */
  #holds(id) {
    if (this.#stickId === id || this.#dead.has(id)) return true;
    return this.#pressers.some((set) => set.has(id));
  }
}
