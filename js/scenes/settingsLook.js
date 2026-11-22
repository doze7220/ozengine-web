/**
 * 責務: 土台の設定画面の、差し替えた見た目（暗幕・窓・タイトルバー・閉じるボタン・ボタン・
 * チェックボックス・スライダーの7種類の描く関数）。
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
/** 値を変える部品（チェックボックス・スライダー）の地の角の丸み */
const CONTROL_RADIUS = 16;
/** 値を変える部品の地の色 */
const CONTROL_FILL = '#eaf2f8';
/** 項目名の色 */
const LABEL_COLOR = '#34495e';
/** 値を変える部品の地の色（押されているとき） */
const CONTROL_FILL_PRESSED = '#d6eaf8';
/** チェックボックスの箱の一辺 */
const CHECKBOX_BOX_SIZE = 44;
/** チェックボックスの箱の角の丸み */
const CHECKBOX_RADIUS = 8;
/** チェックボックスの箱の枠・レ点の太さ */
const CHECKBOX_LINE_WIDTH = 4;
/** スライダーのつまみの白い縁の太さ */
const KNOB_RIM_WIDTH = 4;

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
  ctx.save();
  ctx.fillStyle = BACKDROP_COLOR;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

/**
 * 窓の地と枠を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number }} info 窓の全体
 * @returns {void}
 */
function drawWindow(ctx, { x, y, width, height }) {
  ctx.save();
  roundRectPath(ctx, x, y, width, height, WINDOW_RADIUS);
  ctx.fillStyle = WINDOW_FILL;
  ctx.fill();
  const half = FRAME_WIDTH / 2;
  roundRectPath(ctx, x + half, y + half, width - FRAME_WIDTH, height - FRAME_WIDTH, WINDOW_RADIUS - half);
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = FRAME_WIDTH;
  ctx.stroke();
  ctx.restore();
}

/**
 * タイトルバーとタイトルの文字を描く（枠の内側に収める。上の角は窓の丸みに沿って切り取る）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number, title: string }} info タイトルバーの矩形とタイトル
 * @returns {void}
 */
function drawTitleBar(ctx, { x, y, width, height, title }) {
  ctx.save();
  roundRectPath(ctx, x + FRAME_WIDTH, y + FRAME_WIDTH, width - FRAME_WIDTH * 2, height * 2, WINDOW_RADIUS - FRAME_WIDTH);
  ctx.clip();
  ctx.fillStyle = ACCENT_COLOR;
  ctx.fillRect(x + FRAME_WIDTH, y + FRAME_WIDTH, width - FRAME_WIDTH * 2, height - FRAME_WIDTH);
  ctx.fillStyle = WHITE;
  ctx.font = FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + TITLE_PADDING, y + height / 2, width - height - TITLE_PADDING * 2);
  ctx.restore();
}

/**
 * 閉じるボタンを描く（正方形の内側の円と、白い × の2本の線）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number, pressed: boolean }} info 閉じるボタンの矩形と押下
 * @returns {void}
 */
function drawCloseButton(ctx, { x, y, width, height, pressed }) {
  ctx.save();
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
  ctx.restore();
}

/**
 * 部品のボタンを描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number, label: string, pressed: boolean, enabled: boolean }} info ボタンの矩形・文字・状態
 * @returns {void}
 */
function drawButton(ctx, { x, y, width, height, label, pressed, enabled }) {
  ctx.save();
  roundRectPath(ctx, x, y, width, height, BUTTON_RADIUS);
  ctx.fillStyle = !enabled ? BUTTON_FILL_DISABLED : pressed ? BUTTON_FILL_PRESSED : BUTTON_FILL;
  ctx.fill();
  ctx.fillStyle = enabled ? WHITE : BUTTON_TEXT_DISABLED;
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2, width - TEXT_PADDING * 2);
  ctx.restore();
}

/**
 * チェックボックスを描く（淡い青の地、左に箱、右に項目名）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number, label: string, checked: boolean, pressed: boolean }} info 部品の矩形・項目名・状態
 * @returns {void}
 */
function drawCheckbox(ctx, { x, y, width, height, label, checked, pressed }) {
  ctx.save();
  roundRectPath(ctx, x, y, width, height, CONTROL_RADIUS);
  ctx.fillStyle = pressed ? CONTROL_FILL_PRESSED : CONTROL_FILL;
  ctx.fill();
  const boxX = x + TEXT_PADDING;
  const boxY = y + (height - CHECKBOX_BOX_SIZE) / 2;
  const half = CHECKBOX_LINE_WIDTH / 2;
  roundRectPath(ctx, boxX + half, boxY + half, CHECKBOX_BOX_SIZE - CHECKBOX_LINE_WIDTH, CHECKBOX_BOX_SIZE - CHECKBOX_LINE_WIDTH, CHECKBOX_RADIUS);
  if (checked) {
    ctx.fillStyle = ACCENT_COLOR;
    ctx.fill();
  }
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = CHECKBOX_LINE_WIDTH;
  ctx.stroke();
  if (checked) {
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = CHECKBOX_LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(boxX + CHECKBOX_BOX_SIZE * 0.22, boxY + CHECKBOX_BOX_SIZE * 0.52);
    ctx.lineTo(boxX + CHECKBOX_BOX_SIZE * 0.43, boxY + CHECKBOX_BOX_SIZE * 0.73);
    ctx.lineTo(boxX + CHECKBOX_BOX_SIZE * 0.78, boxY + CHECKBOX_BOX_SIZE * 0.29);
    ctx.stroke();
  }
  const textX = boxX + CHECKBOX_BOX_SIZE + TEXT_PADDING;
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, textX, y + height / 2, Math.max(0, x + width - TEXT_PADDING - textX));
  ctx.restore();
}

/**
 * スライダーを描く（淡い青の地、項目名と値の段、溝、つまみ）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{ x: number, y: number, width: number, height: number, label: string, text: string, textRow: { x: number, y: number, width: number, height: number }, track: { x: number, y: number, width: number, height: number }, knob: { x: number, y: number, width: number, height: number }, pressed: boolean }} info 部品の矩形・項目名・値の文字・各部の矩形・ドラッグ中か
 * @returns {void}
 */
function drawSlider(ctx, { x, y, width, height, label, text, textRow, track, knob, pressed }) {
  ctx.save();
  roundRectPath(ctx, x, y, width, height, CONTROL_RADIUS);
  ctx.fillStyle = CONTROL_FILL;
  ctx.fill();
  const maxWidth = (width - TEXT_PADDING * 3) / 2;
  const rowCenter = textRow.y + textRow.height / 2;
  ctx.font = FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText(label, x + TEXT_PADDING, rowCenter, maxWidth);
  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT_COLOR;
  ctx.fillText(text, x + width - TEXT_PADDING, rowCenter, maxWidth);
  const grooveRadius = track.height / 2;
  roundRectPath(ctx, track.x, track.y, track.width, track.height, grooveRadius);
  ctx.fillStyle = BUTTON_FILL_DISABLED;
  ctx.fill();
  const knobCx = knob.x + knob.width / 2;
  const knobCy = knob.y + knob.height / 2;
  const filled = Math.min(track.width, Math.max(0, knobCx - track.x));
  if (filled > 0) {
    roundRectPath(ctx, track.x, track.y, filled, track.height, Math.min(grooveRadius, filled / 2));
    ctx.fillStyle = BUTTON_FILL;
    ctx.fill();
  }
  const knobRadius = Math.min(knob.width, knob.height) / 2 - KNOB_RIM_WIDTH / 2;
  ctx.beginPath();
  ctx.arc(knobCx, knobCy, knobRadius, 0, Math.PI * 2);
  ctx.fillStyle = pressed ? CLOSE_FILL : ACCENT_COLOR;
  ctx.fill();
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = KNOB_RIM_WIDTH;
  ctx.stroke();
  ctx.restore();
}

/**
 * 設定画面の差し替えた見た目（Ui.createWindow の look に渡す。7種類だけ。渡さない種類は標準の見た目になる）。
 * @type {{ backdrop: Function, window: Function, titleBar: Function, closeButton: Function, button: Function, checkbox: Function, slider: Function }}
 */
export const SETTINGS_LOOK = {
  backdrop: drawBackdrop,
  window: drawWindow,
  titleBar: drawTitleBar,
  closeButton: drawCloseButton,
  button: drawButton,
  checkbox: drawCheckbox,
  slider: drawSlider,
};
