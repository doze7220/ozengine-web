/**
 * 責務: タブとスクロールの見本の窓の中身（2種類の窓の設定、部品の並びと位置、値のつなぎ方、見本の中だけで持つ押した数）。
 */
/* ozengine sample */
import { Engine, Sound, Ui } from 'oz';
import { SAMPLE_LOOK } from './uiSampleLook.js';
import { isSlow, setSlow } from './slow.js';
import { isMuted, setMuted } from './mute.js';
import { FPS_CHOICES, readFpsChoice, writeFpsChoice } from './fps.js';

/**
 * @typedef {'standard' | 'custom'} TabSampleStyle 見本の窓の種類（標準の見た目か、差し替えた見た目）
 */

/**
 * @typedef {object} TabSampleActions 見本の窓のボタンから呼ぶ操作（利用側が渡す）
 * @property {() => void} backToFirst 「最初の見本へ」を押したときに呼ぶ
 * @property {() => void} switchLook 「見た目を切り替える」を押したときに呼ぶ
 */

/** 窓の幅（論理座標） */
const WINDOW_WIDTH = 600;
/** 窓の高さ（タイトルバーを含む。論理座標。内側は 620） */
const WINDOW_HEIGHT = 708;
/** 窓の部品の左端・領域の左端（窓の内側の左上が原点） */
const LEFT_X = 24;
/** 右の列のボタンの左端 */
const RIGHT_X = 312;
/** 下のボタンの幅 */
const BUTTON_WIDTH = 264;
/** 窓の部品の幅 */
const FULL_WIDTH = 552;
/** タブの列の上端 */
const TABS_Y = 12;
/** 領域・「表示」タブの部品の最初の上端 */
const AREA_Y = 108;
/** スクロールする領域の高さ */
const AREA_HEIGHT = 312;
/** 「表示」タブの数値の表示の高さ */
const VIEW_VALUE_HEIGHT = 72;
/** 「表示」タブの数値の表示の上端（FPS） */
const VIEW_FPS_Y = 108;
/** 「表示」タブの数値の表示の上端（スロー） */
const VIEW_SLOW_Y = 188;
/** 「表示」タブの数値の表示の上端（BGM の音量） */
const VIEW_BGM_Y = 268;
/** 「表示」タブの数値の表示の上端（効果音の音量） */
const VIEW_SE_Y = 348;
/** 「押した数」の上端 */
const COUNT_Y = 428;
/** 下のボタンの上端 */
const BUTTON_Y = 524;

/** 領域の中の部品の左端（領域の中身の左上が原点） */
const INNER_X = 12;
/** 領域の中の部品の幅（領域の幅 552 のうち、左の余白 12 を除き、右端の 36 を空ける。内訳は帯の手前 24 と位置の表示の帯 12） */
const INNER_WIDTH = 504;
/** 領域の中: チェックボックス「スロー」の上端 */
const INNER_SLOW_Y = 12;
/** 領域の中: チェックボックス「ミュート」の上端 */
const INNER_MUTE_Y = 108;
/** 領域の中: スライダー「BGM の音量」の上端 */
const INNER_BGM_Y = 204;
/** 領域の中: スライダー「効果音の音量」の上端 */
const INNER_SE_Y = 344;
/** 領域の中: 「FPS の表示」の見出しの上端 */
const INNER_FPS_VALUE_Y = 484;
/** 領域の中: 見出しの高さ */
const INNER_HEADING_HEIGHT = 48;
/** 領域の中: FPS の選択肢の列の上端 */
const INNER_FPS_CHOICES_Y = 540;
/** 領域の中: ボタン「1 足す」の上端 */
const INNER_ADD1_Y = 636;
/** 領域の中: ボタン「10 足す」の上端 */
const INNER_ADD10_Y = 732;
/** 領域の中: ボタン「0 に戻す」の上端 */
const INNER_RESET_Y = 828;

/** 標準の見た目の窓のタイトル */
const STANDARD_TITLE = 'タブとスクロールの見本（標準）';
/** 差し替えた見た目の窓のタイトル */
const CUSTOM_TITLE = 'タブとスクロールの見本（差し替え）';
/** タブの名前 */
const TAB_LABELS = ['スクロール', '表示'];
/** スローの項目名 */
const SLOW_LABEL = 'スロー';
/** ミュートの項目名 */
const MUTE_LABEL = 'ミュート';
/** FPS の項目名 */
const FPS_LABEL = 'FPS';
/** FPS の表示の見出し */
const FPS_HEADING_LABEL = 'FPS の表示';
/** FPS がまだ分からないときの表示 */
const FPS_UNKNOWN_TEXT = '--';
/** BGM の音量の項目名 */
const BGM_LABEL = 'BGM の音量';
/** 効果音の音量の項目名 */
const SE_LABEL = '効果音の音量';
/** 押した数の項目名 */
const COUNT_LABEL = '押した数';
/** ボタン「1 足す」の文言 */
const ADD1_LABEL = '1 足す';
/** ボタン「10 足す」の文言 */
const ADD10_LABEL = '10 足す';
/** ボタン「0 に戻す」の文言 */
const RESET_LABEL = '0 に戻す';
/** 最初の見本へ戻るボタンの文言 */
const BACK_LABEL = '最初の見本へ';
/** 見た目を切り替えるボタンの文言 */
const SWITCH_LOOK_LABEL = '見た目を切り替える';
/** 音量の最小 */
const VOLUME_MIN = 0;
/** 音量の最大 */
const VOLUME_MAX = 1;
/** 音量の刻み */
const VOLUME_STEP = 0.1;
/** 「10 足す」で増える数 */
const ADD_MANY = 10;

/** 押した数（見本の中だけで持つ。窓を開き直しても保たれる） */
let pressCount = 0;

/**
 * FPS の値を表示の文字にする。
 * @param {number | null} v Engine.fps の値
 * @returns {string} 表示の文字
 */
function formatFps(v) {
  return v === null ? FPS_UNKNOWN_TEXT : String(v);
}

/**
 * 音量（0〜1）を百分率の文字にする。
 * @param {number} v 音量
 * @returns {string} 表示の文字
 */
function formatVolume(v) {
  return Math.round(v * 100) + '%';
}

/**
 * タブとスクロールの見本の窓を作り、部品を足して返す。
 * @param {TabSampleStyle} style 'standard'（標準の見た目。外を押すと閉じる）か 'custom'（差し替えた見た目。閉じるボタンでだけ閉じる）
 * @param {TabSampleActions} actions ボタンから呼ぶ操作
 * @returns {{ addButton: Function, addValue: Function, addCheckbox: Function, addSlider: Function, addChoices: Function, addTabs: Function, addScroll: Function, onPointer: (pointer: object) => void, draw: (ctx: CanvasRenderingContext2D) => void }} 窓の操作のオブジェクト
 */
export function createTabSampleWindow(style, actions) {
  const custom = style === 'custom';
  const win = Ui.createWindow({
    title: custom ? CUSTOM_TITLE : STANDARD_TITLE,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    onClose: () => Engine.popScene(),
    ...(custom ? { closeOnOutside: false, look: SAMPLE_LOOK } : {}),
  });

  const [scrollTab, viewTab] = win.addTabs({ x: LEFT_X, y: TABS_Y, width: FULL_WIDTH, labels: TAB_LABELS });

  const area = scrollTab.addScroll({ x: LEFT_X, y: AREA_Y, width: FULL_WIDTH, height: AREA_HEIGHT });
  area.addCheckbox({ x: INNER_X, y: INNER_SLOW_Y, width: INNER_WIDTH, label: SLOW_LABEL, read: isSlow, write: setSlow });
  area.addCheckbox({ x: INNER_X, y: INNER_MUTE_Y, width: INNER_WIDTH, label: MUTE_LABEL, read: isMuted, write: setMuted });
  area.addSlider({
    x: INNER_X,
    y: INNER_BGM_Y,
    width: INNER_WIDTH,
    label: BGM_LABEL,
    min: VOLUME_MIN,
    max: VOLUME_MAX,
    step: VOLUME_STEP,
    read: () => Sound.bgmVolume,
    write: (v) => {
      Sound.bgmVolume = v;
    },
    format: formatVolume,
  });
  area.addSlider({
    x: INNER_X,
    y: INNER_SE_Y,
    width: INNER_WIDTH,
    label: SE_LABEL,
    min: VOLUME_MIN,
    max: VOLUME_MAX,
    step: VOLUME_STEP,
    read: () => Sound.seVolume,
    write: (v) => {
      Sound.seVolume = v;
    },
    format: formatVolume,
  });
  area.addValue({
    x: INNER_X,
    y: INNER_FPS_VALUE_Y,
    width: INNER_WIDTH,
    height: INNER_HEADING_HEIGHT,
    label: FPS_HEADING_LABEL,
    read: () => Engine.fps,
    format: formatFps,
  });
  area.addChoices({
    x: INNER_X,
    y: INNER_FPS_CHOICES_Y,
    width: INNER_WIDTH,
    choices: FPS_CHOICES,
    read: readFpsChoice,
    write: writeFpsChoice,
  });
  area.addButton({
    x: INNER_X,
    y: INNER_ADD1_Y,
    width: INNER_WIDTH,
    label: ADD1_LABEL,
    onPress: () => {
      pressCount += 1;
    },
  });
  area.addButton({
    x: INNER_X,
    y: INNER_ADD10_Y,
    width: INNER_WIDTH,
    label: ADD10_LABEL,
    onPress: () => {
      pressCount += ADD_MANY;
    },
  });
  area.addButton({
    x: INNER_X,
    y: INNER_RESET_Y,
    width: INNER_WIDTH,
    label: RESET_LABEL,
    onPress: () => {
      pressCount = 0;
    },
  });

  viewTab.addValue({
    x: LEFT_X,
    y: VIEW_FPS_Y,
    width: FULL_WIDTH,
    height: VIEW_VALUE_HEIGHT,
    label: FPS_LABEL,
    read: () => Engine.fps,
    format: formatFps,
  });
  viewTab.addValue({
    x: LEFT_X,
    y: VIEW_SLOW_Y,
    width: FULL_WIDTH,
    height: VIEW_VALUE_HEIGHT,
    label: SLOW_LABEL,
    read: isSlow,
    format: (v) => (v ? 'ON' : 'OFF'),
  });
  viewTab.addValue({
    x: LEFT_X,
    y: VIEW_BGM_Y,
    width: FULL_WIDTH,
    height: VIEW_VALUE_HEIGHT,
    label: BGM_LABEL,
    read: () => Sound.bgmVolume,
    format: formatVolume,
  });
  viewTab.addValue({
    x: LEFT_X,
    y: VIEW_SE_Y,
    width: FULL_WIDTH,
    height: VIEW_VALUE_HEIGHT,
    label: SE_LABEL,
    read: () => Sound.seVolume,
    format: formatVolume,
  });

  win.addValue({ x: LEFT_X, y: COUNT_Y, width: FULL_WIDTH, label: COUNT_LABEL, read: () => pressCount });
  win.addButton({ x: LEFT_X, y: BUTTON_Y, width: BUTTON_WIDTH, label: BACK_LABEL, onPress: actions.backToFirst });
  win.addButton({ x: RIGHT_X, y: BUTTON_Y, width: BUTTON_WIDTH, label: SWITCH_LOOK_LABEL, onPress: actions.switchLook });
  return win;
}
