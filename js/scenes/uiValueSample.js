/**
 * 責務: 値を変える部品の見本の窓の中身（2種類の窓の設定、部品の並びと位置、値のつなぎ方）。
 */
/* ozengine sample */
import { Engine, Sound, Ui } from 'oz';
import { SAMPLE_LOOK } from './uiSampleLook.js';
import { isSlow, setSlow } from './slow.js';
import { isMuted, setMuted } from './mute.js';
import { FPS_CHOICES, readFpsChoice, writeFpsChoice } from './fps.js';

/**
 * @typedef {'standard' | 'custom'} ValueSampleStyle 見本の窓の種類（標準の見た目か、差し替えた見た目）
 */

/**
 * @typedef {object} ValueSampleActions 見本の窓のボタンから呼ぶ操作（利用側が渡す）
 * @property {() => void} backToFirst 「最初の見本へ」を押したときに呼ぶ
 * @property {() => void} switchLook 「見た目を切り替える」を押したときに呼ぶ
 */

/** 窓の幅（論理座標） */
const WINDOW_WIDTH = 600;
/** 窓の高さ（タイトルバーを含む。論理座標） */
const WINDOW_HEIGHT = 708;
/** 左の列の左端・全幅の部品の左端（窓の内側の左上が原点） */
const LEFT_X = 24;
/** 右の列の左端 */
const RIGHT_X = 312;
/** 列の幅 */
const COLUMN_WIDTH = 264;
/** 全幅の部品の幅 */
const FULL_WIDTH = 552;
/** 見出し（FPS の値）の高さ */
const HEADING_HEIGHT = 48;
/** チェックボックス「スロー」の上端 */
const SLOW_Y = 12;
/** チェックボックス「ミュート」の上端 */
const MUTE_Y = 108;
/** FPS の値の表示の上端 */
const FPS_VALUE_Y = 228;
/** 縦の選択肢の列の上端 */
const SPEED_Y = 12;
/** 横の選択肢の列の上端 */
const FPS_CHOICES_Y = 284;
/** スライダーの上端 */
const VOLUME_Y = 380;
/** 下のボタンの上端 */
const BUTTON_Y = 520;

/** 標準の見た目の窓のタイトル */
const STANDARD_TITLE = '値を変える部品の見本（標準）';
/** 差し替えた見た目の窓のタイトル */
const CUSTOM_TITLE = '値を変える部品の見本（差し替え）';
/** スローの項目名 */
const SLOW_LABEL = 'スロー';
/** ミュートの項目名 */
const MUTE_LABEL = 'ミュート';
/** FPS の値の見出し */
const FPS_LABEL = 'FPS';
/** FPS がまだ分からないときの表示 */
const FPS_UNKNOWN_TEXT = '--';
/** BGM の音量の項目名 */
const VOLUME_LABEL = 'BGM の音量';
/** 最初の見本へ戻るボタンの文言 */
const BACK_LABEL = '最初の見本へ';
/** 見た目を切り替えるボタンの文言 */
const SWITCH_LOOK_LABEL = '見た目を切り替える';
/** ゲームの速さの選択肢（値は Engine.timeScale） */
const SPEED_CHOICES = [
  { label: '等速', value: 1 },
  { label: '2分の1', value: 0.5 },
  { label: '4分の1', value: 0.25 },
];
/** BGM の音量の最小 */
const VOLUME_MIN = 0;
/** BGM の音量の最大 */
const VOLUME_MAX = 1;
/** BGM の音量の刻み */
const VOLUME_STEP = 0.1;

/**
 * 値を変える部品の見本の窓を作り、部品を足して返す。
 * @param {ValueSampleStyle} style 'standard'（標準の見た目。外を押すと閉じる）か 'custom'（差し替えた見た目。閉じるボタンでだけ閉じる）
 * @param {ValueSampleActions} actions ボタンから呼ぶ操作
 * @returns {{ addButton: Function, addValue: Function, addCheckbox: Function, addSlider: Function, addChoices: Function, onPointer: (pointer: object) => void, draw: (ctx: CanvasRenderingContext2D) => void }} 窓の操作のオブジェクト
 */
export function createValueSampleWindow(style, actions) {
  const custom = style === 'custom';
  const win = Ui.createWindow({
    title: custom ? CUSTOM_TITLE : STANDARD_TITLE,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    onClose: () => Engine.popScene(),
    ...(custom ? { closeOnOutside: false, look: SAMPLE_LOOK } : {}),
  });
  win.addCheckbox({ x: LEFT_X, y: SLOW_Y, width: COLUMN_WIDTH, label: SLOW_LABEL, read: isSlow, write: setSlow });
  win.addCheckbox({ x: LEFT_X, y: MUTE_Y, width: COLUMN_WIDTH, label: MUTE_LABEL, read: isMuted, write: setMuted });
  win.addValue({
    x: LEFT_X,
    y: FPS_VALUE_Y,
    width: COLUMN_WIDTH,
    height: HEADING_HEIGHT,
    label: FPS_LABEL,
    read: () => Engine.fps,
    format: (v) => (v === null ? FPS_UNKNOWN_TEXT : String(v)),
  });
  win.addChoices({
    x: RIGHT_X,
    y: SPEED_Y,
    width: COLUMN_WIDTH,
    direction: 'vertical',
    choices: SPEED_CHOICES,
    read: () => Engine.timeScale,
    write: (v) => {
      Engine.timeScale = v;
    },
  });
  win.addChoices({
    x: LEFT_X,
    y: FPS_CHOICES_Y,
    width: FULL_WIDTH,
    choices: FPS_CHOICES,
    read: readFpsChoice,
    write: writeFpsChoice,
  });
  win.addSlider({
    x: LEFT_X,
    y: VOLUME_Y,
    width: FULL_WIDTH,
    label: VOLUME_LABEL,
    min: VOLUME_MIN,
    max: VOLUME_MAX,
    step: VOLUME_STEP,
    read: () => Sound.bgmVolume,
    write: (v) => {
      Sound.bgmVolume = v;
    },
    format: (v) => Math.round(v * 100) + '%',
  });
  win.addButton({ x: LEFT_X, y: BUTTON_Y, width: COLUMN_WIDTH, label: BACK_LABEL, onPress: actions.backToFirst });
  win.addButton({ x: RIGHT_X, y: BUTTON_Y, width: COLUMN_WIDTH, label: SWITCH_LOOK_LABEL, onPress: actions.switchLook });
  return win;
}
