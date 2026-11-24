/**
 * 責務: 開発用パネルの雛形の窓の中身（窓の設定、「基本」の部品の並びと位置、値のつなぎ方、呼ぶ側の部品とタブの受け入れ）と開き方、
 * FPS の位置の選択肢と、FPS・速度の文字（土台も読む）。
 */
import { Engine, Ui } from 'oz';
import { openWindow } from './WindowScene.js';

/*
 * 開き方:
 *   開発用のキーやメニューの項目から openDevPanel({ layer: '（窓を描くレイヤー名）' }) を呼ぶ。
 *   開発モード（Engine.debug）でなければ何も起きない。入口（キーや項目）を開発モードのときだけ出すのは呼ぶ側で行う。
 *
 * 足し方:
 *   このファイルを書き換えずに、addParts と tabs で足す。どちらも省略できる。
 *   次の例の clearEnemies・enemies は例の名前である。
 *
 *   openDevPanel({
 *     layer: 'ui',
 *     addParts: (area, { x, y, width }) => {
 *       area.addButton({ x, y, width, label: '敵を消す', onPress: clearEnemies });
 *       area.addValue({ x, y: y + 100, width, label: '敵の数', read: () => enemies.length });
 *     },
 *     tabs: [
 *       {
 *         label: '音',
 *         build: (tab, rect) => {
 *           tab.addValue({ x: rect.x, y: rect.y, width: rect.width, label: 'BGM の音量', read: () => Sound.bgmVolume });
 *         },
 *       },
 *     ],
 *   });
 *
 *   部品の高さは既定で 88 なので、次の行は 100 ほど下に置く。rect に収まらない数なら tab.addScroll({ ...rect }) の中に置く
 *   （領域の中の位置は、領域の中身の左上が原点）。addParts・build は窓を作るときに呼ばれるので、部品を足すだけにし、
 *   シーンの操作をしない。
 *
 * 注意（速度の上書き）:
 *   ヒットストップなどで Engine.timeScale を自分で変えるゲームでは、パネルで選んだ速度がゲームの書き込みで上書きされる。
 *   この雛形はこれを解決しない。
 *
 * 注意（速度の効き方）:
 *   窓を開いている間は後ろの画面の更新が止まるので、速度の変更が動きに表れるのは窓を閉じた後である。
 *   停止を選んで閉じても入力は届くので、パネルを開き直して戻せる。選んだ状態は保存しない。
 *
 * 注意（パッド）:
 *   後ろの画面のパッドの配置が違うときの扱いは、WindowScene.js の説明（init の JSDoc）に従う。
 */

/**
 * @typedef {Object} PartsStart 「基本」の部品のすぐ下の、呼ぶ側の部品の始まり（領域の中身の左上が原点）
 * @property {number} x 部品の左端
 * @property {number} y 次の行の上端
 * @property {number} width 部品の幅
 */

/**
 * @typedef {Object} PartsRect 部品を置ける範囲（窓の内側の左上が原点）
 * @property {number} x 左端
 * @property {number} y 上端
 * @property {number} width 幅
 * @property {number} height 高さ
 */

/**
 * @typedef {Object} DevPanelTab 呼ぶ側が足すタブ
 * @property {string | (() => string)} label タブの名前（文字列か、文字列を返す関数。addTabs の labels の要素と同じ形）
 * @property {(tab: object, rect: PartsRect) => void} build タブの中身を作る関数。tab はそのタブのオブジェクト、rect は部品を置ける範囲
 */

/**
 * @typedef {Object} DevPanelOptions openDevPanel に渡すオプション
 * @property {string} layer 窓を描くレイヤー名
 * @property {(area: object, start: PartsStart) => void} [addParts] 「基本」に続けて部品を足す関数。area は「基本」のスクロールする領域のオブジェクト
 * @property {DevPanelTab[]} [tabs] 「基本」の右に足すタブ（配列の順に並ぶ）
 */

/** 窓のタイトル */
const PANEL_TITLE = '開発用パネル';
/** 窓の幅 */
const PANEL_WIDTH = 600;
/** 窓の高さ（タイトルバーを含む） */
const PANEL_HEIGHT = 600;

/** タブの列の上端（x は BODY.x、幅は BODY.width） */
const TAB_Y = 12;
/** タブの列の下の矩形（窓の内側の左上が原点。「基本」の領域と、足すタブの部品の範囲） */
const BODY = Object.freeze({ x: 24, y: 112, width: 552, height: 388 });

/** 領域の中の部品の左端（領域の中身の左上が原点） */
const PART_X = 12;
/** 領域の中の部品の幅（右端の 24 を空ける。内訳は手前 12 と位置の表示の帯 12） */
const PART_WIDTH = 516;
/** 領域の中の1行目の上端 */
const FIRST_Y = 12;
/** 部品の行の間隔（部品の高さ 88 と間 12） */
const ROW_STEP = 100;
/** 「基本」の部品の行数 */
const BASIC_ROWS = 6;

/** 文言 */
const LABEL_BASIC = '基本';
const LABEL_SHOW_FPS = 'FPS を表示する';
const LABEL_POSITION = '表示の位置';
const LABEL_FPS = 'FPS';
const LABEL_SPEED = '速度';
const LABEL_STOP = '停止';

/** FPS がまだ計れていないときの表示 */
const FPS_NONE_TEXT = '--';

/** FPS の表示位置の選択肢（順は左上・右上・右下・左下） */
export const FPS_POSITION_CHOICES = Object.freeze([
  Object.freeze({ label: '左上', value: 'top-left' }),
  Object.freeze({ label: '右上', value: 'top-right' }),
  Object.freeze({ label: '右下', value: 'bottom-right' }),
  Object.freeze({ label: '左下', value: 'bottom-left' }),
]);

/**
 * timeScale の値を表示の文字にする。
 * @param {number} value timeScale の値
 * @returns {string} 例: '×0.25'
 */
export function timeScaleText(value) {
  return `×${value}`;
}

/** 速度の選択肢（停止と、等速を含む4つの倍率） */
const SPEED_CHOICES = [
  { label: LABEL_STOP, value: 0 },
  ...[0.25, 0.5, 1, 2].map((value) => ({ label: timeScaleText(value), value })),
];

/**
 * 今の FPS の表示位置を文字にする。
 * @returns {string} 位置の選択肢の label（例: '左上'）
 */
export function fpsPositionText() {
  return FPS_POSITION_CHOICES.find((choice) => choice.value === Engine.fpsPosition).label;
}

/**
 * FPS の値を表示の文字にする。
 * @param {number | null} value Engine.fps の値
 * @returns {string} null なら '--'、それ以外は数値の文字
 */
export function fpsText(value) {
  return value === null ? FPS_NONE_TEXT : String(value);
}

/**
 * 「基本」の領域に、FPS と速度の部品（6行）を足す。
 * @param {{ addCheckbox: Function, addValue: Function, addChoices: Function }} area 「基本」のスクロールする領域のオブジェクト
 * @returns {PartsStart} 呼ぶ側の部品の始まり（6行の下）
 */
function addBasicParts(area) {
  /**
   * 部品の行番号から、その部品の置き場所（x・y・幅）を決める。
   * @param {number} row 行番号（0 が最初の行）
   * @returns {PartsStart} その行の部品の置き場所
   */
  const at = (row) => ({ x: PART_X, y: FIRST_Y + ROW_STEP * row, width: PART_WIDTH });

  area.addCheckbox({
    ...at(0),
    label: LABEL_SHOW_FPS,
    read: () => Engine.fpsVisible,
    write: (on) => {
      Engine.fpsVisible = on;
    },
  });
  area.addValue({
    ...at(1),
    label: LABEL_POSITION,
    read: fpsPositionText,
  });
  area.addChoices({
    ...at(2),
    choices: FPS_POSITION_CHOICES,
    read: () => Engine.fpsPosition,
    write: (value) => {
      Engine.fpsPosition = value;
    },
  });
  area.addValue({
    ...at(3),
    label: LABEL_FPS,
    read: () => Engine.fps,
    format: fpsText,
  });
  area.addValue({
    ...at(4),
    label: LABEL_SPEED,
    read: () => Engine.timeScale,
    format: timeScaleText,
  });
  area.addChoices({
    ...at(5),
    choices: SPEED_CHOICES,
    read: () => Engine.timeScale,
    write: (value) => {
      Engine.timeScale = value;
    },
  });

  return at(BASIC_ROWS);
}

/**
 * 開発用パネルの窓を作って返す。
 * @param {{ addParts?: (area: object, start: PartsStart) => void, tabs?: DevPanelTab[] }} options 呼ぶ側の部品とタブ
 * @returns {{ onPointer: (pointer: object) => void, draw: (ctx: CanvasRenderingContext2D) => void }} 窓の操作のオブジェクト
 */
function createDevPanelWindow({ addParts, tabs = [] }) {
  const win = Ui.createWindow({
    title: PANEL_TITLE,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    onClose: () => Engine.popScene(),
  });
  const [basicTab, ...addedTabs] = win.addTabs({
    x: BODY.x,
    y: TAB_Y,
    width: BODY.width,
    labels: [LABEL_BASIC, ...tabs.map((tab) => tab.label)],
  });
  const area = basicTab.addScroll({ ...BODY });
  const start = addBasicParts(area);
  if (addParts) addParts(area, start);
  tabs.forEach((tab, i) => tab.build(addedTabs[i], { ...BODY }));
  return win;
}

/**
 * 開発用パネルを開く（今の画面の上に積む。窓を閉じると元の画面に戻る）。開発モードでなければ何もしない。
 * @param {DevPanelOptions} options 窓を描くレイヤー名と、足す部品・タブ
 * @returns {void}
 */
export function openDevPanel({ layer, addParts, tabs }) {
  if (!Engine.debug) return;
  openWindow({ layer, createWindow: () => createDevPanelWindow({ addParts, tabs }) });
}
