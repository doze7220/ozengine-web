/**
 * 責務: 標準の見た目（単色の塗り・枠・文字）で、UI 部品の種類ごとに1つを描く関数を提供する。
 * 画像・フォントの読み込み、状態の変更、ゲーム固有の値は持たず、何も import しない。
 */

/** 暗幕の色。 */
const BACKDROP_COLOR = 'rgba(0, 0, 0, 0.6)';

/** 窓の地の色。 */
const WINDOW_FILL = '#202020';

/** 枠と文字の標準の色（白）。 */
const WHITE = '#ffffff';

/** 窓・ボタンの枠の太さ。 */
const BORDER_WIDTH = 2;

/** タイトルバーの地の色。 */
const TITLE_BAR_FILL = '#404040';

/** 文字の左右の余白。 */
const TEXT_MARGIN = 16;

/** 閉じるボタンの「×」の線の太さ。 */
const CLOSE_LINE_WIDTH = 4;

/** 閉じるボタンの「×」の大きさ（正方形の一辺に対する割合）。 */
const CLOSE_MARK_RATIO = 0.4;

/** 押されている部品の地の色。 */
const PRESSED_FILL = '#808080';

/** 押せるボタンの地の色。 */
const BUTTON_FILL = '#404040';

/** 押せないボタンの地の色。 */
const DISABLED_FILL = '#2a2a2a';

/** 押せないボタンの枠の色。 */
const DISABLED_STROKE = '#606060';

/** 押せないボタンの文字の色。 */
const DISABLED_TEXT = '#707070';

/** 数値・文字の表示の地の色。 */
const VALUE_FILL = 'rgba(255, 255, 255, 0.08)';

/** 数値・文字の表示の項目名の色。 */
const VALUE_LABEL_COLOR = '#c0c0c0';

/**
 * 矩形の情報。
 * @typedef {Object} LookRect
 * @property {number} x 左端（画面の論理座標）
 * @property {number} y 上端
 * @property {number} width 幅
 * @property {number} height 高さ
 */

/**
 * 枠を線の太さの半分だけ内側に描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {LookRect} r 矩形
 * @param {string} color 枠の色
 * @returns {void}
 */
function strokeInside(ctx, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = BORDER_WIDTH;
  const h = BORDER_WIDTH / 2;
  ctx.strokeRect(r.x + h, r.y + h, r.width - BORDER_WIDTH, r.height - BORDER_WIDTH);
}

/**
 * 暗幕を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number}} info 暗幕の情報
 * @returns {void}
 */
function drawBackdrop(ctx, info) {
  ctx.save();
  ctx.fillStyle = BACKDROP_COLOR;
  ctx.fillRect(info.x, info.y, info.width, info.height);
  ctx.restore();
}

/**
 * 窓の地と枠を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,title:string,textSize:number}} info 窓の情報
 * @returns {void}
 */
function drawWindow(ctx, info) {
  ctx.save();
  ctx.fillStyle = WINDOW_FILL;
  ctx.fillRect(info.x, info.y, info.width, info.height);
  strokeInside(ctx, info, WHITE);
  ctx.restore();
}

/**
 * タイトルバーの地とタイトルの文字を描く（窓の枠は隠さない）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,title:string,textSize:number}} info タイトルバーの情報
 * @returns {void}
 */
function drawTitleBar(ctx, info) {
  ctx.save();
  ctx.fillStyle = TITLE_BAR_FILL;
  ctx.fillRect(
    info.x + BORDER_WIDTH,
    info.y + BORDER_WIDTH,
    info.width - BORDER_WIDTH * 2,
    info.height - BORDER_WIDTH,
  );
  ctx.fillStyle = WHITE;
  ctx.font = `${info.textSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    info.title,
    info.x + TEXT_MARGIN,
    info.y + info.height / 2,
    Math.max(0, info.width - info.height - TEXT_MARGIN * 2),
  );
  ctx.restore();
}

/**
 * 閉じるボタン（押されていれば地、「×」は2本の線）を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,pressed:boolean,textSize:number}} info 閉じるボタンの情報
 * @returns {void}
 */
function drawCloseButton(ctx, info) {
  ctx.save();
  if (info.pressed) {
    ctx.fillStyle = PRESSED_FILL;
    ctx.fillRect(info.x, info.y, info.width, info.height);
  }
  const cx = info.x + info.width / 2;
  const cy = info.y + info.height / 2;
  const half = (Math.min(info.width, info.height) * CLOSE_MARK_RATIO) / 2;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = CLOSE_LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(cx - half, cy - half);
  ctx.lineTo(cx + half, cy + half);
  ctx.moveTo(cx + half, cy - half);
  ctx.lineTo(cx - half, cy + half);
  ctx.stroke();
  ctx.restore();
}

/**
 * 部品のボタンを描く（押せるとき・押せないときで色が変わる）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,label:string,pressed:boolean,enabled:boolean,textSize:number}} info ボタンの情報
 * @returns {void}
 */
function drawButton(ctx, info) {
  ctx.save();
  let fill;
  let stroke;
  let text;
  if (info.enabled) {
    fill = info.pressed ? PRESSED_FILL : BUTTON_FILL;
    stroke = WHITE;
    text = WHITE;
  } else {
    fill = DISABLED_FILL;
    stroke = DISABLED_STROKE;
    text = DISABLED_TEXT;
  }
  ctx.fillStyle = fill;
  ctx.fillRect(info.x, info.y, info.width, info.height);
  strokeInside(ctx, info, stroke);
  ctx.fillStyle = text;
  ctx.font = `${info.textSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    info.label,
    info.x + info.width / 2,
    info.y + info.height / 2,
    Math.max(0, info.width - TEXT_MARGIN * 2),
  );
  ctx.restore();
}

/**
 * 数値・文字の表示を描く（項目名は左寄せ、値は右寄せ）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,label:string,value:*,text:string,textSize:number}} info 表示の情報
 * @returns {void}
 */
function drawValue(ctx, info) {
  ctx.save();
  ctx.fillStyle = VALUE_FILL;
  ctx.fillRect(info.x, info.y, info.width, info.height);
  const maxWidth = Math.max(0, (info.width - TEXT_MARGIN * 3) / 2);
  const cy = info.y + info.height / 2;
  ctx.font = `${info.textSize}px sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = VALUE_LABEL_COLOR;
  ctx.fillText(info.label, info.x + TEXT_MARGIN, cy, maxWidth);
  ctx.textAlign = 'right';
  ctx.fillStyle = WHITE;
  ctx.fillText(info.text, info.x + info.width - TEXT_MARGIN, cy, maxWidth);
  ctx.restore();
}

/**
 * 標準の見た目: 部品の種類の名前 → 描く関数 (ctx, info) => void。
 * @type {Readonly<Record<'backdrop'|'window'|'titleBar'|'closeButton'|'button'|'value', function(CanvasRenderingContext2D, Object): void>>}
 */
export const STANDARD_LOOK = Object.freeze({
  backdrop: drawBackdrop,
  window: drawWindow,
  titleBar: drawTitleBar,
  closeButton: drawCloseButton,
  button: drawButton,
  value: drawValue,
});
