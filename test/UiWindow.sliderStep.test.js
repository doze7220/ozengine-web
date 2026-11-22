/**
 * @fileoverview 責務: oz/src/UiWindow.js の addSlider の「step は max - min 以下」の判定（小数の誤差を見込む）の自動テスト。
 * 通る設定と、はっきり大きくてエラーになる設定を確かめる。ドラッグの動きは UiWindow.sliderDrag.test.js が受け持つ。Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';

const PREFIX = '[oz] 窓の addSlider: ';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/*
 * 窓 (100, 100)-(700, 500)、窓の内側の原点は (100, 188)。
 * スライダー（spec x 0・y 10・width 564）は、溝 track.x = 132・track.width = 500、中心の高さ y = 286。
 * k = 1 なら刻み 0 の位置は x = 132、刻み 1 の位置は x = 632。
 */

/** 溝の中心の高さ。 */
const Y = 286;

/**
 * スライダーを1つ足した窓を作る。
 * @param {Object} extra 上書き・追加する spec の項目
 * @param {Array<*>} written write に渡された値の記録先
 * @returns {UiWindow} 窓
 */
function makeWindowWithSlider(extra, written) {
  const win = new UiWindow({ title: 'T', x: 100, y: 100, width: 600, height: 400, onClose: () => {} }, SCREEN);
  win.addSlider({
    x: 0, y: 10, width: 564, label: 'L', min: 0, max: 1, step: 0.5, read: () => -1, write: (v) => { written.push(v); }, ...extra,
  });
  return win;
}

/**
 * 押して離す。
 * @param {UiWindow} win 窓
 * @param {number} x 論理座標の x
 * @returns {void}
 */
function tap(win, x) {
  win.onPointer({ type: 'down', x, y: Y });
  win.onPointer({ type: 'up', x, y: Y });
}

/**
 * addSlider が、種類 Error と文面の一致で失敗することを確かめる。
 * @param {Object} extra 上書きする spec の項目
 * @param {string} message 先頭の `[oz] 窓の addSlider: ` を除いた文面
 * @returns {void}
 */
function assertSliderError(extra, message) {
  assert.throws(
    () => makeWindowWithSlider(extra, []),
    (e) => e instanceof Error && e.constructor === Error && e.message === PREFIX + message,
  );
}

test('min 0.1・max 0.3・step 0.2 は通り、押した位置で 0.1 と 0.3 が書かれる', () => {
  const written = [];
  const win = makeWindowWithSlider({ min: 0.1, max: 0.3, step: 0.2 }, written);
  tap(win, 132);
  assert.deepEqual(written, [0.1]);
  tap(win, 632);
  assert.deepEqual(written, [0.1, 0.3]);
});

test('step が max - min とちょうど同じでも通る（値は min と max の2通り）', () => {
  const written = [];
  const win = makeWindowWithSlider({ min: 0, max: 1, step: 1 }, written);
  tap(win, 132);
  tap(win, 632);
  assert.deepEqual(written, [0, 1]);
});

test('step がはっきり max - min より大きいときは「step は max - min 以下にしてください」', () => {
  const message = 'step は max - min 以下にしてください';
  assertSliderError({ min: 0, max: 1, step: 1.5 }, message);
  assertSliderError({ min: 0.1, max: 0.3, step: 0.25 }, message);
});
