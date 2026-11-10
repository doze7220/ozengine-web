/**
 * @fileoverview 責務: ポインタとキーボードの受信、論理座標への変換、キーの確定の呼び出し、ボタン → 最前面のシーンの順の配信を担う。
 * キー割り当てなどのゲーム固有の分岐、キーの確定の中身、ボタンの描画、時間の取得は行わない。
 */

/**
 * @typedef {Object} QueuedEvent
 * @property {'pointer'|'keydown'|'keyup'|'blur'} kind イベントの種類。
 * @property {'down'|'move'|'up'} [type] kind が 'pointer' のときの種類。
 * @property {number} [x] kind が 'pointer' のときの論理X座標。
 * @property {number} [y] kind が 'pointer' のときの論理Y座標。
 * @property {string} [code] kind が 'keydown' / 'keyup' のときの KeyboardEvent.code。
 * @property {'keyboard'} [source] kind が 'keydown' / 'keyup' のときの入力元。
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

  /** @type {QueuedEvent[]} 受信したイベント（届いた順） */
  #queue = [];
  /** @type {number | null} 押下中のポインタの pointerId。押していなければ null */
  #pressedId = null;
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
   */
  constructor({ canvas, screen, scenes, buttons, keys }) {
    this.#canvas = canvas;
    this.#screen = screen;
    this.#scenes = scenes;
    this.#buttons = buttons;
    this.#keys = keys;

    canvas.style.touchAction = 'none';
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
    canvas.addEventListener('pointerdown', onPointer);
    canvas.addEventListener('pointermove', onPointer);
    canvas.addEventListener('pointerup', onPointer);
    canvas.addEventListener('pointercancel', onPointerEnd);
    canvas.addEventListener('lostpointercapture', onPointerEnd);
    window.addEventListener('keydown', (e) => this.#onKeyDownEvent(e));
    window.addEventListener('keyup', (e) => this.#queue.push({ kind: 'keyup', code: e.code, source: 'keyboard' }));
    window.addEventListener('blur', () => this.#queue.push({ kind: 'blur' }));
  }

  /**
   * 溜めた入力を取り出し、Keys にキーの状態を確定させてから、届いた順に配る。GameLoop が毎フレーム1回呼ぶ。
   * @returns {void}
   */
  dispatch() {
    const events = this.#queue;
    this.#queue = [];
    for (const event of this.#keys.confirm(events)) this.#deliver(event);
  }

  /**
   * pointerdown / pointermove / pointerup を受け取り、論理座標に変換して溜める。
   * @param {PointerEvent} e ポインタのイベント。
   * @returns {void}
   */
  #onPointerEvent(e) {
    if (!e.isPrimary) return;
    if (this.#pressedId !== null && e.pointerId !== this.#pressedId) return;
    const { x, y } = this.#screen.toLogical(e.clientX, e.clientY);
    this.#lastX = x;
    this.#lastY = y;
    const mainPressed = (e.buttons & 1) !== 0;
    if (this.#pressedId === null) {
      if (e.button === 0 && mainPressed) {
        this.#pressedId = e.pointerId;
        this.#canvas.setPointerCapture(e.pointerId);
        this.#enqueuePointer('down', x, y);
        return;
      }
    } else if (!mainPressed) {
      this.#pressedId = null;
      this.#enqueuePointer('up', x, y);
      return;
    }
    if (e.type === 'pointermove') this.#enqueuePointer('move', x, y);
  }

  /**
   * pointercancel / lostpointercapture を受け取り、押下中のポインタなら 'up' を溜める。
   * @param {PointerEvent} e ポインタのイベント。
   * @returns {void}
   */
  #onPointerEnd(e) {
    if (this.#pressedId === null || e.pointerId !== this.#pressedId) return;
    this.#pressedId = null;
    this.#enqueuePointer('up', this.#lastX, this.#lastY);
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
   * ポインタのイベントを溜める。連続した 'move' は最後の1つに置き換える。
   * @param {'down'|'move'|'up'} type ポインタの種類。
   * @param {number} x 論理X座標。
   * @param {number} y 論理Y座標。
   * @returns {void}
   */
  #enqueuePointer(type, x, y) {
    const event = { kind: 'pointer', type, x, y };
    const last = this.#queue[this.#queue.length - 1];
    if (type === 'move' && last && last.kind === 'pointer' && last.type === 'move') {
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
   * ポインタを配る。ボタンが消費した押下は、離すまでシーンへ届けない。
   * @param {QueuedEvent} pointer 'pointer' のイベント。
   * @returns {void}
   */
  #deliverPointer({ type, x, y }) {
    const top = this.#scenes.top;
    if (type === 'down') {
      const button = top ? this.#buttons.find(top, x, y) : null;
      this.#consumed = button !== null;
      if (button) {
        const { onPress } = button;
        onPress();
        return;
      }
    } else if (this.#consumed) {
      if (type === 'up') this.#consumed = false;
      return;
    }
    if (top) top.onPointer({ type, x, y });
  }
}
