/**
 * @fileoverview 責務: oz/src/UiWindow.js のスクロールする領域（addScroll と、領域のモデルの足す操作）の自動テスト。
 * 検証・エラーの先頭・view() の形・中身の高さ・スクロールの位置の計算・位置の表示の形・切り取りと当たり・タブを切り替えても保たれることを確かめる。
 * タブの列は UiWindow.tabs.test.js、タップとドラッグの区別と領域の中のスライダーは UiWindow.scrollDrag.test.js、公開の口は Ui.tabsScroll.test.js が受け持つ。Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';
import {
  DEFAULT_TITLE_BAR_HEIGHT,
  SCROLL_BAR_WIDTH,
  SCROLL_THUMB_MIN_LENGTH,
  SCROLL_DRAG_DISTANCE,
} from '../oz/src/UiMetrics.js';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/** 窓の左上の x（窓の内側の原点の x もこれ）。 */
const WX = 100;

/** 窓の内側の原点の y（窓の y 100 + タイトルバーの高さ）。 */
const OY = 100 + DEFAULT_TITLE_BAR_HEIGHT;

/** 窓の内側の下端の y（窓の y 100 + 高さ 500）。 */
const BOTTOM = 600;

/** 5つの足す操作の名前。 */
const OPS = ['addButton', 'addValue', 'addCheckbox', 'addSlider', 'addChoices'];

/** 領域の中の、ボタンのない場所の x（幅 200 のボタンの右・位置の表示の左）。 */
const BLANK_X = WX + 250;

/**
 * 窓を作る（(100, 100)・幅 600・高さ 500。外を押しても閉じない）。
 * @returns {UiWindow} 窓
 */
function makeWindow() {
  return new UiWindow(
    { title: 'T', x: WX, y: 100, width: 600, height: 500, onClose: () => {}, closeOnOutside: false },
    SCREEN,
  );
}

/**
 * 窓の内側の座標で、領域 {x 0・y 0・width 300・height 200} を足し、中に幅 200・高さ 88 のボタンを
 * y が 0・100・200・300 の位置に4つ足す（中身の高さは 388、スクロールできる量は 188）。
 * @param {UiWindow} win 窓
 * @param {{n: number}} [count] 押された数の記録先
 * @returns {Object} 領域のモデル
 */
function addScrollWithButtons(win, count = { n: 0 }) {
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  for (const y of [0, 100, 200, 300]) {
    scroll.addButton({ x: 0, y, width: 200, height: 88, label: `B${y}`, onPress: () => { count.n++; } });
  }
  return scroll;
}

/**
 * 押して、距離を越えるまで動かし、さらに指定の位置へ動かす（離さない）。
 * 距離を越える動き（距離 + 1）では、スクロールの位置は変わらない。
 * @param {UiWindow} win 窓
 * @param {number} x 押す x
 * @param {number} y 押す y
 * @param {number[]} ys 続けて 'move' する y の並び
 * @returns {void}
 */
function startDrag(win, x, y, ys = []) {
  win.onPointer({ type: 'down', x, y });
  win.onPointer({ type: 'move', x, y: y - (SCROLL_DRAG_DISTANCE + 1) });
  for (const my of ys) win.onPointer({ type: 'move', x, y: my });
}

/**
 * 離す。
 * @param {UiWindow} win 窓
 * @param {number} x 論理座標の x
 * @param {number} y 論理座標の y
 * @returns {void}
 */
function up(win, x, y) {
  win.onPointer({ type: 'up', x, y });
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
 * 部品の無い場所（BLANK_X）で押し、上へ動かしてスクロールの位置を指定の量にする（離す）。
 * 押した位置は領域の中央（OY + 100）で、距離を越える動き + 指定の量だけ上へ動かす。
 * @param {UiWindow} win 窓
 * @param {number} amount 下へスクロールする量（正）
 * @returns {void}
 */
function scrollDown(win, amount) {
  const y = OY + 100;
  startDrag(win, BLANK_X, y, [y - (SCROLL_DRAG_DISTANCE + 1) - amount]);
  up(win, BLANK_X, y - (SCROLL_DRAG_DISTANCE + 1) - amount);
}

/**
 * view() の最初のスクロールする領域の要素を返す。
 * @param {UiWindow} win 窓
 * @returns {{kind: string, info: Object, parts: Object[], scrollBar: (Object|null)}} 領域の要素
 */
function scrollView(win) {
  return win.view().parts.find((p) => p.kind === 'scroll');
}

/**
 * 領域の今のスクロールの位置を、view() の info から読む。
 * @param {UiWindow} win 窓
 * @returns {number} スクロールの位置
 */
function scrollY(win) {
  return scrollView(win).info.scrollY;
}

/**
 * 2つの数が小数の誤差の範囲で等しいことを確かめる。
 * @param {number} actual 実際の値
 * @param {number} expected 期待する値
 * @returns {void}
 */
function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} は ${expected} に近いはず`);
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

test('addScroll: 引数の検証の文面と順（窓。要件7の1〜4）', () => {
  const P = '[oz] 窓の addScroll:';
  const good = { x: 0, y: 0, width: 300, height: 200 };
  const cases = [
    [undefined, `${P} spec (スクロールする領域の設定オブジェクト) が渡されていません`],
    [null, `${P} spec (スクロールする領域の設定オブジェクト) が渡されていません`],
    [{ ...good, foo: 1 }, `${P} spec に使えない項目 foo があります`],
    [{ ...good, x: 'a', y: 'b' }, `${P} x は有限の数値で指定してください`],
    [{ ...good, y: Infinity }, `${P} y は有限の数値で指定してください`],
    [{ ...good, width: 0, height: -1 }, `${P} width は正の有限数で指定してください`],
    [{ ...good, height: 0 }, `${P} height は正の有限数で指定してください`],
    [{ x: 0, y: 0, width: 300 }, `${P} height は正の有限数で指定してください`],
  ];
  for (const [spec, message] of cases) {
    assertError(() => makeWindow().addScroll(spec), message);
  }
  assertError(() => makeWindow().addScroll({ ...good, foo: 1, x: 'a' }), `${P} spec に使えない項目 foo があります`);
});

test('addScroll: タブの addScroll は先頭だけが替わり、同じ順で調べる', () => {
  const win = makeWindow();
  win.addTabs({ x: 0, y: 0, width: 300, labels: ['A'] });
  const cases = [
    [undefined, 'spec (スクロールする領域の設定オブジェクト) が渡されていません'],
    [{ x: 0, y: 0, width: 300, height: 200, foo: 1 }, 'spec に使えない項目 foo があります'],
    [{ x: NaN, y: 0, width: 300, height: 200 }, 'x は有限の数値で指定してください'],
    [{ x: 0, y: 0, width: 300 }, 'height は正の有限数で指定してください'],
  ];
  for (const [spec, body] of cases) {
    assertError(() => win.addScroll(spec, 0), `[oz] タブの addScroll: ${body}`);
    assertError(() => makeWindow().addScroll(spec), `[oz] 窓の addScroll: ${body}`);
  }
});

test('addScroll: エラーのときは足されず、そのあと正しく足せる', () => {
  const win = makeWindow();
  assert.throws(() => win.addScroll({ x: 0, y: 0, width: 300 }));
  assert.equal(win.view().parts.length, 0);
  win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  assert.equal(win.view().parts.length, 1);
});

test('領域の addTabs・addScroll は、設定を調べず必ずエラー', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  const tabsMessage = '[oz] スクロールする領域の addTabs: タブの列はスクロールする領域に入れられません';
  const scrollMessage = '[oz] スクロールする領域の addScroll: スクロールする領域はスクロールする領域に入れられません';
  assertError(() => scroll.addTabs({ x: 0, y: 0, width: 300, labels: ['A'] }), tabsMessage);
  assertError(() => scroll.addTabs(undefined), tabsMessage);
  assertError(() => scroll.addScroll({ x: 0, y: 0, width: 100, height: 100 }), scrollMessage);
  assertError(() => scroll.addScroll(undefined), scrollMessage);
  assert.equal(scrollView(win).parts.length, 0);
  // 窓にタブの列を足すことは、領域があっても妨げられない
  assert.equal(win.addTabs({ x: 0, y: 300, width: 300, labels: ['A'] }), 1);
});

test('領域の5つの足す操作のエラーの先頭は「[oz] スクロールする領域の <操作名>:」で、文面と順は窓の同じ操作と同じ', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  for (const op of OPS) {
    const bad = [undefined, {}, { x: 0, y: 0, width: 100, foo: 1 }];
    for (const spec of bad) {
      const scrollMessage = messageOf(() => scroll[op](spec));
      const winMessage = messageOf(() => makeWindow()[op](spec));
      assert.ok(scrollMessage.startsWith(`[oz] スクロールする領域の ${op}:`), scrollMessage);
      assert.equal(
        scrollMessage.replace(`[oz] スクロールする領域の ${op}:`, ''),
        winMessage.replace(`[oz] 窓の ${op}:`, ''),
      );
    }
  }
  // エラーでは中の部品は足されず、中身の高さも変わらない
  assert.equal(scrollView(win).parts.length, 0);
  assert.equal(scrollView(win).info.contentHeight, 200);
});

test('view(): 領域の kind と info の項目、中の部品の矩形（領域の中身の左上が原点）', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 10, y: 20, width: 300, height: 200 });
  scroll.addButton({ x: 5, y: 7, width: 100, height: 88, label: 'B', onPress: () => {} });
  const v = scrollView(win);
  assert.equal(v.kind, 'scroll');
  assert.deepEqual(Object.keys(v.info).sort(), [
    'contentHeight', 'dragging', 'height', 'scrollY', 'scrollable', 'textSize', 'width', 'x', 'y',
  ]);
  assert.deepEqual(
    { x: v.info.x, y: v.info.y, width: v.info.width, height: v.info.height },
    { x: WX + 10, y: OY + 20, width: 300, height: 200 },
  );
  assert.equal(v.info.scrollY, 0);
  assert.equal(v.info.dragging, false);
  assert.equal(typeof v.info.textSize, 'number');
  assert.equal(v.parts.length, 1);
  assert.equal(v.parts[0].kind, 'button');
  const b = v.parts[0].info;
  assert.deepEqual(
    { x: b.x, y: b.y, width: b.width, height: b.height },
    { x: WX + 10 + 5, y: OY + 20 + 7, width: 100, height: 88 },
  );
});

test('view(): 窓の parts の順で、領域の後に足した窓の部品はその後に並ぶ', () => {
  const win = makeWindow();
  win.addButton({ x: 0, y: 300, width: 100, label: 'before', onPress: () => {} });
  win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  win.addButton({ x: 0, y: 400, width: 100, label: 'after', onPress: () => {} });
  assert.deepEqual(win.view().parts.map((p) => p.kind), ['button', 'scroll', 'button']);
});

test('中身の高さ: 部品が無い・収まるときは領域の高さで、スクロールできず scrollBar は null', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  let v = scrollView(win);
  assert.equal(v.info.contentHeight, 200);
  assert.equal(v.info.scrollable, false);
  assert.equal(v.scrollBar, null);
  scroll.addButton({ x: 0, y: 100, width: 200, height: 100, label: 'B', onPress: () => {} });
  v = scrollView(win);
  assert.equal(v.info.contentHeight, 200);
  assert.equal(v.info.scrollable, false);
  assert.equal(v.scrollBar, null);
  // 収まっているときは、ずらしても動かない
  scrollDown(win, 50);
  assert.equal(scrollY(win), 0);
});

test('中身の高さ: 中の部品の下端（y + height）の最大になる（足した順によらない）', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  scroll.addButton({ x: 0, y: 300, width: 200, height: 88, label: 'B', onPress: () => {} });
  assert.equal(scrollView(win).info.contentHeight, 388);
  scroll.addButton({ x: 0, y: 0, width: 200, height: 88, label: 'B', onPress: () => {} });
  assert.equal(scrollView(win).info.contentHeight, 388);
  scroll.addValue({ x: 0, y: 350, width: 200, height: 50, label: 'V', read: () => 1 });
  const v = scrollView(win);
  assert.equal(v.info.contentHeight, 400);
  assert.equal(v.info.scrollable, true);
  assert.notEqual(v.scrollBar, null);
});

test('スクロールの位置: ずらした量だけ動く。距離を越えた最初の move では動かず、そこから指に付いて動く', () => {
  const win = makeWindow();
  addScrollWithButtons(win);
  const y = OY + 100;
  win.onPointer({ type: 'down', x: BLANK_X, y });
  win.onPointer({ type: 'move', x: BLANK_X, y: y - (SCROLL_DRAG_DISTANCE + 1) });
  assert.equal(scrollY(win), 0);
  win.onPointer({ type: 'move', x: BLANK_X, y: y - (SCROLL_DRAG_DISTANCE + 1) - 30 });
  assert.equal(scrollY(win), 30);
  win.onPointer({ type: 'move', x: BLANK_X, y: y - (SCROLL_DRAG_DISTANCE + 1) - 10 });
  assert.equal(scrollY(win), 10);
  up(win, BLANK_X, y);
  assert.equal(scrollY(win), 10);
});

test('スクロールの位置: 下端（contentHeight - height）と上端（0）で止まり、指を戻すと戻した分だけすぐ動く', () => {
  const win = makeWindow();
  addScrollWithButtons(win);
  const y = OY + 100;
  const start = y - (SCROLL_DRAG_DISTANCE + 1);
  startDrag(win, BLANK_X, y, [start - 1000]);
  assert.equal(scrollY(win), 188);
  // 下端より先へ指を動かしても止まったまま
  win.onPointer({ type: 'move', x: BLANK_X, y: start - 2000 });
  assert.equal(scrollY(win), 188);
  // 戻した分だけすぐに動く（先へ動かした分は取り戻さなくてよい）
  win.onPointer({ type: 'move', x: BLANK_X, y: start - 2000 + 25 });
  assert.equal(scrollY(win), 163);
  // 上端
  win.onPointer({ type: 'move', x: BLANK_X, y: start + 5000 });
  assert.equal(scrollY(win), 0);
  win.onPointer({ type: 'move', x: BLANK_X, y: start + 5000 - 7 });
  assert.equal(scrollY(win), 7);
  up(win, BLANK_X, start + 5000 - 7);
  assert.equal(scrollY(win), 7);
});

test('スクロールの位置: 離したその位置で止まり、次の押し始めからまた動かせる', () => {
  const win = makeWindow();
  addScrollWithButtons(win);
  scrollDown(win, 60);
  assert.equal(scrollY(win), 60);
  assert.equal(scrollView(win).info.dragging, false);
  scrollDown(win, 40);
  assert.equal(scrollY(win), 100);
});

test('スクロールの位置: ドラッグ中だけ dragging が真になる（info と scrollBar）', () => {
  const win = makeWindow();
  addScrollWithButtons(win);
  const y = OY + 100;
  win.onPointer({ type: 'down', x: BLANK_X, y });
  assert.equal(scrollView(win).info.dragging, false);
  win.onPointer({ type: 'move', x: BLANK_X, y: y - (SCROLL_DRAG_DISTANCE + 1) });
  assert.equal(scrollView(win).info.dragging, true);
  assert.equal(scrollView(win).scrollBar.dragging, true);
  up(win, BLANK_X, y);
  assert.equal(scrollView(win).info.dragging, false);
  assert.equal(scrollView(win).scrollBar.dragging, false);
});

test('中の部品の矩形は、スクロールの位置に合わせて上へずれる', () => {
  const win = makeWindow();
  addScrollWithButtons(win);
  const ys = () => scrollView(win).parts.map((p) => p.info.y);
  assert.deepEqual(ys(), [OY, OY + 100]);
  scrollDown(win, 60);
  // y 0 のボタンは領域の上端から 60 はみ出して下 28 が見え、まだ view() に残る
  assert.deepEqual(ys(), [OY - 60, OY + 40, OY + 140]);
  scrollDown(win, 128);
  // 下端まで（188）。y 0 のボタンは領域と重ならず、y 100 のボタン（OY - 88 〜 OY）は上端に接するだけなので、どちらも view() に出ない
  assert.equal(scrollY(win), 188);
  assert.deepEqual(ys(), [OY + 12, OY + 112]);
});

test('位置の表示: 帯は領域の右端の内側、つまみの長さと位置は中身の量とスクロールの位置から決まる', () => {
  const win = makeWindow();
  addScrollWithButtons(win);
  const rectX = WX + 300 - SCROLL_BAR_WIDTH;
  let bar = scrollView(win).scrollBar;
  assert.deepEqual(
    { x: bar.x, y: bar.y, width: bar.width, height: bar.height },
    { x: rectX, y: OY, width: SCROLL_BAR_WIDTH, height: 200 },
  );
  const thumbH = (200 * 200) / 388;
  assert.equal(bar.thumb.x, rectX);
  assert.equal(bar.thumb.width, SCROLL_BAR_WIDTH);
  near(bar.thumb.height, thumbH);
  near(bar.thumb.y, OY);
  assert.equal(bar.scrollY, 0);
  assert.equal(bar.contentHeight, 388);
  scrollDown(win, 94);
  bar = scrollView(win).scrollBar;
  near(bar.thumb.y, OY + ((200 - thumbH) * 94) / 188);
  assert.equal(bar.scrollY, 94);
  scrollDown(win, 1000);
  bar = scrollView(win).scrollBar;
  near(bar.thumb.y + bar.thumb.height, OY + 200);
});

test('位置の表示: つまみは最短 SCROLL_THUMB_MIN_LENGTH（44）より短くならず、領域の高さを越えない', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  scroll.addButton({ x: 0, y: 5000, width: 200, height: 88, label: 'B', onPress: () => {} });
  assert.equal(scrollView(win).scrollBar.thumb.height, SCROLL_THUMB_MIN_LENGTH);
  assert.equal(SCROLL_THUMB_MIN_LENGTH, 44);
  // 領域の高さが最短より小さいときは、領域の高さまで
  const win2 = makeWindow();
  const small = win2.addScroll({ x: 0, y: 0, width: 300, height: 30 });
  small.addButton({ x: 0, y: 100, width: 200, height: 88, label: 'B', onPress: () => {} });
  assert.equal(scrollView(win2).scrollBar.thumb.height, 30);
});

test('位置の表示の上を押しても、領域のほかの場所と同じ扱い（ずらすと中身が指に付いて動く）', () => {
  const win = makeWindow();
  addScrollWithButtons(win);
  const barX = WX + 300 - SCROLL_BAR_WIDTH / 2;
  const y = OY + 100;
  startDrag(win, barX, y, [y - (SCROLL_DRAG_DISTANCE + 1) - 40]);
  assert.equal(scrollY(win), 40);
  up(win, barX, y);
});

test('切り取り: 領域と重ならない中の部品は view() に出ず、read も呼ばれない', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  const reads = { inside: 0, outside: 0 };
  scroll.addValue({ x: 0, y: 0, width: 200, height: 88, label: 'in', read: () => { reads.inside++; return 1; } });
  scroll.addValue({ x: 0, y: 300, width: 200, height: 88, label: 'out', read: () => { reads.outside++; return 2; } });
  // 領域の下端にちょうど接する部品は、重なりが無いので出ない
  scroll.addValue({ x: 0, y: 200, width: 200, height: 88, label: 'edge', read: () => 3 });
  const v = scrollView(win);
  assert.deepEqual(v.parts.map((p) => p.info.label), ['in']);
  assert.deepEqual(reads, { inside: 1, outside: 0 });
  // スクロールすれば現れて、そのとき初めて read が呼ばれる
  scrollDown(win, 188);
  assert.equal(reads.outside, 0);
  const v2 = scrollView(win);
  assert.deepEqual(v2.parts.map((p) => p.info.label), ['out', 'edge']);
  assert.equal(reads.outside, 1);
  assert.equal(reads.inside, 1);
});

test('切り取り: 領域に入れた部品を足すだけでは read が呼ばれず、view() のたびに1回ずつ呼ばれる', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  let reads = 0;
  scroll.addValue({ x: 0, y: 0, width: 200, height: 88, label: 'in', read: () => { reads++; return 1; } });
  assert.equal(reads, 0);
  scrollView(win);
  scrollView(win);
  assert.equal(reads, 2);
});

test('当たり: 領域からはみ出した部分は押せない（見えている部分だけが押せる）', () => {
  const win = makeWindow();
  const count = { n: 0 };
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 100 });
  scroll.addButton({ x: 0, y: 60, width: 200, height: 88, label: 'B', onPress: () => { count.n++; } });
  scroll.addButton({ x: 0, y: 160, width: 200, height: 88, label: 'C', onPress: () => { count.n += 100; } });
  // 領域は y OY 〜 OY + 100。ボタンは OY + 60 〜 OY + 148 で、見えるのは OY + 100 まで
  tap(win, WX + 50, OY + 80);
  assert.equal(count.n, 1);
  tap(win, WX + 50, OY + 120);
  assert.equal(count.n, 1);
  // 領域の外にある y 160 のボタンの場所は、領域の外なので反応しない
  tap(win, WX + 50, OY + 170);
  assert.equal(count.n, 1);
});

test('当たり: スクロールした後のボタンは、見えている位置で押せて、元の位置では押せない', () => {
  const win = makeWindow();
  const count = { n: 0 };
  addScrollWithButtons(win, count);
  scrollDown(win, 188);
  // y 300 のボタンは、いちばん下で領域の y 112〜200 に来る
  tap(win, WX + 50, OY + 150);
  assert.equal(count.n, 1);
  // 元の位置（スクロール 0 のときに y 300 の部品があった位置）は領域の外
  tap(win, WX + 50, OY + 320);
  assert.equal(count.n, 1);
});

test('当たり: 窓の内側からはみ出した領域の部分は押せない（領域も部品も）', () => {
  const win = makeWindow();
  const count = { n: 0 };
  // 窓の内側は OY 〜 600（高さ 412）。領域は OY + 300 〜 OY + 500 で、下の OY + 412 から先は窓の外
  const scroll = win.addScroll({ x: 0, y: 300, width: 300, height: 200 });
  scroll.addButton({ x: 0, y: 100, width: 200, height: 88, label: 'B', onPress: () => { count.n++; } });
  // ボタンは OY + 400 〜 OY + 488。窓の内側の下端（600 = OY + 412）の手前を押すと反応する
  tap(win, WX + 50, BOTTOM - 5);
  assert.equal(count.n, 1);
  tap(win, WX + 50, BOTTOM + 5);
  assert.equal(count.n, 1);
  // 窓の外の押し始めでは、領域は持ち主にならずドラッグもできない
  win.onPointer({ type: 'down', x: BLANK_X, y: BOTTOM + 5 });
  win.onPointer({ type: 'move', x: BLANK_X, y: BOTTOM - 100 });
  win.onPointer({ type: 'up', x: BLANK_X, y: BOTTOM - 100 });
  assert.equal(scrollY(win), 0);
});

test('部品の無いところを押して、中の部品の有無にかかわらずずらせる（数値の表示の上でも）', () => {
  const win = makeWindow();
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  scroll.addValue({ x: 0, y: 0, width: 200, height: 88, label: 'V', read: () => 1 });
  scroll.addValue({ x: 0, y: 300, width: 200, height: 88, label: 'W', read: () => 1 });
  const y = OY + 40;
  startDrag(win, WX + 50, y, [y - (SCROLL_DRAG_DISTANCE + 1) - 70]);
  assert.equal(scrollY(win), 70);
  up(win, WX + 50, y);
});

test('スクロールの位置は、タブを切り替えて戻っても保たれる', () => {
  const win = makeWindow();
  win.addTabs({ x: 0, y: 0, width: 300, labels: ['A', 'B'] });
  const scroll = win.addScroll({ x: 0, y: 100, width: 300, height: 200 }, 0);
  for (const y of [0, 100, 200, 300]) {
    scroll.addButton({ x: 0, y, width: 200, height: 88, label: `B${y}`, onPress: () => {} });
  }
  win.addValue({ x: 0, y: 350, width: 200, label: 'V', read: () => 0 }, 1);
  const y = OY + 200;
  startDrag(win, BLANK_X, y, [y - (SCROLL_DRAG_DISTANCE + 1) - 90]);
  up(win, BLANK_X, y);
  assert.equal(scrollY(win), 90);
  // タブ B（x 150〜300）へ切り替えると領域は出ない
  tap(win, WX + 250, OY + 40);
  assert.equal(win.view().parts.some((p) => p.kind === 'scroll'), false);
  // タブ A に戻ると、同じ位置のまま
  tap(win, WX + 50, OY + 40);
  assert.equal(scrollY(win), 90);
  assert.deepEqual(scrollView(win).parts.map((p) => p.info.y), [OY + 110, OY + 210]);
});

test('部品を足しても、スクロールの位置は変わらない（中身の高さだけが増える）', () => {
  const win = makeWindow();
  const scroll = addScrollWithButtons(win);
  scrollDown(win, 50);
  assert.equal(scrollY(win), 50);
  scroll.addButton({ x: 0, y: 500, width: 200, height: 88, label: 'late', onPress: () => {} });
  const v = scrollView(win);
  assert.equal(v.info.scrollY, 50);
  assert.equal(v.info.contentHeight, 588);
  // 足した部品は今のスクロールの位置での矩形で作られる
  scrollDown(win, 1000);
  assert.equal(scrollY(win), 388);
  assert.equal(scrollView(win).parts.at(-1).info.y, OY + 500 - 388);
});
