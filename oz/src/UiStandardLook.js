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

/** チェックボックスの箱の一辺。 */
const CHECKBOX_BOX_SIZE = 44;

/** チェックボックスのレ点の線の太さ。 */
const CHECK_MARK_WIDTH = 5;

/** スライダーの溝の色。 */
const SLIDER_GROOVE_COLOR = '#606060';

/** スライダーのつまみの地の色。 */
const SLIDER_KNOB_FILL = '#c0c0c0';

/** スライダーのつまみの枠の太さ（ドラッグ中は太くする）。 */
const SLIDER_KNOB_BORDER = 2;

/** スライダーのドラッグ中のつまみの枠の太さ。 */
const SLIDER_KNOB_BORDER_DRAGGING = 4;

/** 選ばれている選択肢の文字の色。 */
const CHOICE_SELECTED_TEXT = '#202020';

/** 選ばれていて押されている選択肢の地の色。 */
const CHOICE_SELECTED_PRESSED_FILL = '#c0c0c0';

/** 選ばれていないタブの文字の色。 */
const TAB_TEXT_COLOR = '#c0c0c0';

/** 選ばれているタブの下端の帯の太さ。 */
const TAB_SELECTED_BAR_HEIGHT = 6;

/** スクロールする領域の地の色。 */
const SCROLL_FILL = '#181818';

/** スクロールする領域の枠の色。 */
const SCROLL_STROKE = '#606060';

/** スクロールの位置の表示の帯の色。 */
const SCROLL_BAR_TRACK_FILL = 'rgba(255, 255, 255, 0.15)';

/** スクロールの位置の表示のつまみの色。 */
const SCROLL_BAR_THUMB_FILL = '#c0c0c0';

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
 * チェックボックスを描く（全体がボタンと同じ地と枠、左に箱、入りならレ点、右に項目名）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,label:string,checked:boolean,pressed:boolean,textSize:number}} info チェックボックスの情報
 * @returns {void}
 */
function drawCheckbox(ctx, info) {
  ctx.save();
  ctx.fillStyle = info.pressed ? PRESSED_FILL : BUTTON_FILL;
  ctx.fillRect(info.x, info.y, info.width, info.height);
  strokeInside(ctx, info, WHITE);
  const bx = info.x + TEXT_MARGIN;
  const by = info.y + (info.height - CHECKBOX_BOX_SIZE) / 2;
  strokeInside(ctx, { x: bx, y: by, width: CHECKBOX_BOX_SIZE, height: CHECKBOX_BOX_SIZE }, WHITE);
  if (info.checked) {
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = CHECK_MARK_WIDTH;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(bx + CHECKBOX_BOX_SIZE * 0.2, by + CHECKBOX_BOX_SIZE * 0.52);
    ctx.lineTo(bx + CHECKBOX_BOX_SIZE * 0.42, by + CHECKBOX_BOX_SIZE * 0.74);
    ctx.lineTo(bx + CHECKBOX_BOX_SIZE * 0.8, by + CHECKBOX_BOX_SIZE * 0.28);
    ctx.stroke();
  }
  const tx = bx + CHECKBOX_BOX_SIZE + TEXT_MARGIN;
  ctx.fillStyle = WHITE;
  ctx.font = `${info.textSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    info.label,
    tx,
    info.y + info.height / 2,
    Math.max(0, info.x + info.width - TEXT_MARGIN - tx),
  );
  ctx.restore();
}

/**
 * スライダーを描く（文字の段に項目名と値の文字、溝、溝の左端からつまみまでの塗り、つまみ）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,label:string,text:string,textRow:LookRect,track:LookRect,knob:LookRect,pressed:boolean,textSize:number}} info スライダーの情報
 * @returns {void}
 */
function drawSlider(ctx, info) {
  ctx.save();
  ctx.fillStyle = VALUE_FILL;
  ctx.fillRect(info.x, info.y, info.width, info.height);
  const maxWidth = Math.max(0, (info.width - TEXT_MARGIN * 3) / 2);
  const cy = info.textRow.y + info.textRow.height / 2;
  ctx.font = `${info.textSize}px sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = VALUE_LABEL_COLOR;
  ctx.fillText(info.label, info.x + TEXT_MARGIN, cy, maxWidth);
  ctx.textAlign = 'right';
  ctx.fillStyle = WHITE;
  ctx.fillText(info.text, info.x + info.width - TEXT_MARGIN, cy, maxWidth);
  const t = info.track;
  ctx.fillStyle = SLIDER_GROOVE_COLOR;
  ctx.fillRect(t.x, t.y, t.width, t.height);
  const knobCenter = info.knob.x + info.knob.width / 2;
  ctx.fillStyle = WHITE;
  ctx.fillRect(t.x, t.y, Math.max(0, knobCenter - t.x), t.height);
  const k = info.knob;
  ctx.fillStyle = info.pressed ? WHITE : SLIDER_KNOB_FILL;
  ctx.fillRect(k.x, k.y, k.width, k.height);
  const border = info.pressed ? SLIDER_KNOB_BORDER_DRAGGING : SLIDER_KNOB_BORDER;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = border;
  ctx.strokeRect(k.x + border / 2, k.y + border / 2, k.width - border, k.height - border);
  ctx.restore();
}

/**
 * 選択肢の列を描く（選択肢ごとにボタンと同じ地・枠・文字。選ばれているものは地と文字の色を反転する）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{choices:Array<{x:number,y:number,width:number,height:number,label:string,selected:boolean,pressed:boolean}>,textSize:number}} info 選択肢の列の情報
 * @returns {void}
 */
function drawChoices(ctx, info) {
  ctx.save();
  ctx.font = `${info.textSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const c of info.choices) {
    let fill;
    if (c.selected) {
      fill = c.pressed ? CHOICE_SELECTED_PRESSED_FILL : WHITE;
    } else {
      fill = c.pressed ? PRESSED_FILL : BUTTON_FILL;
    }
    ctx.fillStyle = fill;
    ctx.fillRect(c.x, c.y, c.width, c.height);
    strokeInside(ctx, c, WHITE);
    ctx.fillStyle = c.selected ? CHOICE_SELECTED_TEXT : WHITE;
    ctx.fillText(
      c.label,
      c.x + c.width / 2,
      c.y + c.height / 2,
      Math.max(0, c.width - TEXT_MARGIN * 2),
    );
  }
  ctx.restore();
}

/**
 * タブの列を描く（タブごとに地・枠・文字。選ばれているものは窓の地と同じ地・白の文字・下端の帯）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,tabs:Array<{x:number,y:number,width:number,height:number,label:string,selected:boolean,pressed:boolean}>,textSize:number}} info タブの列の情報
 * @returns {void}
 */
function drawTabs(ctx, info) {
  ctx.save();
  ctx.font = `${info.textSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of info.tabs) {
    if (t.pressed) {
      ctx.fillStyle = PRESSED_FILL;
    } else {
      ctx.fillStyle = t.selected ? WINDOW_FILL : BUTTON_FILL;
    }
    ctx.fillRect(t.x, t.y, t.width, t.height);
    if (t.selected) {
      ctx.fillStyle = WHITE;
      ctx.fillRect(
        t.x,
        t.y + t.height - BORDER_WIDTH - TAB_SELECTED_BAR_HEIGHT,
        t.width,
        TAB_SELECTED_BAR_HEIGHT,
      );
    }
    strokeInside(ctx, t, WHITE);
    ctx.fillStyle = t.selected ? WHITE : TAB_TEXT_COLOR;
    ctx.fillText(
      t.label,
      t.x + t.width / 2,
      t.y + t.height / 2,
      Math.max(0, t.width - TEXT_MARGIN * 2),
    );
  }
  ctx.restore();
}

/**
 * スクロールする領域の地と枠を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,scrollY:number,contentHeight:number,scrollable:boolean,dragging:boolean,textSize:number}} info 領域の情報
 * @returns {void}
 */
function drawScroll(ctx, info) {
  ctx.save();
  ctx.fillStyle = SCROLL_FILL;
  ctx.fillRect(info.x, info.y, info.width, info.height);
  strokeInside(ctx, info, SCROLL_STROKE);
  ctx.restore();
}

/**
 * スクロールの位置の表示（帯とつまみ）を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {{x:number,y:number,width:number,height:number,thumb:LookRect,scrollY:number,contentHeight:number,dragging:boolean}} info 位置の表示の情報
 * @returns {void}
 */
function drawScrollBar(ctx, info) {
  ctx.save();
  ctx.fillStyle = SCROLL_BAR_TRACK_FILL;
  ctx.fillRect(info.x, info.y, info.width, info.height);
  const t = info.thumb;
  ctx.fillStyle = info.dragging ? WHITE : SCROLL_BAR_THUMB_FILL;
  ctx.fillRect(t.x, t.y, t.width, t.height);
  ctx.restore();
}

/**
 * 標準の見た目: 部品の種類の名前 → 描く関数 (ctx, info) => void。
 * @type {Readonly<Record<'backdrop'|'window'|'titleBar'|'closeButton'|'button'|'value'|'checkbox'|'slider'|'choices'|'tabs'|'scroll'|'scrollBar', function(CanvasRenderingContext2D, Object): void>>}
 */
export const STANDARD_LOOK = Object.freeze({
  backdrop: drawBackdrop,
  window: drawWindow,
  titleBar: drawTitleBar,
  closeButton: drawCloseButton,
  button: drawButton,
  value: drawValue,
  checkbox: drawCheckbox,
  slider: drawSlider,
  choices: drawChoices,
  tabs: drawTabs,
  scroll: drawScroll,
  scrollBar: drawScrollBar,
});
