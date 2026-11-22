/**
 * 責務: 土台の設定画面の窓の中身（窓の設定、部品の並びと位置、値のつなぎ方）と開き方。保存は soundSettings.js の関数を呼ぶ。
 */
/* ozengine sample */
import { Engine, Sound, Ui } from 'oz';
import { openWindow } from './WindowScene.js';
import { SETTINGS_LOOK } from './settingsLook.js';
import { isMuted, setMuted, setBgmVolume, setSeVolume, resetSoundSettings } from './soundSettings.js';

/** 窓を描くレイヤー名 */
const SETTINGS_LAYER = 'ui';
/** 窓のタイトル */
const SETTINGS_TITLE = '設定';
/** 窓の幅 */
const SETTINGS_WIDTH = 600;
/** 窓の高さ（タイトルバーを含む） */
const SETTINGS_HEIGHT = 648;

/** 部品の左端（窓の内側の左上が原点） */
const PART_X = 24;
/** 部品の幅 */
const PART_WIDTH = 552;
/** 1つめの部品（BGM の音量）の上端 */
const BGM_Y = 24;
/** 効果音の音量の上端（スライダーの高さ 132 と間 24） */
const SE_Y = 180;
/** ミュートの上端 */
const MUTE_Y = 336;
/** 初期値に戻すボタンの上端（チェックボックスの高さ 88 と間 24） */
const RESET_Y = 448;

/** スライダーの最小値 */
const VOLUME_MIN = 0;
/** スライダーの最大値 */
const VOLUME_MAX = 1;
/** スライダーの刻み */
const VOLUME_STEP = 0.1;

/** 文言 */
const LABEL_BGM = 'BGM の音量';
const LABEL_SE = '効果音の音量';
const LABEL_MUTE = 'ミュート';
const LABEL_RESET = '初期値に戻す';

/**
 * 0〜1 の音量を百分率の文字にする。
 * @param {number} value 音量
 * @returns {string} 例: '50%'
 */
function percentText(value) {
  return `${Math.round(value * 100)}%`;
}

/**
 * 設定画面の窓を作って返す。
 * @returns {{ onPointer: (pointer: object) => void, draw: (ctx: CanvasRenderingContext2D) => void }} 窓の操作のオブジェクト
 */
function createSettingsWindow() {
  const win = Ui.createWindow({
    title: SETTINGS_TITLE,
    width: SETTINGS_WIDTH,
    height: SETTINGS_HEIGHT,
    onClose: () => Engine.popScene(),
    closeOnOutside: false,
    look: SETTINGS_LOOK,
  });

  win.addSlider({
    x: PART_X,
    y: BGM_Y,
    width: PART_WIDTH,
    label: LABEL_BGM,
    min: VOLUME_MIN,
    max: VOLUME_MAX,
    step: VOLUME_STEP,
    read: () => Sound.bgmVolume,
    write: setBgmVolume,
    format: percentText,
  });
  win.addSlider({
    x: PART_X,
    y: SE_Y,
    width: PART_WIDTH,
    label: LABEL_SE,
    min: VOLUME_MIN,
    max: VOLUME_MAX,
    step: VOLUME_STEP,
    read: () => Sound.seVolume,
    write: setSeVolume,
    format: percentText,
  });
  win.addCheckbox({
    x: PART_X,
    y: MUTE_Y,
    width: PART_WIDTH,
    label: LABEL_MUTE,
    read: isMuted,
    write: setMuted,
  });
  win.addButton({
    x: PART_X,
    y: RESET_Y,
    width: PART_WIDTH,
    label: LABEL_RESET,
    onPress: resetSoundSettings,
  });

  return win;
}

/**
 * 設定画面を開く（今の画面の上に積む。窓を閉じるとプレイ画面に戻る）。
 * @returns {void}
 */
export function openSettings() {
  openWindow({ layer: SETTINGS_LAYER, createWindow: createSettingsWindow });
}
