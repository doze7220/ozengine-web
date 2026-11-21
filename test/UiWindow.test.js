/**
 * @fileoverview 責務: oz/src/UiWindow.js の窓の設定の検証・窓の形・既定の値・look の写しの自動テスト（LOOK_KINDS の中身を含む）。
 * Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';
import { LOOK_KINDS } from '../oz/src/UiSpec.js';
import { DEFAULT_TITLE_BAR_HEIGHT, DEFAULT_TEXT_SIZE } from '../oz/src/UiMetrics.js';

const PREFIX = '[oz] Ui.createWindow: ';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/**
 * 正しい options を新しく作る（幅 600、高さ 400、位置は中央）。
 * @param {Object} [extra] 上書き・追加する項目（値が undefined の項目は undefined を書く）
 * @returns {Object} options
 */
function goodOptions(extra = {}) {
  return { title: 'タイトル', width: 600, height: 400, onClose: () => {}, ...extra };
}

/**
 * options から窓を作る。
 * @param {Object} [extra] goodOptions に渡す上書き
 * @returns {UiWindow} 窓
 */
function makeWindow(extra = {}) {
  return new UiWindow(goodOptions(extra), SCREEN);
}

/**
 * 窓の作成が、種類 Error と文面の一致で失敗することを確かめる。
 * @param {*} options 渡す options
 * @param {string} message 先頭の `[oz] Ui.createWindow: ` を除いた文面
 * @returns {void}
 */
function assertCreateError(options, message) {
  assert.throws(
    () => new UiWindow(options, SCREEN),
    (e) => e instanceof Error && e.constructor === Error && e.message === PREFIX + message,
  );
}

/**
 * 呼ばれた回数を数える関数を作る。
 * @returns {{fn: Function, count: () => number}} 関数と回数の取得
 */
function counter() {
  let n = 0;
  return { fn: () => { n++; }, count: () => n };
}

test('options が無い・オブジェクトでない・配列は「渡されていません」', () => {
  const msg = 'options (窓の設定オブジェクト) が渡されていません';
  assertCreateError(undefined, msg);
  assertCreateError(null, msg);
  assertCreateError([], msg);
  assertCreateError('x', msg);
  assertCreateError(1, msg);
});

test('知らない項目はエラー（最初の1つ）', () => {
  assertCreateError(goodOptions({ closeOnOutsde: false }), 'options に使えない項目 closeOnOutsde があります');
  assertCreateError(goodOptions({ a: 1, b: 2 }), 'options に使えない項目 a があります');
});

test('title が文字列でない', () => {
  const msg = 'title は文字列で指定してください';
  assertCreateError(goodOptions({ title: undefined }), msg);
  assertCreateError(goodOptions({ title: 1 }), msg);
  assertCreateError(goodOptions({ title: null }), msg);
});

test('title は空文字でもよい', () => {
  assert.equal(makeWindow({ title: '' }).view().titleBar.title, '');
});

test('width・height が正の有限数でない（width が先）', () => {
  for (const bad of [undefined, 0, -1, NaN, Infinity, '100', null]) {
    assertCreateError(goodOptions({ width: bad }), 'width は正の有限数で指定してください');
    assertCreateError(goodOptions({ height: bad }), 'height は正の有限数で指定してください');
  }
  assertCreateError(goodOptions({ width: 0, height: 0 }), 'width は正の有限数で指定してください');
});

test('titleBarHeight が書かれていて正の有限数でない（null もエラー）', () => {
  for (const bad of [0, -1, NaN, Infinity, '88', null]) {
    assertCreateError(goodOptions({ titleBarHeight: bad }), 'titleBarHeight は正の有限数で指定してください');
  }
});

test('titleBarHeight の検証は width・height の大小の検査より先', () => {
  assertCreateError(
    goodOptions({ width: 10, height: 10, titleBarHeight: -1 }),
    'titleBarHeight は正の有限数で指定してください',
  );
});

test('width・height が titleBarHeight 以下はエラー（width が先）', () => {
  assertCreateError(goodOptions({ width: 88 }), 'width は titleBarHeight より大きくしてください');
  assertCreateError(goodOptions({ width: 50 }), 'width は titleBarHeight より大きくしてください');
  assertCreateError(goodOptions({ height: 88 }), 'height は titleBarHeight より大きくしてください');
  assertCreateError(goodOptions({ width: 88, height: 88 }), 'width は titleBarHeight より大きくしてください');
  assertCreateError(
    goodOptions({ height: 100, titleBarHeight: 100 }),
    'height は titleBarHeight より大きくしてください',
  );
  assert.doesNotThrow(() => makeWindow({ width: 89, height: 89 }));
});

test('x・y が書かれていて有限の数値でない（x が先、null もエラー）', () => {
  for (const bad of [NaN, Infinity, '1', null]) {
    assertCreateError(goodOptions({ x: bad }), 'x は有限の数値で指定してください');
    assertCreateError(goodOptions({ y: bad }), 'y は有限の数値で指定してください');
  }
  assertCreateError(goodOptions({ x: NaN, y: NaN }), 'x は有限の数値で指定してください');
});

test('onClose が関数でない', () => {
  const msg = 'onClose は関数で指定してください';
  assertCreateError(goodOptions({ onClose: undefined }), msg);
  assertCreateError(goodOptions({ onClose: 'f' }), msg);
  assertCreateError(goodOptions({ onClose: null }), msg);
});

test('closeOnOutside が書かれていて真偽値でない', () => {
  const msg = 'closeOnOutside は true か false で指定してください';
  assertCreateError(goodOptions({ closeOnOutside: 1 }), msg);
  assertCreateError(goodOptions({ closeOnOutside: 'true' }), msg);
  assertCreateError(goodOptions({ closeOnOutside: null }), msg);
});

test('textSize が書かれていて正の有限数でない', () => {
  for (const bad of [0, -1, NaN, Infinity, '36', null]) {
    assertCreateError(goodOptions({ textSize: bad }), 'textSize は正の有限数で指定してください');
  }
});

test('look がオブジェクトでない（null・配列・文字列はエラー）', () => {
  const msg = 'look は描く関数のオブジェクトで指定してください';
  assertCreateError(goodOptions({ look: null }), msg);
  assertCreateError(goodOptions({ look: [] }), msg);
  assertCreateError(goodOptions({ look: 'x' }), msg);
  assertCreateError(goodOptions({ look: () => {} }), msg);
});

test('look に知らない名前', () => {
  assertCreateError(goodOptions({ look: { foo: () => {} } }), 'look に使えない項目 foo があります');
  assertCreateError(
    goodOptions({ look: { button: 1, foo: () => {} } }),
    'look に使えない項目 foo があります',
  );
});

test('look の値が関数でない（undefined もエラー）', () => {
  assertCreateError(goodOptions({ look: { button: 1 } }), 'look.button は関数で指定してください');
  assertCreateError(goodOptions({ look: { value: undefined } }), 'look.value は関数で指定してください');
  assertCreateError(
    goodOptions({ look: { window: () => {}, backdrop: null } }),
    'look.backdrop は関数で指定してください',
  );
});

test('検証は上から順に最初に当たったものを投げる', () => {
  assertCreateError({ title: 1, width: 'a', foo: 1 }, 'options に使えない項目 foo があります');
  assertCreateError({ title: 1, width: 'a' }, 'title は文字列で指定してください');
  assertCreateError({ title: 'a', width: 'a' }, 'width は正の有限数で指定してください');
  assertCreateError({ title: 'a', width: 600, height: 400, x: NaN }, 'x は有限の数値で指定してください');
  assertCreateError({ title: 'a', width: 600, height: 400, textSize: 0 }, 'onClose は関数で指定してください');
});

test('窓を画面の中央に置く（丸めない）', () => {
  const v = makeWindow().view();
  assert.deepEqual(v.window, { x: 340, y: 160, width: 600, height: 400, title: 'タイトル', textSize: 36 });
  const odd = makeWindow({ width: 601, height: 401 }).view();
  assert.equal(odd.window.x, (1280 - 601) / 2);
  assert.equal(odd.window.y, (720 - 401) / 2);
});

test('x・y を渡すとその位置、片方だけなら省略した軸だけ中央', () => {
  const both = makeWindow({ x: 10, y: 20 }).view().window;
  assert.equal(both.x, 10);
  assert.equal(both.y, 20);
  const onlyX = makeWindow({ x: 10 }).view().window;
  assert.equal(onlyX.x, 10);
  assert.equal(onlyX.y, 160);
  const onlyY = makeWindow({ y: 20 }).view().window;
  assert.equal(onlyY.x, 340);
  assert.equal(onlyY.y, 20);
  const neg = makeWindow({ x: -5, y: 0 }).view().window;
  assert.equal(neg.x, -5);
  assert.equal(neg.y, 0);
});

test('x・y が undefined なら省略と同じ（中央）', () => {
  const w = makeWindow({ x: undefined, y: undefined }).view().window;
  assert.equal(w.x, 340);
  assert.equal(w.y, 160);
});

test('タイトルバー・閉じるボタン・内側・暗幕の矩形', () => {
  const v = makeWindow().view();
  assert.deepEqual(
    { x: v.titleBar.x, y: v.titleBar.y, width: v.titleBar.width, height: v.titleBar.height },
    { x: 340, y: 160, width: 600, height: 88 },
  );
  const c = v.closeButton;
  assert.deepEqual(
    { x: c.x, y: c.y, width: c.width, height: c.height },
    { x: 340 + 600 - 88, y: 160, width: 88, height: 88 },
  );
  assert.deepEqual(v.content, { x: 340, y: 248, width: 600, height: 312 });
  assert.deepEqual(v.backdrop, { x: 0, y: 0, width: 1280, height: 720 });
});

test('titleBarHeight を変えると、タイトルバー・閉じるボタン・内側が変わる', () => {
  const v = makeWindow({ titleBarHeight: 50 }).view();
  assert.equal(v.titleBar.height, 50);
  assert.deepEqual(
    { x: v.closeButton.x, y: v.closeButton.y, width: v.closeButton.width, height: v.closeButton.height },
    { x: 340 + 600 - 50, y: 160, width: 50, height: 50 },
  );
  assert.deepEqual(v.content, { x: 340, y: 210, width: 600, height: 350 });
  assert.deepEqual(v.window, { x: 340, y: 160, width: 600, height: 400, title: 'タイトル', textSize: 36 });
});

test('既定の値: titleBarHeight 88、textSize 36', () => {
  assert.equal(DEFAULT_TITLE_BAR_HEIGHT, 88);
  assert.equal(DEFAULT_TEXT_SIZE, 36);
  const v = makeWindow().view();
  assert.equal(v.titleBar.height, DEFAULT_TITLE_BAR_HEIGHT);
  assert.equal(v.window.textSize, DEFAULT_TEXT_SIZE);
  assert.equal(v.titleBar.textSize, DEFAULT_TEXT_SIZE);
  assert.equal(v.closeButton.textSize, DEFAULT_TEXT_SIZE);
});

test('textSize を渡すと view の各 info に入る', () => {
  const v = makeWindow({ textSize: 20 }).view();
  assert.equal(v.window.textSize, 20);
  assert.equal(v.titleBar.textSize, 20);
  assert.equal(v.closeButton.textSize, 20);
});

test('closeOnOutside の既定は、窓の外を押して離すと閉じる', () => {
  const c = counter();
  const w = makeWindow({ onClose: c.fn });
  w.onPointer({ type: 'down', x: 10, y: 10 });
  w.onPointer({ type: 'up', x: 10, y: 10 });
  assert.equal(c.count(), 1);
});

test('closeOnOutside: false なら窓の外で閉じない', () => {
  const c = counter();
  const w = makeWindow({ onClose: c.fn, closeOnOutside: false });
  w.onPointer({ type: 'down', x: 10, y: 10 });
  w.onPointer({ type: 'up', x: 10, y: 10 });
  assert.equal(c.count(), 0);
});

test('closeOnOutside: undefined は既定（閉じる）', () => {
  const c = counter();
  const w = makeWindow({ onClose: c.fn, closeOnOutside: undefined });
  w.onPointer({ type: 'down', x: 10, y: 10 });
  w.onPointer({ type: 'up', x: 10, y: 10 });
  assert.equal(c.count(), 1);
});

test('look を渡さないと空の凍結したオブジェクト', () => {
  const look = makeWindow().look;
  assert.deepEqual(Object.keys(look), []);
  assert.ok(Object.isFrozen(look));
});

test('look は渡した種類だけを持ち、凍結される', () => {
  const button = () => {};
  const value = () => {};
  const look = makeWindow({ look: { button, value } }).look;
  assert.deepEqual(Object.keys(look).sort(), ['button', 'value']);
  assert.equal(look.button, button);
  assert.equal(look.value, value);
  assert.equal(look.window, undefined);
  assert.ok(Object.isFrozen(look));
});

test('look は写して持つ（元を変えても影響しない。元そのものでもない）', () => {
  const original = { button: () => {} };
  const look = makeWindow({ look: original }).look;
  const first = original.button;
  original.button = () => 'changed';
  original.window = () => {};
  delete original.value;
  assert.equal(look.button, first);
  assert.equal(look.window, undefined);
  assert.notEqual(look, original);
});

test('LOOK_KINDS のすべての名前を渡せ、渡した順に写される', () => {
  const all = {};
  for (const k of LOOK_KINDS) all[k] = () => {};
  const look = makeWindow({ look: all }).look;
  assert.deepEqual(Object.keys(look), [...LOOK_KINDS]);
});

test('LOOK_KINDS の中身と凍結', () => {
  assert.deepEqual([...LOOK_KINDS], ['backdrop', 'window', 'titleBar', 'closeButton', 'button', 'value']);
  assert.ok(Object.isFrozen(LOOK_KINDS));
});

test('渡した options を後から変えても窓に影響しない', () => {
  const options = goodOptions({ title: 'A' });
  const w = new UiWindow(options, SCREEN);
  options.title = 'B';
  options.width = 100;
  options.height = 100;
  options.textSize = 10;
  const v = w.view();
  assert.equal(v.window.title, 'A');
  assert.equal(v.window.width, 600);
  assert.equal(v.window.height, 400);
  assert.equal(v.window.textSize, 36);
});

test('view() は毎回新しいオブジェクトを返し、書き換えても窓に影響しない', () => {
  const w = makeWindow();
  const a = w.view();
  const b = w.view();
  assert.notEqual(a, b);
  assert.notEqual(a.window, b.window);
  assert.notEqual(a.content, b.content);
  a.window.x = 9999;
  a.content.width = 1;
  a.backdrop.width = 1;
  const c = w.view();
  assert.equal(c.window.x, 340);
  assert.equal(c.content.width, 600);
  assert.equal(c.backdrop.width, 1280);
});

test('閉じるボタンの info（label は空、押されていない、押せる）と、部品は空', () => {
  const v = makeWindow().view();
  assert.equal(v.closeButton.label, '');
  assert.equal(v.closeButton.pressed, false);
  assert.equal(v.closeButton.enabled, true);
  assert.deepEqual(v.parts, []);
});
