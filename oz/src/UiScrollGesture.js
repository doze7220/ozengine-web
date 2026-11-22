/**
 * 責務: スクロールする領域の中で押した指の扱い（タップとドラッグの区別、ドラッグになったときの取り消しの依頼、スクロールの量の依頼、領域の中のスライダーの向きの判定、中の部品へのポインタの受け渡し）。
 * 位置の計算・部品を作ること・Canvas の操作は行わず、UiMetrics だけを import する。
 */

import { SCROLL_DRAG_DISTANCE } from './UiMetrics.js';

/**
 * 領域の中の部品の共通の形（ジェスチャが使う範囲）。
 * @typedef {Object} GesturePart
 * @property {string} kind 部品の種類（'slider' のときスライダーとして扱う）
 * @property {(x: number, y: number) => boolean} pointerDown
 * @property {(x: number, y: number) => *} pointerMove
 * @property {(x: number, y: number) => *} pointerUp
 */

/**
 * 押している間の状態。
 * @typedef {Object} GestureState
 * @property {number} downX 押した x
 * @property {number} downY 押した y
 * @property {number} lastY 前の縦の位置（ドラッグ中のスクロールの量の計算に使う）
 * @property {'pending' | 'drag' | 'slider'} mode 状態の名前（pending: タップかドラッグか未定、drag: スクロール中、slider: スライダーの操作中）
 * @property {GesturePart | null} child 押されている中の部品（スライダー以外）
 * @property {GesturePart | null} slider 押した位置のスライダー
 */

/**
 * スクロールする領域の中の指の扱いを決める。
 */
export class UiScrollGesture {
  /** @type {(dy: number) => void} */
  #scrollBy;
  /** @type {() => void} */
  #cancel;
  /** @type {GestureState | null} */
  #state = null;

  /**
   * @param {{ scrollBy: (dy: number) => void, cancel: () => void }} options
   *   scrollBy: スクロールの位置を dy だけ動かす依頼。cancel: 押されていた中の部品の取り消しの依頼
   */
  constructor({ scrollBy, cancel }) {
    this.#scrollBy = scrollBy;
    this.#cancel = cancel;
  }

  /**
   * スクロールのドラッグ中か。
   * @returns {boolean}
   */
  get dragging() {
    return this.#state !== null && this.#state.mode === 'drag';
  }

  /**
   * 領域の中で押した。
   * @param {number} x 押した x（画面の論理座標）
   * @param {number} y 押した y（画面の論理座標）
   * @param {GesturePart | null} child 押した位置のいちばん上の中の部品、または null
   * @returns {void}
   */
  down(x, y, child) {
    /** @type {GestureState} */
    const state = { downX: x, downY: y, lastY: y, mode: 'pending', child: null, slider: null };
    if (child !== null && child !== undefined) {
      if (child.kind === 'slider') {
        state.slider = child;
      } else if (child.pointerDown(x, y)) {
        state.child = child;
      }
    }
    this.#state = state;
  }

  /**
   * 押したまま動いた。
   * @param {number} x 今の x（画面の論理座標）
   * @param {number} y 今の y（画面の論理座標）
   * @returns {void}
   */
  move(x, y) {
    const s = this.#state;
    if (s === null) return;
    if (s.mode === 'pending') {
      const dx = x - s.downX;
      const dy = y - s.downY;
      if (dx * dx + dy * dy > SCROLL_DRAG_DISTANCE * SCROLL_DRAG_DISTANCE) {
        if (s.slider !== null && Math.abs(dx) > Math.abs(dy)) {
          s.mode = 'slider';
          s.slider.pointerDown(s.downX, s.downY);
          s.slider.pointerMove(x, y);
        } else {
          s.mode = 'drag';
          if (s.child !== null) {
            s.child = null;
            this.#cancel();
          }
          s.lastY = y;
        }
      } else if (s.child !== null) {
        s.child.pointerMove(x, y);
      }
    } else if (s.mode === 'slider') {
      s.slider.pointerMove(x, y);
    } else {
      const dy = s.lastY - y;
      s.lastY = y;
      this.#scrollBy(dy);
    }
  }

  /**
   * 離した。状態を消してから中の部品を呼ぶ。
   * @param {number} x 離した x（画面の論理座標）
   * @param {number} y 離した y（画面の論理座標）
   * @returns {void}
   */
  up(x, y) {
    const s = this.#state;
    this.#state = null;
    if (s === null) return;
    if (s.mode === 'pending') {
      if (s.slider !== null) {
        s.slider.pointerDown(s.downX, s.downY);
        s.slider.pointerUp(x, y);
      }
      if (s.child !== null) s.child.pointerUp(x, y);
    } else if (s.mode === 'slider') {
      s.slider.pointerUp(x, y);
    }
  }
}
