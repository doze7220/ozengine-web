/**
 * 責務: メニューの画面（項目の縦の並べ方、項目ごとのボタンの登録、暗幕と項目の描画、キーでの選択）と開閉。
 * 項目の中身は呼ぶ側から受け取る。
 */
import { Engine, Scene } from 'oz';

/**
 * @typedef {{ width: number, height: number }} Screen 解像度
 */

/**
 * @typedef {Object} MenuItem メニューの項目
 * @property {string | (() => string)} label 表示する文字。関数なら描画のたびに呼び、今の状態を表示する（関数は状態を変えないこと）
 * @property {() => void} onSelect 押されたときに引数なしで呼ぶ関数
 * @property {string} [key] この項目を選ぶキー（KeyboardEvent.code）。省略可
 */

/**
 * @typedef {Object} MenuOptions MenuScene と openMenu に渡すオプション
 * @property {Screen} screen 解像度
 * @property {string} layer 暗幕と項目を描くレイヤー名
 * @property {MenuItem[]} items 項目の配列（コピーして持つ）
 */

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Rect 矩形（論理座標）
 */

/** 項目の幅（論理座標） */
const ITEM_WIDTH = 400;
/** 項目の高さ（論理座標） */
const ITEM_HEIGHT = 80;
/** 項目の間隔（論理座標） */
const ITEM_GAP = 24;
/** 暗幕の色 */
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.6)';
/** 項目の塗りの色 */
const BUTTON_FILL = 'rgba(255, 255, 255, 0.15)';
/** 項目の枠と文字の色 */
const BUTTON_COLOR = '#ffffff';
/** 項目の枠の太さ */
const BUTTON_LINE_WIDTH = 2;
/** 項目の文字のフォント */
const BUTTON_FONT = '32px sans-serif';

/**
 * メニューのボタンを描く（塗り、白い枠、中央の白い文字）。メニューを開くボタンの描画にも使える。
 * ctx の状態は変えない。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {Rect} rect ボタンの矩形（論理座標）
 * @param {string} text 表示する文字
 * @returns {void}
 */
export function drawMenuButton(ctx, rect, text) {
  ctx.save();
  ctx.fillStyle = BUTTON_FILL;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = BUTTON_COLOR;
  ctx.lineWidth = BUTTON_LINE_WIDTH;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = BUTTON_COLOR;
  ctx.font = BUTTON_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rect.x + rect.width / 2, rect.y + rect.height / 2);
  ctx.restore();
}

/** 項目を縦に並べるメニューのシーン。下のシーンの上に積まれ、積んでいる間は下のシーンの update が止まる */
export class MenuScene extends Scene {
  /**
   * @param {MenuOptions} options 解像度、描くレイヤー名、項目
   */
  constructor({ screen, layer, items }) {
    super();
    /** @type {Screen} 解像度 */
    this.screen = screen;
    /** @type {string} 暗幕と項目を描くレイヤー名 */
    this.layer = layer;
    /** @type {MenuItem[]} 項目（コピー） */
    this.items = [...items];
    /** @type {Rect[]} 項目ごとの矩形。items と同じ順。init で求める */
    this.rects = [];
  }

  /**
   * 項目の矩形を画面の中央に縦に並べて求め、項目ごとに画面のボタンを登録する。
   * @returns {void}
   */
  init() {
    const count = this.items.length;
    const total = count * ITEM_HEIGHT + Math.max(0, count - 1) * ITEM_GAP;
    const left = (this.screen.width - ITEM_WIDTH) / 2;
    const top = (this.screen.height - total) / 2;
    this.rects = this.items.map((item, i) => {
      const rect = { x: left, y: top + i * (ITEM_HEIGHT + ITEM_GAP), width: ITEM_WIDTH, height: ITEM_HEIGHT };
      Engine.addButton(this, { ...rect, onPress: () => item.onSelect() });
      return rect;
    });
  }

  /**
   * key が一致する最初の項目を選ぶ。
   * @param {string} code 押されたキーのコード
   * @returns {void}
   */
  onKeyDown(code) {
    const item = this.items.find((it) => it.key === code);
    if (item) item.onSelect();
  }

  /**
   * 指定のレイヤーに、画面全体の暗幕と各項目を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @returns {void}
   */
  draw(ctx, layer) {
    if (layer !== this.layer) return;
    ctx.save();
    ctx.fillStyle = OVERLAY_COLOR;
    ctx.fillRect(0, 0, this.screen.width, this.screen.height);
    ctx.restore();
    this.items.forEach((item, i) => {
      const text = typeof item.label === 'function' ? item.label() : item.label;
      drawMenuButton(ctx, this.rects[i], text);
    });
  }
}

/**
 * メニューを最前面に積んで開く。
 * @param {MenuOptions} options 解像度、描くレイヤー名、項目
 * @returns {void}
 */
export function openMenu(options) {
  Engine.pushScene(new MenuScene(options));
}

/**
 * メニューを閉じる（最前面のシーンを外す）。メニューが最前面のとき、項目の onSelect から呼ぶ。
 * @returns {void}
 */
export function closeMenu() {
  Engine.popScene();
}
