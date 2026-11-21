/**
 * 責務: UI 部品の既定の大きさ（タイトルバーの高さ、部品の高さ、スライダーの高さ、文字の大きさ）と、
 * スライダーの固定の大きさ（つまみ、溝の太さ、遊びの幅）を論理座標の数値で定義すること。
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

/**
 * スライダーの高さの既定（height を省略したとき）。
 * 上の 1/3 が文字の段（44 = 文字 36 が入る高さ）、下の 2/3 が溝の段（88 = 押しやすい目安）。
 * @type {number}
 */
export const DEFAULT_SLIDER_HEIGHT = 132;

/**
 * スライダーのつまみの一辺。土台の表示で約 32〜38 CSS 画素で、指の下からはみ出して見え、追える大きさ。
 * 押して反応する範囲は部品の全体なので、つまみは 88 より小さくてよい。
 * @type {number}
 */
export const SLIDER_KNOB_SIZE = 64;

/**
 * スライダーの溝の太さ。
 * @type {number}
 */
export const SLIDER_GROOVE_HEIGHT = 12;

/**
 * スライダーの遊び（ヒステリシス）の幅。刻みの境目をこの幅以上越えるまで値を変えず、
 * 境目の近くで指が揺れても値が行き来しないようにする。土台の表示で約 4〜5 CSS 画素。
 * @type {number}
 */
export const SLIDER_HYSTERESIS = 8;
