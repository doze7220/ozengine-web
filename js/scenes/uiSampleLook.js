/**
 * 責務: UI の見本の、差し替えた見た目（暗幕・窓・タイトルバー・閉じるボタン・ボタン・数値・文字の表示の6種類の描く関数）。
 */
/* ozengine sample */

/** 暗幕の色 */
const BACKDROP_COLOR = 'rgba(10, 30, 60, 0.7)';
/** 窓の地の色 */
const WINDOW_FILL = '#fdf6e3';
/** 窓の枠・タイトルバー・値の色 */
const ACCENT_COLOR = '#d35400';
/** 窓の角の丸み */
const WINDOW_RADIUS = 24;
/** 窓の枠の太さ */
const FRAME_WIDTH = 4;
/** 文字のフォント（標準の見た目より小さく太い） */
const FONT = 'bold 30px sans-serif';
/** 文字の左右の余白 */
const TEXT_PADDING = 16;
/** タイトルの左右の余白 */
const TITLE_PADDING = 24;
/** 白い文字・線の色 */
const WHITE = '#ffffff';
/** 閉じるボタンの円の色 */
const CLOSE_FILL = '#a04000';
/** 閉じるボタンの円の色（押されているとき） */
const CLOSE_FILL_PRESSED = '#6e2c00';
/** 閉じるボタンの円の、正方形の内側の余白 */
const CLOSE_MARGIN = 12;
/** 閉じるボタンの × の太さ */
const CLOSE_LINE_WIDTH = 4;
/** 閉じるボタンの × の、一辺に対する半分の大きさの割合 */
const CLOSE_CROSS_RATIO = 0.15;
/** ボタンの角の丸み */
const BUTTON_RADIUS = 20;
/** ボタンの色（押せるとき） */
const BUTTON_FILL = '#2e86c1';
/** ボタンの色（押されているとき） */
const BUTTON_FILL_PRESSED = '#1b4f72';
/** ボタンの色（押せないとき） */
const BUTTON_FILL_DISABLED = '#bdc3c7';
/** ボタンの文字の色（押せないとき） */
const BUTTON_TEXT_DISABLED = '#7f8c8d';
/** 数値・文字の表示の角の丸み */
const VALUE_RADIUS = 16;
/** 数値・文字の表示の地の色 */
const VALUE_FILL = '#eaf2f8';
/** 項目名の色 */
const VALUE_LABEL_COLOR = '#34495e';

/**
 * 角の丸い矩形の道筋を作る（arcTo で書く。ctx.roundRect は古い Safari に無いため使わない）。塗りも線も描かない。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {number} x 左端
 * @param {number} y 上端
 * @param {number} width 幅
 * @param {number} height 高さ
 * @param {number} radius 角の丸み
 * @returns {void}
 */
function roundRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * 暗幕を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number }} info 論理解像度の全体
 * @returns {void}
 */
function drawBackdrop(ctx, { x, y, width, height }) {
  ctx.fillStyle = BACKDROP_COLOR;
  ctx.fillRect(x, y, width, height);
}

/**
 * 窓の地と枠を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number }} info 窓の全体
 * @returns {void}
 */
function drawWindow(ctx, { x, y, width, height }) {
  roundRectPath(ctx, x, y, width, height, WINDOW_RADIUS);
  ctx.fillStyle = WINDOW_FILL;
  ctx.fill();
  const half = FRAME_WIDTH / 2;
  roundRectPath(ctx, x + half, y + half, width - FRAME_WIDTH, height - FRAME_WIDTH, WINDOW_RADIUS - half);
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = FRAME_WIDTH;
  ctx.stroke();
}

/**
 * タイトルバーとタイトルの文字を描く（枠の内側に収める。上の角は窓の丸みに沿って切り取る）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number, title: string }} info タイトルバーの矩形とタイトル
 * @returns {void}
 */
function drawTitleBar(ctx, { x, y, width, height, title }) {
  roundRectPath(ctx, x + FRAME_WIDTH, y + FRAME_WIDTH, width - FRAME_WIDTH * 2, height * 2, WINDOW_RADIUS - FRAME_WIDTH);
  ctx.clip();
  ctx.fillStyle = ACCENT_COLOR;
  ctx.fillRect(x + FRAME_WIDTH, y + FRAME_WIDTH, width - FRAME_WIDTH * 2, height - FRAME_WIDTH);
  ctx.fillStyle = WHITE;
  ctx.font = FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + TITLE_PADDING, y + height / 2, width - height - TITLE_PADDING * 2);
}

/**
 * 閉じるボタンを描く（正方形の内側の円と、白い × の2本の線）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number, pressed: boolean }} info 閉じるボタンの矩形と押下
 * @returns {void}
 */
function drawCloseButton(ctx, { x, y, width, height, pressed }) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  ctx.fillStyle = pressed ? CLOSE_FILL_PRESSED : CLOSE_FILL;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(width, height) / 2 - CLOSE_MARGIN, 0, Math.PI * 2);
  ctx.fill();
  const d = Math.min(width, height) * CLOSE_CROSS_RATIO;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = CLOSE_LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(cx - d, cy - d);
  ctx.lineTo(cx + d, cy + d);
  ctx.moveTo(cx + d, cy - d);
  ctx.lineTo(cx - d, cy + d);
  ctx.stroke();
}

/**
 * 部品のボタンを描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number, label: string, pressed: boolean, enabled: boolean }} info ボタンの矩形・文字・状態
 * @returns {void}
 */
function drawButton(ctx, { x, y, width, height, label, pressed, enabled }) {
  roundRectPath(ctx, x, y, width, height, BUTTON_RADIUS);
  ctx.fillStyle = !enabled ? BUTTON_FILL_DISABLED : pressed ? BUTTON_FILL_PRESSED : BUTTON_FILL;
  ctx.fill();
  ctx.fillStyle = enabled ? WHITE : BUTTON_TEXT_DISABLED;
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2, width - TEXT_PADDING * 2);
}

/**
 * 数値・文字の表示を描く（項目名は左、値は右）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number, label: string, text: string }} info 表示の矩形・項目名・整えた文字
 * @returns {void}
 */
function drawValue(ctx, { x, y, width, height, label, text }) {
  roundRectPath(ctx, x, y, width, height, VALUE_RADIUS);
  ctx.fillStyle = VALUE_FILL;
  ctx.fill();
  const maxWidth = (width - TEXT_PADDING * 3) / 2;
  ctx.font = FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = VALUE_LABEL_COLOR;
  ctx.fillText(label, x + TEXT_PADDING, y + height / 2, maxWidth);
  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT_COLOR;
  ctx.fillText(text, x + width - TEXT_PADDING, y + height / 2, maxWidth);
}

/**
 * 差し替えた見た目（Ui.createWindow の look に渡す。6種類すべて）。
 * @type {{ backdrop: Function, window: Function, titleBar: Function, closeButton: Function, button: Function, value: Function }}
 */
export const SAMPLE_LOOK = {
  backdrop: drawBackdrop,
  window: drawWindow,
  titleBar: drawTitleBar,
  closeButton: drawCloseButton,
  button: drawButton,
  value: drawValue,
};
