/**
 * @fileoverview 責務: ポインタ（タッチは指ごと）とキーボードの受信、論理座標への変換、パッドへの振り分け → キーの確定 → 配信の流れを担う。
 * ポインタの押下の追跡（単一ポインタの選び出し、ボタンが消費した押下の管理）と、ボタン → 最前面のシーンの順の配信も担う。
 * ゲーム固有の分岐、パッドの当たり判定、キーの確定の中身、ボタンの描画、時間の取得は行わない。
 */

/**
 * @typedef {Object} QueuedEvent
 * @property {'pointer'|'keydown'|'keyup'|'blur'} kind イベントの種類。
 * @property {'down'|'move'|'up'} [type] kind が 'pointer' のときの種類。
 * @property {number} [x] kind が 'pointer' のときの論理X座標。
 * @property {number} [y] kind が 'pointer' のときの論理Y座標。
 * @property {number} [id] kind が 'pointer' のときの pointerId。
 * @property {boolean} [touch] kind が 'pointer' のとき、pointerType が 'touch' か。
 * @property {string} [code] kind が 'keydown' / 'keyup' のときの KeyboardEvent.code。
 * @property {'keyboard'|'pad'} [source] kind が 'keydown' / 'keyup' のときの入力元。
 */

/**
 * ブラウザのイベントを溜め、dispatch() でフレームに1回まとめて確定・配信する。
 */
export class Input {
  /** @type {HTMLCanvasElement} */
  #canvas;
  /** @type {{toLogical: (clientX: number, clientY: number) => {x: number, y: number}}} */
  #screen;
  /** @type {{top: {onPointer: Function, onKeyDown: Function} | null}} */
  #scenes;
  /** @type {{find: (scene: object, x: number, y: number) => {onPress: () => void} | null}} */
  #buttons;
  /** @type {{confirm: (events: QueuedEvent[]) => QueuedEvent[]}} */
  #keys;
  /** @type {{route: (events: QueuedEvent[], top: object | null) => QueuedEvent[]} | null} パッドへの振り分けを行う VirtualPads。無ければ null */
  #pads;

  /** @type {QueuedEvent[]} 受信したイベント（届いた順） */
  #queue = [];
  /** @type {number | null} 押下中の主ポインタ（マウス・ペン、パッドが無いときの全ポインタ）の pointerId。押していなければ null */
  #pressedId = null;
  /** @type {Map<number, {x: number, y: number}>} パッドがあるときに押している指（pointerId → 最後の論理座標） */
  #touches = new Map();
  /** @type {number | null} onPointer へ届けているポインタの id。無ければ null */
  #selectedId = null;
  /** @type {Set<number>} パッドの外で押しているポインタの id（選んだポインタ自身を含む） */
  #downIds = new Set();
  /** @type {number} 直前に受信したポインタの論理X座標 */
  #lastX = 0;
  /** @type {number} 直前に受信したポインタの論理Y座標 */
  #lastY = 0;
  /** @type {boolean} ボタンが消費した押下の最中か */
  #consumed = false;

  /**
   * 入力のイベントを登録する。解除の処理は持たない。
   * @param {Object} deps 依存するインスタンス。
   * @param {HTMLCanvasElement} deps.canvas 利用側から渡された canvas。
   * @param {{toLogical: (clientX: number, clientY: number) => {x: number, y: number}}} deps.screen 座標変換を行う Screen。
   * @param {{top: {onPointer: Function, onKeyDown: Function} | null}} deps.scenes 最前面のシーンを返す Scenes。
   * @param {{find: (scene: object, x: number, y: number) => {onPress: () => void} | null}} deps.buttons ボタンの当たり判定を行う Buttons。
   * @param {{confirm: (events: QueuedEvent[]) => QueuedEvent[]}} deps.keys キーの確定を行う Keys。
   * @param {{route: (events: QueuedEvent[], top: object | null) => QueuedEvent[]} | null} [deps.pads] パッドへの振り分けを行う VirtualPads。省略時は null（タッチを指ごとに扱わない）。
   */
  constructor({ canvas, screen, scenes, buttons, keys, pads = null }) {
    this.#canvas = canvas;
    this.#screen = screen;
    this.#scenes = scenes;
    this.#buttons = buttons;
    this.#keys = keys;
    this.#pads = pads;

    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';
    canvas.style.webkitTouchCallout = 'none';
    /**
     * pointerdown / pointermove / pointerup を #onPointerEvent に委譲する。
     * @param {PointerEvent} e ポインタのイベント。
     * @returns {void}
     */
    const onPointer = (e) => this.#onPointerEvent(e);
    /**
     * pointercancel / lostpointercapture を #onPointerEnd に委譲する。
     * @param {PointerEvent} e ポインタのイベント。
     * @returns {void}
     */
    const onPointerEnd = (e) => this.#onPointerEnd(e);
    /**
     * タッチの長押しのメニューを止める。マウスの右クリックのメニューは止めない。
     * @param {PointerEvent} e contextmenu のイベント。
     * @returns {void}
     */
    const onContextMenu = (e) => {
      if (e.pointerType === 'touch' || this.#touches.size > 0) e.preventDefault();
    };
    canvas.addEventListener('pointerdown', onPointer);
    canvas.addEventListener('pointermove', onPointer);
    canvas.addEventListener('pointerup', onPointer);
    canvas.addEventListener('pointercancel', onPointerEnd);
    canvas.addEventListener('lostpointercapture', onPointerEnd);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', (e) => this.#onKeyDownEvent(e));
    window.addEventListener('keyup', (e) => this.#queue.push({ kind: 'keyup', code: e.code, source: 'keyboard' }));
    window.addEventListener('blur', () => this.#queue.push({ kind: 'blur' }));
  }

  /**
   * 溜めた入力を取り出し、パッドへ振り分け（あれば）、Keys にキーの状態を確定させてから、届いた順に配る。GameLoop が毎フレーム1回呼ぶ。
   * @returns {void}
   */
  dispatch() {
    let events = this.#queue;
    this.#queue = [];
    if (this.#pads) events = this.#pads.route(events, this.#scenes.top);
    for (const event of this.#keys.confirm(events)) this.#deliver(event);
  }

  /**
   * pointerdown / pointermove / pointerup を受け取り、論理座標に変換して溜める。
   * @param {PointerEvent} e ポインタのイベント。
   * @returns {void}
   */
  #onPointerEvent(e) {
    if (this.#pads && e.pointerType === 'touch') {
      this.#onTouchEvent(e);
      return;
    }
    if (!e.isPrimary) return;
    if (this.#pressedId !== null && e.pointerId !== this.#pressedId) return;
    const { x, y } = this.#screen.toLogical(e.clientX, e.clientY);
    this.#lastX = x;
    this.#lastY = y;
    const touch = e.pointerType === 'touch';
    const mainPressed = (e.buttons & 1) !== 0;
    if (this.#pressedId === null) {
      if (e.button === 0 && mainPressed) {
        this.#pressedId = e.pointerId;
        this.#canvas.setPointerCapture(e.pointerId);
        this.#enqueuePointer('down', x, y, e.pointerId, touch);
        return;
      }
    } else if (!mainPressed) {
      this.#pressedId = null;
      this.#enqueuePointer('up', x, y, e.pointerId, touch);
      return;
    }
    if (e.type === 'pointermove') this.#enqueuePointer('move', x, y, e.pointerId, touch);
  }

  /**
   * パッドがあるときのタッチの pointerdown / pointermove / pointerup を、指ごとに受け取って溜める。
   * @param {PointerEvent} e タッチのポインタのイベント。
   * @returns {void}
   */
  #onTouchEvent(e) {
    const { x, y } = this.#screen.toLogical(e.clientX, e.clientY);
    const id = e.pointerId;
    if (e.type === 'pointerdown') {
      if (e.button !== 0) return;
      this.#touches.set(id, { x, y });
      this.#canvas.setPointerCapture(id);
      this.#enqueuePointer('down', x, y, id, true);
    } else if (e.type === 'pointermove') {
      if (!this.#touches.has(id)) return;
      this.#touches.set(id, { x, y });
      this.#enqueuePointer('move', x, y, id, true);
    } else if (e.type === 'pointerup') {
      if (!this.#touches.has(id)) return;
      this.#touches.delete(id);
      this.#enqueuePointer('up', x, y, id, true);
    }
  }

  /**
   * pointercancel / lostpointercapture を受け取り、押している指（またはパッドが無いときの押下中のポインタ）なら 'up' を溜める。
   * @param {PointerEvent} e ポインタのイベント。
   * @returns {void}
   */
  #onPointerEnd(e) {
    const touch = this.#touches.get(e.pointerId);
    if (touch) {
      this.#touches.delete(e.pointerId);
      this.#enqueuePointer('up', touch.x, touch.y, e.pointerId, true);
      return;
    }
    if (this.#pressedId === null || e.pointerId !== this.#pressedId) return;
    this.#pressedId = null;
    this.#enqueuePointer('up', this.#lastX, this.#lastY, e.pointerId, e.pointerType === 'touch');
  }

  /**
   * keydown を受け取る。repeat が真なら溜めない。
   * @param {KeyboardEvent} e キーのイベント。
   * @returns {void}
   */
  #onKeyDownEvent(e) {
    if (e.repeat) return;
    this.#queue.push({ kind: 'keydown', code: e.code, source: 'keyboard' });
  }

  /**
   * ポインタのイベントを溜める。末尾が同じ id の 'move' なら置き換える。
   * @param {'down'|'move'|'up'} type ポインタの種類。
   * @param {number} x 論理X座標。
   * @param {number} y 論理Y座標。
   * @param {number} id pointerId。
   * @param {boolean} touch pointerType が 'touch' か。
   * @returns {void}
   */
  #enqueuePointer(type, x, y, id, touch) {
    const event = { kind: 'pointer', type, x, y, id, touch };
    const last = this.#queue[this.#queue.length - 1];
    if (type === 'move' && last && last.kind === 'pointer' && last.type === 'move' && last.id === id) {
      this.#queue[this.#queue.length - 1] = event;
    } else {
      this.#queue.push(event);
    }
  }

  /**
   * 1つのイベントを配る。最前面のシーンはイベントごとに取り直す。
   * @param {QueuedEvent} event 配るイベント。
   * @returns {void}
   */
  #deliver(event) {
    if (event.kind === 'pointer') {
      this.#deliverPointer(event);
    } else if (event.kind === 'keydown') {
      const top = this.#scenes.top;
      if (top) top.onKeyDown(event.code);
    }
  }

  /**
   * ポインタを1本に絞って配る。パッドの外で押しているポインタが無いときに押し始めた1本だけを、離すまで届ける。
   * ボタンが消費した押下は、離すまでシーンへ届けない。
   * @param {QueuedEvent} pointer 'pointer' のイベント。
   * @returns {void}
   */
  #deliverPointer({ type, x, y, id }) {
    const top = this.#scenes.top;
    if (type === 'down') {
      const select = this.#downIds.size === 0;
      this.#downIds.add(id);
      if (!select) return;
      this.#selectedId = id;
      const button = top ? this.#buttons.find(top, x, y) : null;
      this.#consumed = button !== null;
      if (button) {
        const { onPress } = button;
        onPress();
        return;
      }
    } else if (type === 'move') {
      if (this.#selectedId === id) {
        if (this.#consumed) return;
      } else if (this.#downIds.has(id) || this.#selectedId !== null) {
        return;
      }
    } else {
      this.#downIds.delete(id);
      if (this.#selectedId !== id) return;
      this.#selectedId = null;
      if (this.#consumed) {
        this.#consumed = false;
        return;
      }
    }
    if (top) top.onPointer({ type, x, y });
  }
}
