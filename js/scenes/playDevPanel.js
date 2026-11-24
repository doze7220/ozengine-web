/**
 * 責務: 土台の開発用パネルの窓の中身（窓の設定、タブと部品の並びと位置、値のつなぎ方）と開き方。
 */
/* ozengine sample */
import { Engine, Sound, Ui } from 'oz';
import { openWindow } from './WindowScene.js';
import { isSlow, setSlow, resetSlow } from './slow.js';
import { isMuted } from './soundSettings.js';
import { FPS_POSITION_CHOICES, fpsPositionText, fpsStatusText } from './fps.js';

/** 窓を描くレイヤー名 */
const PANEL_LAYER = 'ui';
/** 窓のタイトル */
const PANEL_TITLE = '開発用パネル';
/** 窓の幅 */
const PANEL_WIDTH = 600;
/** 窓の高さ（タイトルバーを含む） */
const PANEL_HEIGHT = 600;

/** 部品の左端（窓の内側の左上が原点） */
const PART_X = 24;
/** 部品の幅 */
const PART_WIDTH = 552;
/** タブの列の上端 */
const TAB_Y = 12;
/** タブの下に置く部品の1行目の上端 */
const ROW_Y = 112;
/** 部品の行の間隔（部品の高さ 88 と間 12） */
const ROW_STEP = 100;
/** タブ「情報」の領域の高さ */
const INFO_HEIGHT = 388;

/** タブの名前（左から FPS・時間・情報） */
const TAB_LABELS = ['FPS', '時間', '情報'];

/** 領域の中の部品の左端（領域の中身の左上が原点） */
const INFO_X = 12;
/** 領域の中の部品の幅（右端の 24 を空ける。内訳は手前 12 と位置の表示の帯 12） */
const INFO_WIDTH = 516;
/** 領域の中の1つめの部品の上端 */
const INFO_FIRST_Y = 12;

/** 文言 */
const LABEL_SHOW_FPS = 'FPS を表示する';
const LABEL_POSITION = '表示の位置';
const LABEL_FPS = 'FPS';
const LABEL_SLOW = 'スロー';
const LABEL_TIME_SCALE = 'timeScale';
const LABEL_RESET_SLOW = '等速に戻す';
const LABEL_FPS_STATUS = 'FPS の表示';
const LABEL_MUTE = 'ミュート';
const LABEL_BGM = 'BGM の音量';
const LABEL_SE = '効果音の音量';
const LABEL_SCREEN = '画面の大きさ';

/** FPS がまだ計れていないときの表示 */
const FPS_NONE_TEXT = '--';
/** ON の表示 */
const ON_TEXT = 'ON';
/** OFF の表示 */
const OFF_TEXT = 'OFF';

/**
 * FPS の値を表示の文字にする。
 * @param {number | null} value Engine.fps の値
 * @returns {string} null なら '--'、それ以外は数値の文字
 */
function fpsText(value) {
  return value === null ? FPS_NONE_TEXT : String(value);
}

/**
 * 真偽を 'ON'・'OFF' の文字にする。
 * @param {boolean} value 真偽
 * @returns {string} 'ON' か 'OFF'
 */
function onOffText(value) {
  return value ? ON_TEXT : OFF_TEXT;
}

/**
 * 0〜1 の音量を百分率の文字にする。
 * @param {number} value 音量
 * @returns {string} 例: '50%'
 */
function percentText(value) {
  return `${Math.round(value * 100)}%`;
}

/**
 * 開発用パネルの窓を作って返す。
 * @param {{ width: number, height: number }} screen 画面の大きさ（論理解像度）
 * @returns {{ onPointer: (pointer: object) => void, draw: (ctx: CanvasRenderingContext2D) => void }} 窓の操作のオブジェクト
 */
function createDevPanelWindow(screen) {
  const win = Ui.createWindow({
    title: PANEL_TITLE,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    onClose: () => Engine.popScene(),
  });
  const [fpsTab, timeTab, infoTab] = win.addTabs({
    x: PART_X,
    y: TAB_Y,
    width: PART_WIDTH,
    labels: TAB_LABELS,
  });

  fpsTab.addCheckbox({
    x: PART_X,
    y: ROW_Y,
    width: PART_WIDTH,
    label: LABEL_SHOW_FPS,
    read: () => Engine.fpsVisible,
    write: (on) => {
      Engine.fpsVisible = on;
    },
  });
  fpsTab.addValue({
    x: PART_X,
    y: ROW_Y + ROW_STEP,
    width: PART_WIDTH,
    label: LABEL_POSITION,
    read: fpsPositionText,
  });
  fpsTab.addChoices({
    x: PART_X,
    y: ROW_Y + ROW_STEP * 2,
    width: PART_WIDTH,
    choices: FPS_POSITION_CHOICES,
    read: () => Engine.fpsPosition,
    write: (value) => {
      Engine.fpsPosition = value;
    },
  });
  fpsTab.addValue({
    x: PART_X,
    y: ROW_Y + ROW_STEP * 3,
    width: PART_WIDTH,
    label: LABEL_FPS,
    read: () => Engine.fps,
    format: fpsText,
  });

  timeTab.addCheckbox({
    x: PART_X,
    y: ROW_Y,
    width: PART_WIDTH,
    label: LABEL_SLOW,
    read: isSlow,
    write: setSlow,
  });
  timeTab.addValue({
    x: PART_X,
    y: ROW_Y + ROW_STEP,
    width: PART_WIDTH,
    label: LABEL_TIME_SCALE,
    read: () => Engine.timeScale,
  });
  timeTab.addButton({
    x: PART_X,
    y: ROW_Y + ROW_STEP * 2,
    width: PART_WIDTH,
    label: LABEL_RESET_SLOW,
    onPress: resetSlow,
  });

  const info = infoTab.addScroll({
    x: PART_X,
    y: ROW_Y,
    width: PART_WIDTH,
    height: INFO_HEIGHT,
  });
  /** 領域の中の表示（上から順。項目名・読む関数・文字の整え方） */
  const rows = [
    { label: LABEL_FPS, read: () => Engine.fps, format: fpsText },
    { label: LABEL_FPS_STATUS, read: fpsStatusText },
    { label: LABEL_SLOW, read: isSlow, format: onOffText },
    { label: LABEL_TIME_SCALE, read: () => Engine.timeScale },
    { label: LABEL_MUTE, read: isMuted, format: onOffText },
    { label: LABEL_BGM, read: () => Sound.bgmVolume, format: percentText },
    { label: LABEL_SE, read: () => Sound.seVolume, format: percentText },
    { label: LABEL_SCREEN, read: () => `${screen.width} × ${screen.height}` },
  ];
  rows.forEach((row, i) => {
    info.addValue({
      x: INFO_X,
      y: INFO_FIRST_Y + ROW_STEP * i,
      width: INFO_WIDTH,
      label: row.label,
      read: row.read,
      ...(row.format ? { format: row.format } : {}),
    });
  });

  return win;
}

/**
 * 開発用パネルを開く（今の画面の上に積む。窓を閉じるとプレイ画面に戻る）。
 * @param {{ width: number, height: number }} screen 画面の大きさ（論理解像度。「画面の大きさ」の表示に使う）
 * @returns {void}
 */
export function openPlayDevPanel(screen) {
  openWindow({ layer: PANEL_LAYER, createWindow: () => createDevPanelWindow(screen) });
}
