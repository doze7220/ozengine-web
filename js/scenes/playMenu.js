/**
 * 責務: 土台のプレイ中メニューの項目（閉じる、スロー、ミュート、焼き付けの見比べ（一時的）、タイトルに戻る）の定義と表示。
 */
/* ozengine sample */
import { openMenu, closeMenu } from './MenuScene.js';
import { isSlow, toggleSlow, resetSlow } from './slow.js';
import { isMuted, toggleMute } from './mute.js';
// 見比べ用の一時的な切り替え（テストプレイの後に消す）
import { isBaked, toggleBaked } from './bakeToggle.js';

/** メニューを描くレイヤー名 */
const MENU_LAYER = 'ui';
/** 「閉じる」の項目を選ぶキー */
const CLOSE_KEY = 'KeyP';
/** 「スロー」の項目を選ぶキー */
const SLOW_KEY = 'KeyS';
/** 「ミュート」の項目を選ぶキー */
const MUTE_KEY = 'KeyM';
/** 「焼き付け」の項目を選ぶキー（見比べ用の一時的な切り替え。テストプレイの後に消す） */
const BAKE_KEY = 'KeyB';

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
      // 見比べ用の一時的な項目（テストプレイの後に消す）
      { label: () => (isBaked() ? '焼き付け: ON' : '焼き付け: OFF'), key: BAKE_KEY, onSelect: () => toggleBaked() },
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
