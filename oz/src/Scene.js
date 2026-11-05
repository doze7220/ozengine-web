/**
 * @fileoverview 責務: シーンの基底クラス（init / update / draw / destroy / onPointer / onKeyDown のインターフェース）。
 * 共通のゲーム処理は持たない。
 */

/**
 * シーンの基底クラス。利用側は継承して必要なメソッドだけを上書きする。
 * 中身はすべて空であり、`new Scene()` は何も描かないシーンとして使える。
 */
export class Scene {
  /**
   * スタックに積まれた直後に1回呼ばれる。
   * @returns {void}
   */
  init() {}

  /**
   * 固定ティックごとに、最前面のシーンだけに呼ばれる。
   * @param {number} dt ティック長（ミリ秒）。timeScale の影響を受けない
   * @returns {void}
   */
  update(dt) {}

  /**
   * レイヤーごとに、スタックの下から順に呼ばれる。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer 現在描画中のレイヤー名
   * @param {{readonly realDelta: number, readonly gameTime: number, readonly timeScale: number}} time 読み取り専用の時間情報
   * @returns {void}
   */
  draw(ctx, layer, time) {}

  /**
   * ポインタ入力のとき、最前面のシーンだけに呼ばれる。戻り値は使われない。
   * @param {{type: 'down'|'move'|'up', x: number, y: number}} pointer 種別と論理座標
   * @returns {void}
   */
  onPointer(pointer) {}

  /**
   * キーを押した瞬間に、最前面のシーンだけに呼ばれる。キーリピートでは呼ばれない。
   * @param {string} code KeyboardEvent.code の文字列
   * @returns {void}
   */
  onKeyDown(code) {}

  /**
   * スタックから外された直後に1回呼ばれる。
   * @returns {void}
   */
  destroy() {}
}
