/**
 * 責務: UI の見本の窓の中身（2種類の窓の設定、部品の並びと位置、見た目の切り替え）と開き方。
 */
/* ozengine sample */
import { Engine, Ui } from 'oz';
import { UiSampleScene } from './UiSampleScene.js';
import { SAMPLE_LOOK } from './uiSampleLook.js';
import { isSlow, toggleSlow, resetSlow } from './slow.js';

/**
 * @typedef {'standard' | 'custom'} SampleStyle 見本の窓の種類（標準の見た目か、差し替えた見た目）
 */

/** 窓を描くレイヤー名 */
const SAMPLE_LAYER = 'ui';
/** 窓の幅（論理座標） */
const WINDOW_WIDTH = 600;
/** 窓の高さ（タイトルバーを含む。論理座標） */
const WINDOW_HEIGHT = 536;
/** 部品の左端（窓の内側の左上が原点） */
const PART_LEFT = 24;
/** 1行目の部品の上端 */
const ROW1_Y = 24;
/** 2行目のボタンの上端 */
const ROW2_Y = 128;
/** 3行目のボタンの上端 */
const ROW3_Y = 232;
/** 4行目のボタンの上端 */
const ROW4_Y = 336;
/** 1行に並ぶ2つの表示の幅 */
const HALF_WIDTH = 268;
/** 2つ目の表示の左端 */
const RIGHT_LEFT = 308;
/** 1行に1つのボタンの幅 */
const FULL_WIDTH = 552;
/** 標準の見た目の窓のタイトル */
const STANDARD_TITLE = 'UI の見本（標準）';
/** 差し替えた見た目の窓のタイトル */
const CUSTOM_TITLE = 'UI の見本（差し替え）';

/** FPS 表示の見出し */
const FPS_LABEL = 'FPS';
/** FPS がまだ分からないときの表示 */
const FPS_UNKNOWN_TEXT = '--';
/** スロー表示の見出し */
const SLOW_LABEL = 'スロー';
/** スローが入っているときの表示 */
const SLOW_ON_TEXT = 'ON';
/** スローが入っていないときの表示 */
const SLOW_OFF_TEXT = 'OFF';
/** スローを切り替えるボタンの文言 */
const TOGGLE_SLOW_LABEL = 'スローを切り替える';
/** 等速に戻すボタンの文言 */
const RESET_SLOW_LABEL = '等速に戻す';
/** 見た目を切り替えるボタンの文言 */
const SWITCH_LOOK_LABEL = '見た目を切り替える';

/**
 * 見本の窓を作り、部品を足して返す。
 * @param {SampleStyle} style 'standard'（標準の見た目。外を押すと閉じる）か 'custom'（差し替えた見た目。閉じるボタンでだけ閉じる）
 * @returns {{ addButton: Function, addValue: Function, onPointer: (pointer: object) => void, draw: (ctx: CanvasRenderingContext2D) => void }} 窓の操作のオブジェクト（部品を足す addButton・addValue と、入力を渡す onPointer、描く draw）
 */
export function createSampleWindow(style) {
  const custom = style === 'custom';
  const win = Ui.createWindow({
    title: custom ? CUSTOM_TITLE : STANDARD_TITLE,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    onClose: () => Engine.popScene(),
    ...(custom ? { closeOnOutside: false, look: SAMPLE_LOOK } : {}),
  });
  win.addValue({
    x: PART_LEFT,
    y: ROW1_Y,
    width: HALF_WIDTH,
    label: FPS_LABEL,
    read: () => Engine.fps,
    format: (v) => (v === null ? FPS_UNKNOWN_TEXT : String(v)),
  });
  win.addValue({
    x: RIGHT_LEFT,
    y: ROW1_Y,
    width: HALF_WIDTH,
    label: SLOW_LABEL,
    read: isSlow,
    format: (v) => (v ? SLOW_ON_TEXT : SLOW_OFF_TEXT),
  });
  win.addButton({ x: PART_LEFT, y: ROW2_Y, width: FULL_WIDTH, label: TOGGLE_SLOW_LABEL, onPress: toggleSlow });
  win.addButton({
    x: PART_LEFT,
    y: ROW3_Y,
    width: FULL_WIDTH,
    label: RESET_SLOW_LABEL,
    enabled: isSlow,
    onPress: resetSlow,
  });
  win.addButton({
    x: PART_LEFT,
    y: ROW4_Y,
    width: FULL_WIDTH,
    label: SWITCH_LOOK_LABEL,
    onPress: () => {
      Engine.popScene();
      openUiSample(custom ? 'standard' : 'custom');
    },
  });
  return win;
}

/**
 * UI の見本の窓を置いたシーンを最前面に積んで開く。
 * @param {SampleStyle} style 見本の窓の種類
 * @returns {void}
 */
export function openUiSample(style) {
  Engine.pushScene(new UiSampleScene({ layer: SAMPLE_LAYER, createWindow: () => createSampleWindow(style) }));
}
