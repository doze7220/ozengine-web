/**
 * 責務: 土台のプレイ中メニューの5項目（閉じる、スロー、ミュート、FPS、タイトルに戻る）の定義と表示。
 */
/* ozengine sample */
import { openMenu, closeMenu } from './MenuScene.js';
import { isSlow, toggleSlow, resetSlow } from './slow.js';
import { isMuted, toggleMute } from './mute.js';
import { fpsLabel, cycleFps } from './fps.js';

/** メニューを描くレイヤー名 */
const MENU_LAYER = 'ui';
/** 「閉じる」の項目を選ぶキー */
const CLOSE_KEY = 'KeyP';
/** 「スロー」の項目を選ぶキー */
const SLOW_KEY = 'KeyS';
/** 「ミュート」の項目を選ぶキー */
const MUTE_KEY = 'KeyM';
/** 「FPS」の項目を選ぶキー */
const FPS_KEY = 'KeyF';

/**
 * プレイ中のメニューを開く。
 * @param {{ width: number, height: number }} screen 解像度
 * @param {() => void} backToTitle タイトルへ切り替える処理（引数なし）。「タイトルに戻る」でスローを解除した後に呼ぶ
 * @returns {void}
 */
export function openPlayMenu(screen, backToTitle) {
  openMenu({
    screen,
    layer: MENU_LAYER,
    items: [
      { label: '閉じる', key: CLOSE_KEY, onSelect: () => closeMenu() },
      { label: () => (isSlow() ? 'スロー: ON' : 'スロー: OFF'), key: SLOW_KEY, onSelect: () => toggleSlow() },
      { label: () => (isMuted() ? 'ミュート: ON' : 'ミュート: OFF'), key: MUTE_KEY, onSelect: () => toggleMute() },
      { label: fpsLabel, key: FPS_KEY, onSelect: () => cycleFps() },
      {
        label: 'タイトルに戻る',
        onSelect: () => {
          resetSlow();
          backToTitle();
        },
      },
    ],
  });
}
