/**
 * 責務: 土台の開発用パネルの項目（「基本」に足す部品、タブ「情報」の中身）と、レイヤー名を指定した開き方。
 * 窓と「基本」は devPanel.js が持つ。
 */
/* ozengine sample */
import { Engine, Sound } from 'oz';
import { LAYER } from '../names.js';
import { openDevPanel, fpsText } from './devPanel.js';
import { resetSlow } from './slow.js';
import { isMuted } from './soundSettings.js';
import { fpsStatusText } from './fps.js';

/** 窓を描くレイヤー名 */
const PANEL_LAYER = LAYER.ui;

/** 行の間隔（部品の高さ 88 と間 12） */
const ROW_STEP = 100;
/** 領域の中の部品の左端（領域の中身の左上が原点） */
const INFO_X = 12;
/** 領域の中の1つめの部品の上端 */
const INFO_FIRST_Y = 12;
/** 領域の中の部品の右側に空ける幅（右端の 24 と、部品の左の 12 を合わせて、範囲の幅から引く） */
const INFO_MARGIN = 36;

/** 文言 */
const LABEL_INFO = '情報';
const LABEL_RESET_SLOW = '等速に戻す';
const LABEL_FPS = 'FPS';
const LABEL_FPS_STATUS = 'FPS の表示';
const LABEL_TIME_SCALE = 'timeScale';
const LABEL_MUTE = 'ミュート';
const LABEL_BGM = 'BGM の音量';
const LABEL_SE = '効果音の音量';
const LABEL_SCREEN = '画面の大きさ';

/** ON の表示 */
const ON_TEXT = 'ON';
/** OFF の表示 */
const OFF_TEXT = 'OFF';

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
 * タブ「情報」の中身（表示の行）を足す。
 * @param {{ addScroll: (options: object) => { addValue: (options: object) => void } }} tab 「情報」のタブのオブジェクト
 * @param {{ x: number, y: number, width: number, height: number }} rect 部品を置ける範囲
 * @param {{ width: number, height: number }} screen 画面の大きさ（論理解像度。「画面の大きさ」の表示に使う）
 * @returns {void}
 */
function buildInfoTab(tab, rect, screen) {
  const info = tab.addScroll({ ...rect });
  /** 領域の中の表示（上から順。項目名・読む関数・文字の整え方） */
  const rows = [
    { label: LABEL_FPS, read: () => Engine.fps, format: fpsText },
    { label: LABEL_FPS_STATUS, read: fpsStatusText },
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
      width: rect.width - INFO_MARGIN,
      label: row.label,
      read: row.read,
      ...(row.format ? { format: row.format } : {}),
    });
  });
}

/**
 * 開発用パネルを開く（今の画面の上に積む。窓を閉じるとプレイ画面に戻る）。
 * 雛形の「基本」に、「等速に戻す」のボタンとタブ「情報」を足す。開発モードでなければ何も起きない。
 * @param {{ width: number, height: number }} screen 画面の大きさ（論理解像度。「画面の大きさ」の表示に使う）
 * @returns {void}
 */
export function openPlayDevPanel(screen) {
  openDevPanel({
    layer: PANEL_LAYER,
    addParts: (area, start) => area.addButton({ ...start, label: LABEL_RESET_SLOW, onPress: resetSlow }),
    tabs: [{ label: LABEL_INFO, build: (tab, rect) => buildInfoTab(tab, rect, screen) }],
  });
}
