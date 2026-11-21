/**
 * @fileoverview 責務: oz/src/UiWindow.js の addChoices（設定の検証、選択肢の写し、既定の高さ、等分、selected、read・write の呼ばれ方、押す・ずらす・離す・取り消し）の自動テスト。
 * 横と縦の両方を確かめる。Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';
import { DEFAULT_PART_HEIGHT, DEFAULT_TEXT_SIZE } from '../oz/src/UiMetrics.js';

const PREFIX = '[oz] 窓の addChoices: ';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/*
 * 窓の形（makeWindow）: 窓 (100, 100)-(700, 500)、タイトルバー y 100〜188、
 * 窓の内側 x 100〜700・y 188〜500（部品の原点は (100, 188)）。
 * 横の列（addRow）: spec x 0・y 10・width 300・選択肢 3 つ（値 'a'・'b'・'c'）→ 画面の矩形 x 100〜400・y 198〜286（高さ 88）。
 *   境は x = 200・300。選択肢 0 は x 100〜200、1 は 200〜300、2 は 300〜400。
 * 縦の列（addColumn）: spec x 0・y 10・width 200・選択肢 3 つ → 画面の矩形 x 100〜300・y 198〜462（高さ 88 × 3 = 264）。
 *   境は y = 286・374。選択肢 0 は y 198〜286、1 は 286〜374、2 は 374〜462。
 */

/**
 * 窓を作る。
 * @returns {{win: UiWindow, closes: () => number}} 窓と onClose の回数の取得
 */
function makeWindow() {
  let n = 0;
  const win = new UiWindow(
    { title: 'T', x: 100, y: 100, width: 600, height: 400, onClose: () => { n++; } },
    SCREEN,
  );
  return { win, closes: () => n };
}

/**
 * 値を読む関数と書く関数を記録する。値は `current` に持ち、write は値を変えない（記録だけ）。
 * @param {*} value read が返す値
 * @returns {{read: Function, write: Function, reads: () => number, writes: () => Array<*>, set: (v: *) => void}} 記録
 */
function makeIo(value) {
  let current = value;
  let reads = 0;
  const written = [];
  return {
    read: () => { reads++; return current; },
    write: (v) => { written.push(v); },
    reads: () => reads,
    writes: () => written.slice(),
    set: (v) => { current = v; },
  };
}

/**
 * 3つの選択肢の一覧を作る。
 * @returns {Array<{label: string, value: string}>} 値は 'a'・'b'・'c'
 */
function threeChoices() {
  return [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ];
}

/**
 * 正しい選択肢の列の設定（横）を作る。
 * @param {Object} [extra] 上書き・追加する項目
 * @returns {Object} spec
 */
function goodSpec(extra = {}) {
  return { x: 0, y: 10, width: 300, choices: threeChoices(), read: () => 'a', write: () => {}, ...extra };
}

/**
 * 横の選択肢の列を1つ足した窓を作る。
 * @param {*} value read が返す値
 * @param {Object} [extra] 上書き・追加する spec の項目
 * @returns {{win: UiWindow, io: ReturnType<typeof makeIo>, closes: () => number}} 窓と記録
 */
function addRow(value, extra = {}) {
  const { win, closes } = makeWindow();
  const io = makeIo(value);
  win.addChoices(goodSpec({ read: io.read, write: io.write, ...extra }));
  return { win, io, closes };
}

/**
 * 縦の選択肢の列を1つ足した窓を作る（x 0・y 10・width 200）。
 * @param {*} value read が返す値
 * @param {Object} [extra] 上書き・追加する spec の項目
 * @returns {{win: UiWindow, io: ReturnType<typeof makeIo>, closes: () => number}} 窓と記録
 */
function addColumn(value, extra = {}) {
  return addRow(value, { width: 200, direction: 'vertical', ...extra });
}

/**
 * ポインタを渡す。
 * @param {UiWindow} win 窓
 * @param {string} type 'down' | 'move' | 'up'
 * @param {number} x 論理座標の x
 * @param {number} y 論理座標の y
 * @returns {void}
 */
function ptr(win, type, x, y) {
  win.onPointer({ type, x, y });
}

/**
 * view() の最初の部品の info を返す。
 * @param {UiWindow} win 窓
 * @returns {Object} info
 */
function infoOf(win) {
  return win.view().parts[0].info;
}

/**
 * view() の最初の部品の、選択肢ごとの pressed を返す。
 * @param {UiWindow} win 窓
 * @returns {boolean[]} pressed の配列
 */
function pressedOf(win) {
  return infoOf(win).choices.map((c) => c.pressed);
}

/**
 * 呼び出しが、種類 Error と文面の一致で失敗することを確かめる。
 * @param {() => void} fn 呼び出し
 * @param {string} message 期待する文面（先頭を含む）
 * @returns {void}
 */
function assertError(fn, message) {
  assert.throws(fn, (e) => e instanceof Error && e.constructor === Error && e.message === message);
}

test('addChoices: spec がオブジェクトでない', () => {
  const msg = PREFIX + 'spec (選択肢の列の設定オブジェクト) が渡されていません';
  for (const bad of [undefined, null, [], 'x', 1]) {
    assertError(() => makeWindow().win.addChoices(bad), msg);
  }
});

test('addChoices: 知らない項目', () => {
  assertError(
    () => makeWindow().win.addChoices(goodSpec({ enabled: () => true })),
    PREFIX + 'spec に使えない項目 enabled があります',
  );
});

test('addChoices: x・y（x が先）・width・height', () => {
  const w = makeWindow().win;
  assertError(() => w.addChoices(goodSpec({ x: undefined })), PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addChoices(goodSpec({ x: NaN, y: NaN })), PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addChoices(goodSpec({ y: Infinity })), PREFIX + 'y は有限の数値で指定してください');
  assertError(() => w.addChoices(goodSpec({ width: undefined })), PREFIX + 'width は正の有限数で指定してください');
  assertError(() => w.addChoices(goodSpec({ width: 0 })), PREFIX + 'width は正の有限数で指定してください');
  assertError(() => w.addChoices(goodSpec({ height: 0 })), PREFIX + 'height は正の有限数で指定してください');
  assertError(() => w.addChoices(goodSpec({ height: Infinity })), PREFIX + 'height は正の有限数で指定してください');
  assertError(() => w.addChoices(goodSpec({ width: -1, height: 0 })), PREFIX + 'width は正の有限数で指定してください');
});

test("addChoices: direction は 'horizontal' か 'vertical'（書かれているとき）", () => {
  const w = makeWindow().win;
  const msg = PREFIX + "direction は 'horizontal' か 'vertical' で指定してください";
  for (const bad of ['', 'diagonal', null, 1, 'Horizontal']) {
    assertError(() => w.addChoices(goodSpec({ direction: bad })), msg);
  }
  w.addChoices(goodSpec({ direction: 'horizontal' }));
  w.addChoices(goodSpec({ direction: 'vertical' }));
  w.addChoices(goodSpec({ direction: undefined }));
  assert.equal(w.view().parts.length, 3);
});

test('addChoices: choices は配列で指定する', () => {
  const w = makeWindow().win;
  const msg = PREFIX + 'choices は配列で指定してください';
  for (const bad of [undefined, null, 'abc', 3, {}, { length: 1, 0: { label: 'A', value: 1 } }]) {
    assertError(() => w.addChoices(goodSpec({ choices: bad })), msg);
  }
});

test('addChoices: 選択肢が 0 個はエラー', () => {
  assertError(
    () => makeWindow().win.addChoices(goodSpec({ choices: [] })),
    PREFIX + 'choices に選択肢がありません',
  );
});

test('addChoices: 選択肢 a（label と value を持つオブジェクトでない。配列の穴も）', () => {
  const w = makeWindow().win;
  const msg0 = PREFIX + 'choices[0] は label と value を持つオブジェクトで指定してください';
  for (const bad of [undefined, null, [], 'x', 1]) {
    assertError(() => w.addChoices(goodSpec({ choices: [bad] })), msg0);
  }
  assertError(
    () => w.addChoices(goodSpec({ choices: [{ label: 'A', value: 1 }, null] })),
    PREFIX + 'choices[1] は label と value を持つオブジェクトで指定してください',
  );
  // eslint-disable-next-line no-sparse-arrays
  const holey = [{ label: 'A', value: 1 }, , { label: 'C', value: 3 }];
  assertError(
    () => w.addChoices(goodSpec({ choices: holey })),
    PREFIX + 'choices[1] は label と value を持つオブジェクトで指定してください',
  );
});

test('addChoices: 選択肢 b（使えない項目）', () => {
  assertError(
    () => makeWindow().win.addChoices(goodSpec({ choices: [{ label: 'A', value: 1 }, { label: 'B', value: 2, enabled: true }] })),
    PREFIX + 'choices[1] に使えない項目 enabled があります',
  );
});

test('addChoices: 選択肢 c（label は文字列か関数）', () => {
  const w = makeWindow().win;
  for (const bad of [undefined, 1, null, {}]) {
    assertError(
      () => w.addChoices(goodSpec({ choices: [{ label: bad, value: 1 }] })),
      PREFIX + 'choices[0].label は文字列か、文字列を返す関数で指定してください',
    );
  }
  assertError(
    () => w.addChoices(goodSpec({ choices: [{ label: 'A', value: 1 }, { value: 2 }] })),
    PREFIX + 'choices[1].label は文字列か、文字列を返す関数で指定してください',
  );
});

test('addChoices: 選択肢 d（value が undefined）。null・0・空文字・false は通る', () => {
  const w = makeWindow().win;
  assertError(
    () => w.addChoices(goodSpec({ choices: [{ label: 'A' }] })),
    PREFIX + 'choices[0].value を指定してください',
  );
  assertError(
    () => w.addChoices(goodSpec({ choices: [{ label: 'A', value: 1 }, { label: 'B', value: undefined }] })),
    PREFIX + 'choices[1].value を指定してください',
  );
  w.addChoices(goodSpec({ choices: [
    { label: 'N', value: null },
    { label: 'Z', value: 0 },
    { label: 'E', value: '' },
    { label: 'F', value: false },
  ] }));
  assert.equal(infoOf(w).choices.length, 4);
});

test('addChoices: 選択肢 e（値の重なり。=== で比べ、最初の番号を示す）', () => {
  const w = makeWindow().win;
  assertError(
    () => w.addChoices(goodSpec({ choices: [{ label: 'A', value: 1 }, { label: 'B', value: 1 }] })),
    PREFIX + 'choices[1].value が choices[0].value と同じです',
  );
  assertError(
    () => w.addChoices(goodSpec({ choices: [
      { label: 'A', value: 'x' }, { label: 'B', value: 'y' }, { label: 'C', value: 'y' },
    ] })),
    PREFIX + 'choices[2].value が choices[1].value と同じです',
  );
  // 3つとも同じなら、i より前で最初に同じ番号（0）を示す
  assertError(
    () => w.addChoices(goodSpec({ choices: [
      { label: 'A', value: 7 }, { label: 'B', value: 8 }, { label: 'C', value: 7 },
    ] })),
    PREFIX + 'choices[2].value が choices[0].value と同じです',
  );
  const sameObject = {};
  assertError(
    () => w.addChoices(goodSpec({ choices: [{ label: 'A', value: sameObject }, { label: 'B', value: sameObject }] })),
    PREFIX + 'choices[1].value が choices[0].value と同じです',
  );
});

test('addChoices: 値が === で違えば重ならない（1 と "1"、0 と false、NaN どうし、別のオブジェクト）', () => {
  const w = makeWindow().win;
  w.addChoices(goodSpec({ choices: [
    { label: 'A', value: 1 },
    { label: 'B', value: '1' },
    { label: 'C', value: 0 },
    { label: 'D', value: false },
    { label: 'E', value: NaN },
    { label: 'F', value: NaN },
    { label: 'G', value: {} },
    { label: 'H', value: {} },
  ] }));
  assert.equal(infoOf(w).choices.length, 8);
});

test('addChoices: 検証の順（知らない項目 → x → width → direction → choices → 選択肢 → read → write）', () => {
  const w = makeWindow().win;
  assertError(
    () => w.addChoices({ enabled: 1, x: 'a', width: 0, direction: 'q', choices: 'z', read: 1, write: 1 }),
    PREFIX + 'spec に使えない項目 enabled があります',
  );
  assertError(
    () => w.addChoices({ x: 'a', width: 0, direction: 'q', choices: 'z', read: 1, write: 1 }),
    PREFIX + 'x は有限の数値で指定してください',
  );
  assertError(
    () => w.addChoices({ x: 0, y: 0, width: 0, direction: 'q', choices: 'z', read: 1, write: 1 }),
    PREFIX + 'width は正の有限数で指定してください',
  );
  assertError(
    () => w.addChoices({ x: 0, y: 0, width: 5, direction: 'q', choices: 'z', read: 1, write: 1 }),
    PREFIX + "direction は 'horizontal' か 'vertical' で指定してください",
  );
  assertError(
    () => w.addChoices({ x: 0, y: 0, width: 5, choices: 'z', read: 1, write: 1 }),
    PREFIX + 'choices は配列で指定してください',
  );
  assertError(
    () => w.addChoices({ x: 0, y: 0, width: 5, choices: [], read: 1, write: 1 }),
    PREFIX + 'choices に選択肢がありません',
  );
  // 選択肢の誤り（1つ目の c）は、2つ目の選択肢の誤りと read・write より先
  assertError(
    () => w.addChoices({ x: 0, y: 0, width: 5, choices: [{ label: 1, value: 1 }, null], read: 1, write: 1 }),
    PREFIX + 'choices[0].label は文字列か、文字列を返す関数で指定してください',
  );
  // 1つの選択肢の a〜e を調べてから次へ（label の誤りは同じ選択肢の value の誤りより先）
  assertError(
    () => w.addChoices({ x: 0, y: 0, width: 5, choices: [{ label: 1 }], read: 1, write: 1 }),
    PREFIX + 'choices[0].label は文字列か、文字列を返す関数で指定してください',
  );
  assertError(
    () => w.addChoices({ x: 0, y: 0, width: 5, choices: threeChoices(), read: 1, write: 1 }),
    PREFIX + 'read は関数で指定してください',
  );
  assertError(
    () => w.addChoices({ x: 0, y: 0, width: 5, choices: threeChoices(), read: () => 0, write: 1 }),
    PREFIX + 'write は関数で指定してください',
  );
});

test('addChoices: エラーのときは部品が足されない', () => {
  const w = makeWindow().win;
  assertError(() => w.addChoices(goodSpec({ choices: [] })), PREFIX + 'choices に選択肢がありません');
  assert.deepEqual(w.view().parts, []);
});

test('addChoices: 戻り値は使わない（undefined）', () => {
  const { win } = makeWindow();
  assert.equal(win.addChoices(goodSpec()), undefined);
});

test('選択肢の一覧は写される（後から元の配列・要素を変えても影響しない）', () => {
  const list = threeChoices();
  const { win } = makeWindow();
  win.addChoices(goodSpec({ choices: list }));
  list[0].label = 'X';
  list[0].value = 'x';
  list[1] = { label: 'Y', value: 'y' };
  list.push({ label: 'Z', value: 'z' });
  const info = infoOf(win);
  assert.equal(info.choices.length, 3);
  assert.deepEqual(info.choices.map((c) => [c.label, c.value]), [['A', 'a'], ['B', 'b'], ['C', 'c']]);
});

test('既定の高さ: 横は 88、縦は 88 × 選択肢の数。direction の既定は horizontal', () => {
  assert.equal(DEFAULT_PART_HEIGHT, 88);
  const row = addRow('a');
  const info = infoOf(row.win);
  assert.equal(row.win.view().parts[0].kind, 'choices');
  assert.equal(info.direction, 'horizontal');
  assert.equal(info.height, 88);
  assert.equal(info.x, 100);
  assert.equal(info.y, 198);
  assert.equal(info.width, 300);
  const col = addColumn('a');
  const cinfo = infoOf(col.win);
  assert.equal(cinfo.direction, 'vertical');
  assert.equal(cinfo.height, 264);
  assert.equal(cinfo.width, 200);
  const two = addColumn('a', { choices: threeChoices().slice(0, 2) });
  assert.equal(infoOf(two.win).height, 176);
});

test('高さを渡せば、その高さになる（等分も渡した高さで行う）', () => {
  const row = addRow('a', { height: 50 });
  assert.equal(infoOf(row.win).height, 50);
  assert.equal(infoOf(row.win).choices[0].height, 50);
  const col = addColumn('a', { height: 90 });
  const info = infoOf(col.win);
  assert.equal(info.height, 90);
  assert.deepEqual(info.choices.map((c) => [c.y, c.height]), [[198, 30], [228, 30], [258, 30]]);
});

test('等分（横）: 選択肢の矩形は隙間なく並ぶ', () => {
  const { win } = addRow('a');
  const rects = infoOf(win).choices.map((c) => [c.x, c.y, c.width, c.height]);
  assert.deepEqual(rects, [
    [100, 198, 100, 88],
    [200, 198, 100, 88],
    [300, 198, 100, 88],
  ]);
});

test('等分（縦）: 選択肢の矩形は隙間なく並ぶ', () => {
  const { win } = addColumn('a');
  const rects = infoOf(win).choices.map((c) => [c.x, c.y, c.width, c.height]);
  assert.deepEqual(rects, [
    [100, 198, 200, 88],
    [100, 286, 200, 88],
    [100, 374, 200, 88],
  ]);
});

test('等分: 割り切れない幅でも、境 b_i = x + width × i / n で並び、隙間も重なりもない', () => {
  const { win } = addRow('a', { width: 100 });
  const cs = infoOf(win).choices;
  const b = [0, 1, 2, 3].map((i) => 100 + (100 * i) / 3);
  assert.equal(cs[0].x, b[0]);
  assert.equal(cs[1].x, b[1]);
  assert.equal(cs[2].x, b[2]);
  assert.equal(cs[0].x + cs[0].width, cs[1].x);
  assert.equal(cs[1].x + cs[1].width, cs[2].x);
  assert.equal(cs[2].x + cs[2].width, b[3]);
  assert.equal(b[3], 200);
});

test('境の点（横）: 境を含む側の選択肢が押される。左端を含み、右端を含まない', () => {
  const cases = [
    [100, 0], [199.99, 0], [200, 1], [299.99, 1], [300, 2], [399.99, 2],
  ];
  for (const [x, index] of cases) {
    const { win } = addRow('a');
    ptr(win, 'down', x, 230);
    const expected = [false, false, false];
    expected[index] = true;
    assert.deepEqual(pressedOf(win), expected, `x = ${x}`);
  }
  for (const x of [99.99, 400, 400.01]) {
    const { win } = addRow('a');
    ptr(win, 'down', x, 230);
    assert.deepEqual(pressedOf(win), [false, false, false], `x = ${x}`);
  }
});

test('境の点（縦）: 境を含む側の選択肢が押される。上端を含み、下端を含まない', () => {
  const cases = [
    [198, 0], [285.99, 0], [286, 1], [373.99, 1], [374, 2], [461.99, 2],
  ];
  for (const [y, index] of cases) {
    const { win } = addColumn('a');
    ptr(win, 'down', 150, y);
    const expected = [false, false, false];
    expected[index] = true;
    assert.deepEqual(pressedOf(win), expected, `y = ${y}`);
  }
  for (const y of [197.99, 462, 462.01]) {
    const { win } = addColumn('a');
    ptr(win, 'down', 150, y);
    assert.deepEqual(pressedOf(win), [false, false, false], `y = ${y}`);
  }
});

test('境の点（割り切れない幅）: 境そのものの値は次の選択肢、その直前は前の選択肢', () => {
  const b1 = 100 + 100 / 3;
  const b2 = 100 + 200 / 3;
  const probes = [[b1, 1], [b1 - 1e-9, 0], [b2, 2], [b2 - 1e-9, 1]];
  for (const [x, index] of probes) {
    const { win } = addRow('a', { width: 100 });
    ptr(win, 'down', x, 230);
    const expected = [false, false, false];
    expected[index] = true;
    assert.deepEqual(pressedOf(win), expected, `x = ${x}`);
  }
});

test('info: selected は read() と === で同じ値の選択肢だけ', () => {
  const sel = (v) => infoOf(addRow(v).win).choices.map((c) => c.selected);
  assert.deepEqual(sel('a'), [true, false, false]);
  assert.deepEqual(sel('b'), [false, true, false]);
  assert.deepEqual(sel('c'), [false, false, true]);
  assert.deepEqual(sel('d'), [false, false, false]);
  assert.deepEqual(sel(undefined), [false, false, false]);
  assert.deepEqual(sel(['a']), [false, false, false]);
});

test('info: selected は === で比べる（1 と "1"、0 と false は別。NaN は選ばれない）', () => {
  const nums = [{ label: 'A', value: 1 }, { label: 'Z', value: 0 }, { label: 'N', value: NaN }];
  const sel = (v) => infoOf(addRow(v, { choices: nums }).win).choices.map((c) => c.selected);
  assert.deepEqual(sel(1), [true, false, false]);
  assert.deepEqual(sel('1'), [false, false, false]);
  assert.deepEqual(sel(0), [false, true, false]);
  assert.deepEqual(sel(false), [false, false, false]);
  assert.deepEqual(sel(NaN), [false, false, false]);
  const obj = {};
  const objs = [{ label: 'A', value: obj }, { label: 'B', value: {} }];
  assert.deepEqual(infoOf(addRow(obj, { choices: objs }).win).choices.map((c) => c.selected), [true, false]);
  assert.deepEqual(infoOf(addRow({}, { choices: objs }).win).choices.map((c) => c.selected), [false, false]);
});

test('info: 項目（列の全体、選択肢ごとの label・value、textSize）', () => {
  const { win } = addRow('b');
  const info = infoOf(win);
  assert.equal(info.textSize, DEFAULT_TEXT_SIZE);
  assert.deepEqual(info.choices.map((c) => [c.label, c.value]), [['A', 'a'], ['B', 'b'], ['C', 'c']]);
  assert.deepEqual(Object.keys(info).sort(), ['choices', 'direction', 'height', 'textSize', 'width', 'x', 'y']);
  assert.deepEqual(
    Object.keys(info.choices[0]).sort(),
    ['height', 'label', 'pressed', 'selected', 'value', 'width', 'x', 'y'],
  );
});

test('info: label が関数なら view() ごとに、選択肢ごとに呼ぶ', () => {
  let n = 0;
  const choices = [
    { label: () => 'F' + (++n), value: 1 },
    { label: 'S', value: 2 },
  ];
  const { win } = addRow(1, { choices });
  assert.deepEqual(infoOf(win).choices.map((c) => c.label), ['F1', 'S']);
  assert.deepEqual(infoOf(win).choices.map((c) => c.label), ['F2', 'S']);
});

test('info: 新しいオブジェクト（書き換えても部品に影響しない）', () => {
  const { win } = addRow('a');
  const a = infoOf(win);
  a.x = 0;
  a.choices[0].label = 'X';
  a.choices[0].selected = false;
  a.choices.push({});
  const b = infoOf(win);
  assert.notEqual(a, b);
  assert.equal(b.x, 100);
  assert.equal(b.choices.length, 3);
  assert.equal(b.choices[0].label, 'A');
  assert.equal(b.choices[0].selected, true);
});

test('read: view() ごとに1回。足す操作・down・move では呼ばれない', () => {
  const { win, io } = addRow('a');
  assert.equal(io.reads(), 0);
  ptr(win, 'down', 150, 230);
  ptr(win, 'move', 250, 230);
  ptr(win, 'move', 160, 230);
  assert.equal(io.reads(), 0);
  win.view();
  assert.equal(io.reads(), 1);
  win.view();
  assert.equal(io.reads(), 2);
});

test('view() は write を呼ばない', () => {
  const { win, io } = addRow('a');
  win.view();
  win.view();
  assert.deepEqual(io.writes(), []);
});

test('押す（横）: 押した選択肢だけ pressed になり、write はまだ呼ばれない', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 250, 230);
  assert.deepEqual(pressedOf(win), [false, true, false]);
  assert.deepEqual(io.writes(), []);
});

test('押す（縦）: 押した選択肢だけ pressed になり、write はまだ呼ばれない', () => {
  const { win, io } = addColumn('a');
  ptr(win, 'down', 150, 330);
  assert.deepEqual(pressedOf(win), [false, true, false]);
  assert.deepEqual(io.writes(), []);
});

test('押して離す（横）: write が1回、引数は押した選択肢の value', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 350, 230);
  ptr(win, 'up', 350, 230);
  assert.deepEqual(io.writes(), ['c']);
  assert.deepEqual(pressedOf(win), [false, false, false]);
});

test('押して離す（縦）: write が1回、引数は押した選択肢の value', () => {
  const { win, io } = addColumn('a');
  ptr(win, 'down', 150, 400);
  ptr(win, 'up', 150, 400);
  assert.deepEqual(io.writes(), ['c']);
  ptr(win, 'down', 150, 330);
  ptr(win, 'up', 150, 330);
  assert.deepEqual(io.writes(), ['c', 'b']);
});

test('同じ選択肢の中なら、押した位置と離した位置が違っても反応する', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 210, 205);
  ptr(win, 'move', 290, 280);
  ptr(win, 'up', 299, 285);
  assert.deepEqual(io.writes(), ['b']);
});

test('離したとき: 選ばれている選択肢の上で離しても write を呼ばない（read は1回）', () => {
  const { win, io } = addRow('b');
  ptr(win, 'down', 250, 230);
  ptr(win, 'up', 250, 230);
  assert.deepEqual(io.writes(), []);
  assert.equal(io.reads(), 1);
});

test('離したとき: read は押し始めた選択肢の上で離したときに1回だけ呼ばれる', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 250, 230);
  ptr(win, 'up', 250, 230);
  assert.equal(io.reads(), 1);
  assert.deepEqual(io.writes(), ['b']);
});

test('離したとき: read が選択肢の値と === で違うときだけ write（read が選択肢の外の値でも書く）', () => {
  const { win, io } = addRow('zzz');
  ptr(win, 'down', 150, 230);
  ptr(win, 'up', 150, 230);
  assert.deepEqual(io.writes(), ['a']);
});

test('離したとき: read は離した時点の値で比べる（押してから変わっていてもよい）', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 250, 230);
  io.set('b');
  ptr(win, 'up', 250, 230);
  assert.deepEqual(io.writes(), []);
  const second = addRow('a');
  ptr(second.win, 'down', 250, 230);
  second.io.set('c');
  ptr(second.win, 'up', 250, 230);
  assert.deepEqual(second.io.writes(), ['b']);
});

test('write は write の呼び出しの前に pressed を解いている（write の中の view で pressed が false）', () => {
  const { win } = makeWindow();
  let seen = null;
  win.addChoices(goodSpec({ write: () => { seen = pressedOf(win); } }));
  ptr(win, 'down', 250, 230);
  ptr(win, 'up', 250, 230);
  assert.deepEqual(seen, [false, false, false]);
});

test('ずらす（横）: ほかの選択肢の上では pressed が消え、押し始めた選択肢へ戻ると戻る', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 250, 230);
  ptr(win, 'move', 350, 230);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'move', 150, 230);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'move', 260, 240);
  assert.deepEqual(pressedOf(win), [false, true, false]);
  assert.deepEqual(io.writes(), []);
});

test('ずらす（縦）: ほかの選択肢の上では pressed が消え、押し始めた選択肢へ戻ると戻る', () => {
  const { win, io } = addColumn('a');
  ptr(win, 'down', 150, 330);
  ptr(win, 'move', 150, 400);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'move', 150, 220);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'move', 160, 340);
  assert.deepEqual(pressedOf(win), [false, true, false]);
  assert.deepEqual(io.writes(), []);
});

test('取り消し: ほかの選択肢の上で離しても write・read は呼ばれない', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 250, 230);
  ptr(win, 'move', 350, 230);
  ptr(win, 'up', 350, 230);
  assert.deepEqual(io.writes(), []);
  assert.equal(io.reads(), 0);
  assert.deepEqual(pressedOf(win), [false, false, false]);
});

test('取り消し: 部品の外（窓の内側）で離しても write・read は呼ばれない', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 250, 230);
  ptr(win, 'move', 250, 400);
  assert.equal(io.reads(), 0);
  ptr(win, 'up', 250, 400);
  assert.deepEqual(io.writes(), []);
  assert.equal(io.reads(), 0);
  assert.deepEqual(pressedOf(win), [false, false, false]);
});

test('取り消し: 窓の外で離しても write は呼ばれず、窓も閉じない（持ち主が部品）', () => {
  const { win, io, closes } = addRow('a');
  ptr(win, 'down', 250, 230);
  ptr(win, 'move', 900, 700);
  ptr(win, 'up', 900, 700);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test('外へずらしてから戻して離す: 反応する', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 250, 230);
  ptr(win, 'move', 900, 700);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'move', 250, 230);
  assert.deepEqual(pressedOf(win), [false, true, false]);
  ptr(win, 'up', 250, 230);
  assert.deepEqual(io.writes(), ['b']);
});

test('取り消した後は押されている状態が残らない（次の押下は新しい選択肢から始まる）', () => {
  const { win, io } = addRow('a');
  ptr(win, 'down', 250, 230);
  ptr(win, 'up', 350, 230);
  assert.deepEqual(io.writes(), []);
  ptr(win, 'down', 350, 230);
  assert.deepEqual(pressedOf(win), [false, false, true]);
  ptr(win, 'up', 350, 230);
  assert.deepEqual(io.writes(), ['c']);
});

test("'down' の無い 'up'・'move' には反応しない", () => {
  const { win, io } = addRow('a');
  ptr(win, 'move', 250, 230);
  ptr(win, 'up', 250, 230);
  assert.deepEqual(io.writes(), []);
  assert.equal(io.reads(), 0);
  assert.deepEqual(pressedOf(win), [false, false, false]);
});

test('部品の外で押して、中へずらして離しても反応しない', () => {
  const { win, io, closes } = addRow('a');
  ptr(win, 'down', 250, 400);
  ptr(win, 'move', 250, 230);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 250, 230);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test('窓の内側で切り取られた部分だけが押せる（横）', () => {
  // spec x 400・y 300・width 300 → 画面の矩形 x 500〜800・y 488〜576。内側は x 〜700・y 〜500 なので押せるのは x 500〜700・y 488〜500
  const { win, io } = addRow('a', { x: 400, y: 300 });
  ptr(win, 'down', 750, 495);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 750, 495);
  ptr(win, 'down', 650, 520);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 650, 520);
  assert.deepEqual(io.writes(), []);
  ptr(win, 'down', 650, 495); // 選択肢 1（x 600〜700）
  assert.deepEqual(pressedOf(win), [false, true, false]);
  ptr(win, 'up', 650, 495);
  assert.deepEqual(io.writes(), ['b']);
});

test('窓の内側で切り取られた部分だけが押せる（縦）。等分は切り取られていない列で決まる', () => {
  // spec x 0・y 250・width 200 → 画面の矩形 x 100〜300・y 438〜702（境 526・614）。内側は y 〜500 なので押せるのは y 438〜500
  const { win, io } = addColumn('a', { y: 250 });
  ptr(win, 'down', 150, 520);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 150, 520);
  assert.deepEqual(io.writes(), []);
  ptr(win, 'down', 150, 495); // y 438〜526 → 選択肢 0
  assert.deepEqual(pressedOf(win), [true, false, false]);
  ptr(win, 'up', 150, 495);
  assert.deepEqual(io.writes(), []); // 選択肢 0 は選ばれている（read は 'a'）
  const second = addColumn('b', { y: 250 });
  ptr(second.win, 'down', 150, 495);
  ptr(second.win, 'up', 150, 495);
  assert.deepEqual(second.io.writes(), ['a']);
});

test('押している間の別の down は無視する', () => {
  const { win, io } = addRow('c');
  ptr(win, 'down', 150, 230);
  ptr(win, 'down', 250, 230);
  ptr(win, 'up', 150, 230);
  assert.deepEqual(io.writes(), ['a']);
});

test('write の例外はそのまま伝わる。伝わった後は押されている状態が解けている', () => {
  const { win } = makeWindow();
  const boom = new Error('boom');
  win.addChoices(goodSpec({ write: () => { throw boom; } }));
  ptr(win, 'down', 250, 230);
  assert.throws(() => ptr(win, 'up', 250, 230), (e) => e === boom);
  assert.deepEqual(pressedOf(win), [false, false, false]);
});

test('read の例外（離したとき）はそのまま伝わる。write は呼ばれない', () => {
  const { win } = makeWindow();
  const boom = new Error('boom');
  let writes = 0;
  win.addChoices(goodSpec({ read: () => { throw boom; }, write: () => { writes++; } }));
  assert.throws(() => win.view(), (e) => e === boom);
  ptr(win, 'down', 250, 230);
  assert.throws(() => ptr(win, 'up', 250, 230), (e) => e === boom);
  assert.equal(writes, 0);
});
