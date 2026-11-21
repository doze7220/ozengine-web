/**
 * 責務: UI 部品の既定の大きさ（タイトルバーの高さ、部品の高さ、文字の大きさ）を論理座標の数値で定義すること。
 * 論理解像度や画素の倍率からの自動の計算、色などの見た目の値は持たず、何も import しない。
 */

/**
 * タイトルバーの高さの既定（閉じるボタンは一辺がこの値の正方形）。
 * 論理解像度の短い辺が 720 のゲームをスマートフォンで表示すると論理座標の 1 は約 0.5〜0.6 CSS 画素で、
 * 押しやすい目安の 44 CSS 画素を狭い方の 360 CSS 画素で満たす 44 × 720 / 360 = 88。
 * @type {number}
 */
export const DEFAULT_TITLE_BAR_HEIGHT = 88;

/**
 * 部品の高さの既定（height を省略したとき）。考え方は DEFAULT_TITLE_BAR_HEIGHT と同じ。
 * @type {number}
 */
export const DEFAULT_PART_HEIGHT = 88;

/**
 * 文字の大きさの既定。同じ換算で約 18〜21 CSS 画素。
 * @type {number}
 */
export const DEFAULT_TEXT_SIZE = 36;
