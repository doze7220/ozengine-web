/**
 * 責務: ui レイヤーに描く文字（汎用の文字、右上の状態表示）の共通処理。
 */
/* ozengine sample */
import { isMuted } from './mute.js';

/** 文字の色 */
const TEXT_COLOR = '#ffffff';
/** 状態表示の右端の余白（px） */
const LABEL_MARGIN_RIGHT = 20;
/** 状態表示の1行目の y 座標（px） */
const LABEL_FIRST_Y = 30;
/** 状態表示の行の間隔（px） */
const LABEL_LINE_HEIGHT = 36;
/** 状態表示のフォント */
const LABEL_FONT = '24px sans-serif';
/** 状態表示の寄せ方 */
const LABEL_ALIGN = 'right';
/** ミュート中の表示文字 */
const MUTE_TEXT = 'ミュート中';
/** スロー中の表示文字 */
const SLOW_TEXT = 'スロー';

/**
 * @typedef {{ width: number, height: number }} Screen 解像度
 */

/**
 * 白い文字を1つ描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {string} text 文字
 * @param {number} x 基準の x 座標
 * @param {number} y 基準の y 座標（縦は中央揃え）
 * @param {string} font フォント指定（例: '24px sans-serif'）
 * @param {CanvasTextAlign} [align='center'] 横の寄せ方
 * @returns {void}
 */
export function drawText(ctx, text, x, y, font, align = 'center') {
  ctx.save();
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * 右上の指定の行に状態表示を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {Screen} screen 解像度
 * @param {string} text 文字
 * @param {number} line 行（0 が1行目）
 * @returns {void}
 */
function drawLabel(ctx, screen, text, line) {
  drawText(
    ctx,
    text,
    screen.width - LABEL_MARGIN_RIGHT,
    LABEL_FIRST_Y + LABEL_LINE_HEIGHT * line,
    LABEL_FONT,
    LABEL_ALIGN,
  );
}

/**
 * ミュート中のときだけ、右上の1行目に「ミュート中」を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {Screen} screen 解像度
 * @returns {void}
 */
export function drawMuteLabel(ctx, screen) {
  if (isMuted()) drawLabel(ctx, screen, MUTE_TEXT, 0);
}

/**
 * 右上の2行目に「スロー」を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {Screen} screen 解像度
 * @returns {void}
 */
export function drawSlowLabel(ctx, screen) {
  drawLabel(ctx, screen, SLOW_TEXT, 1);
}
