/**
 * @fileoverview 責務: oz/src/UiWindow.js のタブの列（addTabs と、5つの足す操作・addScroll の第2引数のタブの番号）の自動テスト。
 * 検証・エラーの先頭・等分・切り替え・出し分け・窓の内側での切り取りを確かめる。スクロールの動きは UiWindow.scroll.test.js、
 * 領域の中の指の扱いは UiWindow.scrollDrag.test.js、公開の口は Ui.tabsScroll.test.js が受け持つ。Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';
import { DEFAULT_TITLE_BAR_HEIGHT, DEFAULT_TAB_HEIGHT } from '../oz/src/UiMetrics.js';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/** 窓の左上の x（窓の内側の原点の x もこれ）。 */
const WX = 100;

/** 窓の内側の原点の y（窓の y 100 + タイトルバーの高さ）。 */
const OY = 100 + DEFAULT_TITLE_BAR_HEIGHT;

/** 5つの足す操作の名前。 */
const OPS = ['addButton', 'addValue', 'addCheckbox', 'addSlider', 'addChoices'];

/**
 * 窓を作る（(100, 100)・幅 600・高さ 500。外を押しても閉じない）。
 * @param {Object} [extra] 上書きする窓の設定
 * @returns {UiWindow} 窓
 */
function makeWindow(extra = {}) {
  return new UiWindow(
    { title: 'T', x: WX, y: 100, width: 600, height: 500, onClose: () => {}, closeOnOutside: false, ...extra },
    SCREEN,
  );
}

/**
 * 窓の内側の座標で、タブの列 {x 0・y 0・width 300・3つ} を足す。
 * @param {UiWindow} win 窓
 * @param {Object} [extra] 上書きする設定
 * @returns {number} タブの数
 */
function addThreeTabs(win, extra = {}) {
  return win.addTabs({ x: 0, y: 0, width: 300, labels: ['A', 'B', 'C'], ...extra });
}

/**
 * 押す。
 * @param {UiWindow} win 窓
 * @param {number} x 論理座標の x
 * @param {number} y 論理座標の y
 * @returns {void}
 */
function down(win, x, y) {
  win.onPointer({ type: 'down', x, y });
}

/**
 * 押して離す。
 * @param {UiWindow} win 窓
 * @param {number} x 論理座標の x
 * @param {number} y 論理座標の y
 * @returns {void}
 */
function tap(win, x, y) {
  win.onPointer({ type: 'down', x, y });
  win.onPointer({ type: 'up', x, y });
}

/**
 * view() のタブの列の info を返す。
 * @param {UiWindow} win 窓
 * @returns {Object} タブの列の info
 */
function tabsInfo(win) {
  return win.view().parts.find((p) => p.kind === 'tabs').info;
}

/**
 * 選ばれているタブの番号を、view() の info から読む。
 * @param {UiWindow} win 窓
 * @returns {number} 選ばれているタブの番号
 */
function selectedIndex(win) {
  return tabsInfo(win).tabs.findIndex((t) => t.selected);
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
 * 関数が投げたエラーの文面を返す。
 * @param {Function} fn 呼ぶ関数
 * @returns {string} 文面
 */
function messageOf(fn) {
  try {
    fn();
  } catch (e) {
    return e.message;
  }
  return assert.fail('エラーになるはずが、投げられなかった');
}

/**
 * 押された数を数えるボタンの設定を作る。
 * @param {{n: number}} count 押された数の記録先
 * @param {Object} [extra] 上書き・追加する項目
 * @returns {Object} ボタンの設定（x 0・y 150・width 200・height 88）
 */
function buttonSpec(count, extra = {}) {
  return { x: 0, y: 150, width: 200, label: 'B', onPress: () => { count.n++; }, ...extra };
}

test('addTabs: 1つ目の足し方と、窓の2つ目のタブの列のエラー（設定より先に調べる）', () => {
  const win = makeWindow();
  assert.equal(addThreeTabs(win), 3);
  const message = '[oz] 窓の addTabs: タブの列は1つの窓に1つまでです';
  assertError(() => addThreeTabs(win), message);
  assertError(() => win.addTabs(undefined), message);
});

test('addTabs: 引数の検証の文面と順（要件7の2〜8）', () => {
  const P = '[oz] 窓の addTabs:';
  const good = { x: 0, y: 0, width: 300, labels: ['A'] };
  const cases = [
    [undefined, `${P} spec (タブの列の設定オブジェクト) が渡されていません`],
    [null, `${P} spec (タブの列の設定オブジェクト) が渡されていません`],
    [{ ...good, foo: 1 }, `${P} spec に使えない項目 foo があります`],
    [{ ...good, x: 'a', y: 'b' }, `${P} x は有限の数値で指定してください`],
    [{ ...good, y: Infinity }, `${P} y は有限の数値で指定してください`],
    [{ ...good, width: 0, height: -1 }, `${P} width は正の有限数で指定してください`],
    [{ ...good, height: 0 }, `${P} height は正の有限数で指定してください`],
    [{ ...good, labels: undefined }, `${P} labels は配列で指定してください`],
    [{ ...good, labels: [] }, `${P} labels にタブがありません`],
    [{ ...good, labels: ['A', 5] }, `${P} labels[1] は文字列か、文字列を返す関数で指定してください`],
    // eslint-disable-next-line no-sparse-arrays
    [{ ...good, labels: ['A', , 'C'] }, `${P} labels[1] は文字列か、文字列を返す関数で指定してください`],
  ];
  for (const [spec, message] of cases) {
    assertError(() => makeWindow().addTabs(spec), message);
  }
  // spec が正しくなければ、labels が不正でもまず項目名などが先に調べられる
  assertError(() => makeWindow().addTabs({ ...good, foo: 1, labels: [] }), `${P} spec に使えない項目 foo があります`);
});

test('addTabs: エラーのときは足されず、そのあと正しく足せる', () => {
  const win = makeWindow();
  assert.throws(() => win.addTabs({ x: 0, y: 0, width: 300, labels: [] }));
  assert.equal(win.view().parts.length, 0);
  assert.equal(addThreeTabs(win), 3);
  assert.equal(win.view().parts.length, 1);
});

test('タブの addTabs（addTabs(spec, 0)）は、設定を調べずエラー', () => {
  const win = makeWindow();
  const message = '[oz] タブの addTabs: タブの列はタブに入れられません';
  addThreeTabs(win);
  assertError(() => win.addTabs({ x: 0, y: 0, width: 300, labels: ['A'] }, 0), message);
  assertError(() => win.addTabs(undefined, 1), message);
  assert.equal(win.view().parts.length, 1);
});

test('タブの5つの足す操作と addScroll のエラーの先頭は「[oz] タブの <操作名>:」で、文面と順は窓の同じ操作と同じ', () => {
  const win = makeWindow();
  addThreeTabs(win);
  for (const op of OPS) {
    const bad = [undefined, {}, { x: 0, y: 0, width: 100, foo: 1 }];
    for (const spec of bad) {
      const tabMessage = messageOf(() => win[op](spec, 0));
      const winMessage = messageOf(() => makeWindow()[op](spec));
      assert.ok(tabMessage.startsWith(`[oz] タブの ${op}:`), tabMessage);
      assert.equal(tabMessage.replace(`[oz] タブの ${op}:`, ''), winMessage.replace(`[oz] 窓の ${op}:`, ''));
    }
  }
  const scrollMessage = messageOf(() => win.addScroll(undefined, 0));
  assert.equal(scrollMessage, '[oz] タブの addScroll: spec (スクロールする領域の設定オブジェクト) が渡されていません');
  assertError(
    () => win.addScroll({ x: 0, y: 0, width: 100 }, 0),
    '[oz] タブの addScroll: height は正の有限数で指定してください',
  );
  // 窓に直接足す場合の先頭は今までどおり
  assert.equal(
    messageOf(() => win.addButton(undefined)),
    '[oz] 窓の addButton: spec (ボタンの設定オブジェクト) が渡されていません',
  );
  assert.equal(
    messageOf(() => win.addScroll(undefined)),
    '[oz] 窓の addScroll: spec (スクロールする領域の設定オブジェクト) が渡されていません',
  );
  // どのエラーでも部品は足されない
  assert.equal(win.view().parts.length, 1);
});

test('既定の高さは DEFAULT_TAB_HEIGHT（88）で、height を指定すればそれに従う', () => {
  const win = makeWindow();
  addThreeTabs(win);
  assert.equal(DEFAULT_TAB_HEIGHT, 88);
  const info = tabsInfo(win);
  assert.equal(info.height, 88);
  assert.equal(info.tabs[0].height, 88);
  const win2 = makeWindow();
  addThreeTabs(win2, { height: 60 });
  assert.equal(tabsInfo(win2).height, 60);
  assert.equal(tabsInfo(win2).tabs[2].height, 60);
});

test('labels は足した時点で写され、あとで元の配列を変えても影響しない', () => {
  const win = makeWindow();
  const labels = ['A', 'B'];
  win.addTabs({ x: 0, y: 0, width: 300, labels });
  labels[0] = 'X';
  labels.push('Y');
  assert.deepEqual(tabsInfo(win).tabs.map((t) => t.label), ['A', 'B']);
});

test('等分: 矩形は列を隙間なく等分し、座標は画面の論理座標（窓の内側の左上が原点）', () => {
  const win = makeWindow();
  win.addTabs({ x: 10, y: 20, width: 300, labels: ['A', 'B', 'C'] });
  const info = tabsInfo(win);
  assert.deepEqual(
    { x: info.x, y: info.y, width: info.width, height: info.height },
    { x: WX + 10, y: OY + 20, width: 300, height: 88 },
  );
  assert.deepEqual(
    info.tabs.map((t) => [t.x, t.y, t.width, t.height]),
    [
      [WX + 10, OY + 20, 100, 88],
      [WX + 110, OY + 20, 100, 88],
      [WX + 210, OY + 20, 100, 88],
    ],
  );
});

test('等分: 境の点は後ろ側のタブ（境の手前は前のタブ）', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const y = OY + 10;
  tap(win, WX + 100, y);
  assert.equal(selectedIndex(win), 1);
  tap(win, WX + 100 - 0.5, y);
  assert.equal(selectedIndex(win), 0);
  tap(win, WX + 200, y);
  assert.equal(selectedIndex(win), 2);
  tap(win, WX + 200 - 0.5, y);
  assert.equal(selectedIndex(win), 1);
  tap(win, WX + 299.5, y);
  assert.equal(selectedIndex(win), 2);
});

test('最初は先頭のタブが選ばれていて、どれも押されていない', () => {
  const win = makeWindow();
  addThreeTabs(win);
  assert.deepEqual(tabsInfo(win).tabs.map((t) => t.selected), [true, false, false]);
  assert.deepEqual(tabsInfo(win).tabs.map((t) => t.pressed), [false, false, false]);
});

test('押して離すとそのタブに切り替わり、選ばれているタブを押して離しても変わらない', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const y = OY + 40;
  tap(win, WX + 150, y);
  assert.equal(selectedIndex(win), 1);
  tap(win, WX + 150, y);
  assert.equal(selectedIndex(win), 1);
  tap(win, WX + 50, y);
  assert.equal(selectedIndex(win), 0);
});

test('押している間だけ pressed になり、押し始めたタブの上を離れると消え、戻すと戻る', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const y = OY + 40;
  down(win, WX + 150, y);
  assert.deepEqual(tabsInfo(win).tabs.map((t) => t.pressed), [false, true, false]);
  win.onPointer({ type: 'move', x: WX + 50, y });
  assert.deepEqual(tabsInfo(win).tabs.map((t) => t.pressed), [false, false, false]);
  win.onPointer({ type: 'move', x: WX + 160, y });
  assert.deepEqual(tabsInfo(win).tabs.map((t) => t.pressed), [false, true, false]);
  win.onPointer({ type: 'move', x: WX + 160, y: OY + 200 });
  assert.deepEqual(tabsInfo(win).tabs.map((t) => t.pressed), [false, false, false]);
  win.onPointer({ type: 'up', x: WX + 160, y: OY + 200 });
  assert.deepEqual(tabsInfo(win).tabs.map((t) => t.pressed), [false, false, false]);
  assert.equal(selectedIndex(win), 0);
});

test('外へずらして離す・ほかのタブの上で離すと切り替わらず、戻して離すと切り替わる', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const y = OY + 40;
  down(win, WX + 150, y);
  win.onPointer({ type: 'move', x: WX + 150, y: OY + 300 });
  win.onPointer({ type: 'up', x: WX + 150, y: OY + 300 });
  assert.equal(selectedIndex(win), 0);

  down(win, WX + 150, y);
  win.onPointer({ type: 'move', x: WX + 250, y });
  win.onPointer({ type: 'up', x: WX + 250, y });
  assert.equal(selectedIndex(win), 0);

  down(win, WX + 150, y);
  win.onPointer({ type: 'move', x: WX + 250, y });
  win.onPointer({ type: 'move', x: WX + 130, y });
  win.onPointer({ type: 'up', x: WX + 130, y });
  assert.equal(selectedIndex(win), 1);
});

test("'down' の無い 'up'・'move' には反応しない", () => {
  const win = makeWindow();
  addThreeTabs(win);
  const y = OY + 40;
  win.onPointer({ type: 'up', x: WX + 150, y });
  assert.equal(selectedIndex(win), 0);
  win.onPointer({ type: 'move', x: WX + 150, y });
  assert.deepEqual(tabsInfo(win).tabs.map((t) => t.pressed), [false, false, false]);
  win.onPointer({ type: 'up', x: WX + 150, y });
  assert.equal(selectedIndex(win), 0);
});

test('選ばれていないタブの部品は view() に出ず、押しても反応しない。切り替えると入れ替わる', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const c0 = { n: 0 };
  const c1 = { n: 0 };
  win.addButton(buttonSpec(c0), 0);
  win.addButton(buttonSpec(c1), 1);
  assert.deepEqual(win.view().parts.map((p) => p.kind), ['tabs', 'button']);
  tap(win, WX + 100, OY + 180);
  assert.deepEqual([c0.n, c1.n], [1, 0]);

  tap(win, WX + 150, OY + 40);
  assert.deepEqual(win.view().parts.map((p) => p.kind), ['tabs', 'button']);
  tap(win, WX + 100, OY + 180);
  assert.deepEqual([c0.n, c1.n], [1, 1]);

  tap(win, WX + 250, OY + 40);
  assert.deepEqual(win.view().parts.map((p) => p.kind), ['tabs']);
  tap(win, WX + 100, OY + 180);
  assert.deepEqual([c0.n, c1.n], [1, 1]);
});

test('出ていない部品の上を押すと、その位置にある出ているほかの部品が反応する', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const hidden = { n: 0 };
  const shown = { n: 0 };
  // 後に足した部品が上。タブ 1 の部品が、どのタブにも入れない部品の上に重なっている
  win.addButton(buttonSpec(shown), null);
  win.addButton(buttonSpec(hidden), 1);
  tap(win, WX + 100, OY + 180);
  assert.deepEqual([hidden.n, shown.n], [0, 1]);
  tap(win, WX + 150, OY + 40);
  tap(win, WX + 100, OY + 180);
  assert.deepEqual([hidden.n, shown.n], [1, 1]);
});

test('どのタブにも入れない部品は、どのタブでも出ていて押せる', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const c = { n: 0 };
  win.addButton(buttonSpec(c));
  for (let i = 0; i < 3; i++) {
    tap(win, WX + 50 + i * 100, OY + 40);
    assert.equal(selectedIndex(win), i);
    assert.deepEqual(win.view().parts.map((p) => p.kind), ['tabs', 'button']);
    tap(win, WX + 100, OY + 180);
    assert.equal(c.n, i + 1);
  }
});

test('すべての種類の部品をタブに入れて、出し分けられる', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const base = { x: 0, y: 120, width: 200 };
  win.addButton({ ...base, label: 'b', onPress: () => {} }, 1);
  win.addValue({ ...base, label: 'v', read: () => 1 }, 1);
  win.addCheckbox({ ...base, label: 'c', read: () => true, write: () => {} }, 1);
  win.addSlider({ ...base, label: 's', min: 0, max: 1, step: 0.5, read: () => 0, write: () => {} }, 1);
  win.addChoices({ ...base, choices: [{ label: 'x', value: 1 }], direction: 'horizontal', read: () => 1, write: () => {} }, 1);
  assert.deepEqual(win.view().parts.map((p) => p.kind), ['tabs']);
  tap(win, WX + 150, OY + 40);
  assert.deepEqual(
    win.view().parts.map((p) => p.kind),
    ['tabs', 'button', 'value', 'checkbox', 'slider', 'choices'],
  );
});

test('タブに入れたスクロールする領域も出し分けられる', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const c = { n: 0 };
  const scroll = win.addScroll({ x: 0, y: 100, width: 300, height: 200 }, 1);
  scroll.addButton({ x: 0, y: 0, width: 200, label: 'in', onPress: () => { c.n++; } });
  assert.deepEqual(win.view().parts.map((p) => p.kind), ['tabs']);
  tap(win, WX + 50, OY + 130);
  assert.equal(c.n, 0);

  tap(win, WX + 150, OY + 40);
  const parts = win.view().parts;
  assert.deepEqual(parts.map((p) => p.kind), ['tabs', 'scroll']);
  assert.deepEqual(parts[1].parts.map((p) => p.kind), ['button']);
  tap(win, WX + 50, OY + 130);
  assert.equal(c.n, 1);

  tap(win, WX + 50, OY + 40);
  assert.deepEqual(win.view().parts.map((p) => p.kind), ['tabs']);
  tap(win, WX + 50, OY + 130);
  assert.equal(c.n, 1);
});

test('label が関数なら view() のたびに、タブごとに呼ばれる', () => {
  const win = makeWindow();
  const calls = { a: 0 };
  win.addTabs({ x: 0, y: 0, width: 300, labels: [() => { calls.a++; return `A${calls.a}`; }, 'B'] });
  assert.equal(calls.a, 0);
  assert.equal(tabsInfo(win).tabs[0].label, 'A1');
  assert.equal(tabsInfo(win).tabs[0].label, 'A2');
  assert.equal(calls.a, 2);
});

test('選ばれていないタブの部品の read は view() で呼ばれず、選ばれると呼ばれる', () => {
  const win = makeWindow();
  addThreeTabs(win);
  const reads = { n: 0 };
  win.addCheckbox({ x: 0, y: 150, width: 200, label: 'c', read: () => { reads.n++; return true; }, write: () => {} }, 1);
  win.view();
  win.view();
  assert.equal(reads.n, 0);
  tap(win, WX + 150, OY + 40);
  win.view();
  assert.equal(reads.n, 1);
  win.view();
  assert.equal(reads.n, 2);
});

test('窓の内側で縦に切り取られたタブの列は、残った部分だけが押せる', () => {
  const win = makeWindow();
  win.addTabs({ x: 0, y: -40, width: 300, labels: ['A', 'B', 'C'] });
  // タブの列は画面の y OY - 40 〜 OY + 48。窓の内側は OY から
  tap(win, WX + 150, OY - 10);
  assert.equal(selectedIndex(win), 0);
  tap(win, WX + 150, OY + 10);
  assert.equal(selectedIndex(win), 1);
  tap(win, WX + 250, OY + 47);
  assert.equal(selectedIndex(win), 2);
  tap(win, WX + 50, OY + 48);
  assert.equal(selectedIndex(win), 2);
});

test('窓の内側で横に切り取られたタブの列は、残った部分だけが押せる（窓の外では切り替わらない）', () => {
  const win = makeWindow();
  // 窓の右端は x 700。タブの列は x 500〜900、4つで境は 500・600・700・800
  win.addTabs({ x: 400, y: 0, width: 400, labels: ['A', 'B', 'C', 'D'] });
  tap(win, 550, OY + 40);
  assert.equal(selectedIndex(win), 0);
  tap(win, 699, OY + 40);
  assert.equal(selectedIndex(win), 1);
  tap(win, 705, OY + 40);
  assert.equal(selectedIndex(win), 1);
  tap(win, 550, OY + 40);
  assert.equal(selectedIndex(win), 0);
  tap(win, 705, OY + 40);
  assert.equal(selectedIndex(win), 0);
});

test('窓を作り直すと、選ばれているタブは先頭に戻る', () => {
  const win = makeWindow();
  addThreeTabs(win);
  tap(win, WX + 250, OY + 40);
  assert.equal(selectedIndex(win), 2);
  const win2 = makeWindow();
  addThreeTabs(win2);
  assert.equal(selectedIndex(win2), 0);
});
