/**
 * 責務: 土台のプレイ中メニューの4項目（閉じる、開発用パネル、設定、タイトルに戻る）の定義と表示。
 */
/* ozengine sample */
import { openMenu, closeMenu } from './MenuScene.js';
import { resetSlow } from './slow.js';
import { openDevPanel } from './devPanel.js';
import { openSettings } from './settingsWindow.js';

/** メニューを描くレイヤー名 */
const MENU_LAYER = 'ui';
/** 「閉じる」の項目を選ぶキー */
const CLOSE_KEY = 'KeyP';

/**
 * プレイ中のメニューを開く。項目は「閉じる」「開発用パネル」「設定」「タイトルに戻る」の4つ。
 * 「開発用パネル」「設定」はメニューを閉じてから窓を開く（窓を閉じるとプレイ画面に戻る）。
 * @param {{ width: number, height: number }} screen 解像度（開発用パネルの「画面の大きさ」の表示にも渡す）
 * @param {() => void} backToTitle タイトルへ切り替える処理（引数なし）。「タイトルに戻る」でスローを解除した後に呼ぶ
 * @returns {void}
 */
export function openPlayMenu(screen, backToTitle) {
  openMenu({
    screen,
    layer: MENU_LAYER,
    items: [
      { label: '閉じる', key: CLOSE_KEY, onSelect: () => closeMenu() },
      {
        label: '開発用パネル',
        onSelect: () => {
          closeMenu();
          openDevPanel(screen);
        },
      },
      {
        label: '設定',
        onSelect: () => {
          closeMenu();
          openSettings();
        },
      },
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
