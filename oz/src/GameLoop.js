/**
 * @fileoverview 責務: requestAnimationFrame による1フレームの処理順序（入力の配信、更新、描画、デバッグ表示）の制御。
 * 時間の計算、シーンの管理、描画の中身は持たず、引数で受け取ったモジュールを呼ぶだけとする。
 */

/**
 * ゲームループ。1フレームの処理順序を固定して回す。
 */
export class GameLoop {
  /** @type {CanvasRenderingContext2D} */
  #ctx;
  /** @type {{beginFrame: function(number): void, consumeTick: function(): boolean, discardAccumulated: function(): void, tickLength: number, view: object}} */
  #time;
  /** @type {{update: function(number): void, consumeChanged: function(): boolean}} */
  #scenes;
  /** @type {{render: function(CanvasRenderingContext2D, object, object): void}} */
  #layers;
  /** @type {{dispatch: function(): void}} */
  #input;
  /** @type {{update: function(number): void, draw: function(CanvasRenderingContext2D): void}|null} */
  #overlay;

  /**
   * @param {object} deps 依存するモジュール
   * @param {CanvasRenderingContext2D} deps.ctx 描画コンテキスト
   * @param {object} deps.time Time インスタンス
   * @param {object} deps.scenes Scenes インスタンス
   * @param {object} deps.layers Layers インスタンス
   * @param {object} deps.input Input インスタンス
   * @param {object|null} deps.overlay DebugOverlay インスタンス。表示しない場合は null
   */
  constructor({ ctx, time, scenes, layers, input, overlay }) {
    this.#ctx = ctx;
    this.#time = time;
    this.#scenes = scenes;
    this.#layers = layers;
    this.#input = input;
    this.#overlay = overlay;
  }

  /**
   * ループを開始する。
   * @returns {void}
   */
  start() {
    requestAnimationFrame((now) => this.#frame(now));
  }

  /**
   * 1フレーム分の処理を行い、最後に次のフレームを予約する。
   * 途中で例外が起きた場合は予約されず、ループは止まる。
   * @param {number} now requestAnimationFrame のコールバック引数の時刻（ミリ秒）
   * @returns {void}
   */
  #frame(now) {
    const time = this.#time;
    const scenes = this.#scenes;

    if (scenes.consumeChanged()) {
      time.discardAccumulated();
    }
    time.beginFrame(now);
    this.#input.dispatch();
    if (scenes.consumeChanged()) {
      time.discardAccumulated();
    }
    while (time.consumeTick()) {
      scenes.update(time.tickLength);
      if (scenes.consumeChanged()) {
        time.discardAccumulated();
        break;
      }
    }
    this.#layers.render(this.#ctx, scenes, time.view);
    if (this.#overlay) {
      this.#overlay.update(time.view.realDelta);
      this.#overlay.draw(this.#ctx);
    }
    requestAnimationFrame((next) => this.#frame(next));
  }
}
