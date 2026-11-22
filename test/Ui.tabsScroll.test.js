/**
 * @fileoverview 責務: oz/src/Ui.js の公開の口のうち、タブ・スクロールする領域のオブジェクト（addTabs・addScroll と、返るオブジェクトの操作）の自動テスト。
 * 戻り値の形（凍結・操作の名前）、足した部品が窓の onPointer で反応する受け渡し、エラーがそれらの操作から投げられることを確かめる。
 * タブ・領域の動きそのものは UiWindow.tabs/scroll/scrollDrag.test.js が受け持つ。Canvas と window は使わない（draw は呼ばない）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ui, setUiScreenSize } from '../oz/src/Ui.js';
import { DEFAULT_TITLE_BAR_HEIGHT, DEFAULT_TAB_HEIGHT, SCROLL_DRAG_DISTANCE } from '../oz/src/UiMetrics.js';

setUiScreenSize(1280, 720);

/** 窓の左上の x（窓の内側の原点の x もこれ）。 */
const WX = 100;

/** 窓の内側の原点の y（窓の y 100 + タイトルバーの高さ）。 */
const OY = 100 + DEFAULT_TITLE_BAR_HEIGHT;

/** タブの列の幅（2つのタブで等分すると 1 つ 200）。 */
const TABS_WIDTH = 400;

/** タブ B の見える矩形の中の点（x は窓の内側で 200〜400 の中央付近、y はタブの列の高さの中央）。 */
const TAB_B_POINT = { x: WX + TABS_WIDTH / 2 + 50, y: OY + DEFAULT_TAB_HEIGHT / 2 };

/** 5つの足す操作の名前。 */
const OPS = ['addButton', 'addValue', 'addCheckbox', 'addSlider', 'addChoices'];

/**
 * 窓を作る（(100, 100)・幅 600・高さ 500。外を押しても閉じない）。
 * @returns {ReturnType<typeof Ui.createWindow>} 窓の操作
 */
function makeWindow() {
  return Ui.createWindow({ title: 'T', x: WX, y: 100, width: 600, height: 500, onClose() {}, closeOnOutside: false });
}

/**
 * 押して離す（同じ位置）。
 * @param {{onPointer: Function}} win 窓の操作
 * @param {number} x 論理座標の x
 * @param {number} y 論理座標の y
 * @returns {void}
 */
function tap(win, x, y) {
  win.onPointer({ type: 'down', x, y });
  win.onPointer({ type: 'up', x, y });
}

/**
 * 関数が、種類 Error と文面の一致で失敗することを確かめる。
 * @param {Function} fn 呼ぶ関数
 * @param {string} message 期待する文面全体
 * @returns {void}
 */
function assertError(fn, message) {
  assert.throws(fn, (e) => e instanceof Error && e.constructor === Error && e.message === message);
}

/**
 * オブジェクトが凍結され、指定の名前の関数だけを持つことを確かめる。
 * @param {Object} obj 調べるオブジェクト
 * @param {string[]} names 期待する操作の名前（順不同）
 * @returns {void}
 */
function assertHandleShape(obj, names) {
  assert.equal(Object.isFrozen(obj), true);
  assert.deepEqual(Object.keys(obj).sort(), [...names].sort());
  for (const key of Object.keys(obj)) assert.equal(typeof obj[key], 'function');
}

/**
 * 押された部品の名前を記録するボタンの設定を作る。
 * @param {string[]} log 記録先
 * @param {string} name 記録する名前
 * @param {number} x 部品の x
 * @param {number} y 部品の y
 * @returns {Object} addButton の設定
 */
function buttonSpec(log, name, x, y) {
  return { x, y, width: 200, height: 88, label: name, onPress: () => { log.push(name); } };
}

test('addTabs: 凍結した配列を返し、タブのオブジェクトは凍結され7つの関数だけを持つ', () => {
  const win = makeWindow();
  const tabs = win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A', 'B'] });
  assert.equal(Array.isArray(tabs), true);
  assert.equal(Object.isFrozen(tabs), true);
  assert.equal(tabs.length, 2);
  for (const tab of tabs) {
    assertHandleShape(tab, [...OPS, 'addScroll', 'addTabs']);
  }
  assert.notEqual(tabs[0], tabs[1]);
});

test('addScroll: 窓の addScroll は凍結した領域のオブジェクト（7つの関数だけ）を返す', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  assertHandleShape(scroll, [...OPS, 'addTabs', 'addScroll']);
});

test('addScroll: タブの addScroll も凍結した領域のオブジェクト（7つの関数だけ）を返す', () => {
  const win = makeWindow();
  const [tab] = win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A', 'B'] });
  const scroll = tab.addScroll({ x: 0, y: 100, width: 300, height: 200 });
  assertHandleShape(scroll, [...OPS, 'addTabs', 'addScroll']);
});

test('タブ・領域の5つの足す操作は何も返さない', () => {
  const win = makeWindow();
  const [tab] = win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A', 'B'] });
  const scroll = tab.addScroll({ x: 0, y: 100, width: 300, height: 200 });
  const log = [];
  for (const target of [tab, scroll]) {
    assert.equal(target.addButton(buttonSpec(log, 'b', 0, 0)), undefined);
    assert.equal(target.addValue({ x: 0, y: 0, width: 100, label: 'V', read: () => 1 }), undefined);
    assert.equal(target.addCheckbox({ x: 0, y: 0, width: 200, height: 50, label: 'C', read: () => false, write() {} }), undefined);
    assert.equal(target.addSlider({ x: 0, y: 0, width: 300, height: 60, label: 'S', min: 0, max: 1, step: 0.5, read: () => 0, write() {} }), undefined);
    assert.equal(target.addChoices({ x: 0, y: 0, width: 200, height: 50, choices: [{ label: 'A', value: 'a' }], read: () => 'a', write() {} }), undefined);
  }
});

test('タブのオブジェクトで足したボタンは、そのタブが選ばれているときだけ窓の onPointer で反応する', () => {
  const win = makeWindow();
  const log = [];
  const [tabA, tabB] = win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A', 'B'] });
  tabA.addButton(buttonSpec(log, 'a', 0, 100));
  tabB.addButton(buttonSpec(log, 'b', 0, 100));
  // ボタンの見える矩形: 窓の内側の x 0〜200・y 100〜188 → 画面で x 100〜300・y 288〜376。押す点 (110, 300) はその中。
  const point = { x: WX + 10, y: OY + 112 };
  assert.ok(point.x >= WX && point.x < WX + 200 && point.y >= OY + 100 && point.y < OY + 188);
  tap(win, point.x, point.y);
  assert.deepEqual(log, ['a']);
  // タブ B の見える矩形: 画面で x 300〜500・y 188〜276。押す点はその中。
  assert.ok(TAB_B_POINT.x >= WX + 200 && TAB_B_POINT.x < WX + 400 && TAB_B_POINT.y >= OY && TAB_B_POINT.y < OY + DEFAULT_TAB_HEIGHT);
  tap(win, TAB_B_POINT.x, TAB_B_POINT.y);
  tap(win, point.x, point.y);
  assert.deepEqual(log, ['a', 'b']);
});

test('領域のオブジェクトで足したボタンは、窓の onPointer で反応し、ドラッグでスクロールした位置に合って反応する', () => {
  const win = makeWindow();
  const log = [];
  // 領域は窓の内側の x 0〜300・y 0〜200（画面で x 100〜400・y 188〜388）。中に y 0・100・200・300 のボタン（高さ 88）。
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  for (const y of [0, 100, 200, 300]) scroll.addButton(buttonSpec(log, `B${y}`, 0, y));
  // スクロール前: 画面 y 320（領域の中の y 132）は、y 100〜188 のボタン B100 の上。
  const px = WX + 10;
  const py = OY + 132;
  assert.ok(py >= OY + 100 && py < OY + 188 && py < OY + 200);
  tap(win, px, py);
  assert.deepEqual(log, ['B100']);
  // 部品の無い場所（x 350。ボタンの右・領域の中）で押し、距離を越えて上へ動かして、いちばん下（188）までスクロールする。
  const bx = WX + 250;
  const by = OY + 100;
  assert.ok(bx >= WX + 200 && bx < WX + 300);
  win.onPointer({ type: 'down', x: bx, y: by });
  win.onPointer({ type: 'move', x: bx, y: by - (SCROLL_DRAG_DISTANCE + 1) });
  win.onPointer({ type: 'move', x: bx, y: by - (SCROLL_DRAG_DISTANCE + 1) - 188 });
  win.onPointer({ type: 'up', x: bx, y: by - (SCROLL_DRAG_DISTANCE + 1) - 188 });
  assert.deepEqual(log, ['B100']);
  // スクロール後: B300 は領域の中の y 300〜388 → 画面で y 300〜388（OY + 112〜200）。同じ点 (110, 320) は B300 の上。
  assert.ok(py >= OY + (300 - 188) && py < OY + (388 - 188));
  tap(win, px, py);
  assert.deepEqual(log, ['B100', 'B300']);
});

test('タブの領域のオブジェクトで足したボタンは、そのタブが選ばれているときだけ反応する', () => {
  const win = makeWindow();
  const log = [];
  const [, tabB] = win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A', 'B'] });
  // 領域は窓の内側の x 0〜300・y 100〜300（画面で x 100〜400・y 288〜488）。ボタンは領域の中の (0, 0)〜(200, 88)。
  const scroll = tabB.addScroll({ x: 0, y: 100, width: 300, height: 200 });
  scroll.addButton(buttonSpec(log, 'sb', 0, 0));
  const point = { x: WX + 10, y: OY + 100 + 10 };
  assert.ok(point.x >= WX && point.x < WX + 200 && point.y >= OY + 100 && point.y < OY + 188);
  tap(win, point.x, point.y);
  assert.deepEqual(log, []);
  assert.ok(TAB_B_POINT.x >= WX + 200 && TAB_B_POINT.x < WX + 400 && TAB_B_POINT.y >= OY && TAB_B_POINT.y < OY + DEFAULT_TAB_HEIGHT);
  tap(win, TAB_B_POINT.x, TAB_B_POINT.y);
  tap(win, point.x, point.y);
  assert.deepEqual(log, ['sb']);
});

test('エラー: 窓の addTabs の2つ目は窓の操作から投げられ、何も足されない', () => {
  const win = makeWindow();
  const log = [];
  const [, tabB] = win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A', 'B'] });
  tabB.addButton(buttonSpec(log, 'b', 0, 100));
  // 失敗した2つ目が同じ位置に足されていたら、その1つだけのタブが全幅を覆い、タブ B を選べなくなる。
  assertError(() => win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['X'] }), '[oz] 窓の addTabs: タブの列は1つの窓に1つまでです');
  assert.ok(TAB_B_POINT.x >= WX + 200 && TAB_B_POINT.x < WX + 400 && TAB_B_POINT.y >= OY && TAB_B_POINT.y < OY + DEFAULT_TAB_HEIGHT);
  tap(win, TAB_B_POINT.x, TAB_B_POINT.y);
  // ボタンの見える矩形: 画面で x 100〜300・y OY+100〜OY+188。
  const point = { x: WX + 10, y: OY + 112 };
  assert.ok(point.x >= WX && point.x < WX + 200 && point.y >= OY + 100 && point.y < OY + 188);
  tap(win, point.x, point.y);
  assert.deepEqual(log, ['b']);
});

test('エラー: 窓の addTabs・addScroll の設定の検証のエラーは窓の操作から投げられる', () => {
  const win = makeWindow();
  assertError(() => win.addTabs(), '[oz] 窓の addTabs: spec (タブの列の設定オブジェクト) が渡されていません');
  assertError(() => win.addScroll(), '[oz] 窓の addScroll: spec (スクロールする領域の設定オブジェクト) が渡されていません');
  // エラーでは足されないので、続けて正しい設定の addTabs は通る。
  assert.equal(win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A'] }).length, 1);
  // addScroll も続けて通り、足した領域の操作が返る。
  assertHandleShape(win.addScroll({ x: 0, y: 100, width: 300, height: 200 }), [...OPS, 'addTabs', 'addScroll']);
});

test('エラー: タブの addTabs・addScroll・足す操作は、タブの操作から投げられる', () => {
  const win = makeWindow();
  const [tab] = win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A'] });
  assertError(() => tab.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['B'] }), '[oz] タブの addTabs: タブの列はタブに入れられません');
  assertError(() => tab.addScroll(), '[oz] タブの addScroll: spec (スクロールする領域の設定オブジェクト) が渡されていません');
  assertError(() => tab.addButton(), '[oz] タブの addButton: spec (ボタンの設定オブジェクト) が渡されていません');
});

test('エラー: 領域の addTabs・addScroll は領域の操作から投げられる', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  assertError(() => scroll.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A'] }), '[oz] スクロールする領域の addTabs: タブの列はスクロールする領域に入れられません');
  assertError(() => scroll.addScroll({ x: 0, y: 0, width: 10, height: 10 }), '[oz] スクロールする領域の addScroll: スクロールする領域はスクロールする領域に入れられません');
  assert.throws(() => scroll.addButton(), (e) => e instanceof Error && /^\[oz\] スクロールする領域の addButton: /.test(e.message));
});

test('エラー: タブから返った領域の addTabs・addScroll も領域の操作から投げられる', () => {
  const win = makeWindow();
  const [tab] = win.addTabs({ x: 0, y: 0, width: TABS_WIDTH, labels: ['A'] });
  const scroll = tab.addScroll({ x: 0, y: 100, width: 300, height: 200 });
  assertError(() => scroll.addTabs(), '[oz] スクロールする領域の addTabs: タブの列はスクロールする領域に入れられません');
  assertError(() => scroll.addScroll(), '[oz] スクロールする領域の addScroll: スクロールする領域はスクロールする領域に入れられません');
});
