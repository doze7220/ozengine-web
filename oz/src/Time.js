/**
 * @fileoverview 責務: realDelta・gameTime・timeScale の管理と、固定ティックの蓄積。
 * 入力・描画・DOM には依存しない。
 */

/** 1フレームで回すティック数の上限。 */
const MAX_TICKS_PER_FRAME = 5;

/** 浮動小数点の丸め誤差を吸収する許容量（ミリ秒）。 */
const EPSILON = 1e-9;

/**
 * 時間管理クラス。固定ティックの蓄積と、ゲーム時間の計算を行う。
 */
export class Time {
  /** @type {number} */
  #tickLength;
  /** @type {number} */
  #timeScale = 1;
  /** @type {number} */
  #realDelta = 0;
  /** @type {number} */
  #gameTime = 0;
  /** @type {number} */
  #accumulated = 0;
  /** @type {number|null} 前回の now。初回は null */
  #lastNow = null;
  /** @type {boolean} 次の beginFrame で蓄積を入れないか */
  #skipNext = false;
  /** @type {{readonly realDelta: number, readonly gameTime: number, readonly timeScale: number}} */
  #view;

  /**
   * @param {number} tickRate 1秒あたりのティック数
   */
  constructor(tickRate) {
    this.#tickLength = 1000 / tickRate;
    const self = this;
    this.#view = Object.freeze({
      get realDelta() { return self.#realDelta; },
      get gameTime() { return self.#gameTime; },
      get timeScale() { return self.#timeScale; },
    });
  }

  /**
   * 1ティックの長さ（ミリ秒）。
   * @returns {number}
   */
  get tickLength() {
    return this.#tickLength;
  }

  /**
   * 時間の進む速さの倍率。
   * @returns {number}
   */
  get timeScale() {
    return this.#timeScale;
  }

  /**
   * 時間の進む速さの倍率を設定する。
   * @param {number} value 有限の数値で 0 以上
   * @throws {RangeError} 有限の数値でない、または負の場合
   */
  set timeScale(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new RangeError('timeScale must be a finite number >= 0');
    }
    this.#timeScale = value;
  }

  /**
   * draw に渡す読み取り専用のビュー。
   * @returns {{readonly realDelta: number, readonly gameTime: number, readonly timeScale: number}}
   */
  get view() {
    return this.#view;
  }

  /**
   * フレームの開始を通知し、時間を進める。
   * @param {number} now requestAnimationFrame のコールバック引数の時刻（ミリ秒）
   * @returns {void}
   */
  beginFrame(now) {
    this.#realDelta = this.#lastNow === null ? 0 : Math.max(0, now - this.#lastNow);
    this.#lastNow = now;
    if (this.#skipNext) {
      this.#skipNext = false;
      return;
    }
    const gameDelta = Math.min(this.#realDelta * this.#timeScale, this.#tickLength * MAX_TICKS_PER_FRAME);
    this.#accumulated += gameDelta;
    this.#gameTime += gameDelta;
  }

  /**
   * 蓄積から1ティック分を消費する。
   * @returns {boolean} 消費できたら true
   */
  consumeTick() {
    if (this.#accumulated >= this.#tickLength - EPSILON) {
      this.#accumulated -= this.#tickLength;
      return true;
    }
    return false;
  }

  /**
   * 蓄積を捨て、次の beginFrame では蓄積と gameTime を進めない。
   * @returns {void}
   */
  discardAccumulated() {
    this.#accumulated = 0;
    this.#skipNext = true;
  }
}
