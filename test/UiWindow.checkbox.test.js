/**
 * @fileoverview 責務: oz/src/UiWindow.js の addCheckbox（設定の検証、位置、info、read・write の呼ばれ方、押す・ずらす・離す・取り消し）の自動テスト。
 * Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';
import { DEFAULT_PART_HEIGHT, DEFAULT_TEXT_SIZE } from '../oz/src/UiMetrics.js';

const PREFIX = '[oz] 窓の addCheckbox: ';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/*
 * 窓の形（makeWindow）: 窓 (100, 100)-(700, 500)、タイトルバー y 100〜188、
 * 窓の内側 x 100〜700・y 188〜500（部品の原点は (100, 188)）。
 * 標準のチェックボックス（addBox）: spec x 20・y 10・width 200 → 画面の矩形 x 120〜320・y 198〜286（高さ 88）。
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
 * 値を読む関数と書く関数を記録する。値は `value` に持ち、write は値を変えない（記録だけ）。
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
 * 正しいチェックボックスの設定を作る。
 * @param {Object} [extra] 上書き・追加する項目
 * @returns {Object} spec
 */
function goodSpec(extra = {}) {
  return { x: 20, y: 10, width: 200, label: 'L', read: () => false, write: () => {}, ...extra };
}

/**
 * チェックボックスを1つ足した窓を作る。
 * @param {*} value read が返す値
 * @param {Object} [extra] 上書き・追加する spec の項目
 * @returns {{win: UiWindow, io: ReturnType<typeof makeIo>, closes: () => number}} 窓と記録
 */
function addBox(value, extra = {}) {
  const { win, closes } = makeWindow();
  const io = makeIo(value);
  win.addCheckbox(goodSpec({ read: io.read, write: io.write, ...extra }));
  return { win, io, closes };
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
 * view() の最初の部品の pressed を返す。
 * @param {UiWindow} win 窓
 * @returns {boolean} 押されている見た目か
 */
function pressedOf(win) {
  return win.view().parts[0].info.pressed;
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

test('addCheckbox: spec がオブジェクトでない', () => {
  const msg = PREFIX + 'spec (チェックボックスの設定オブジェクト) が渡されていません';
  for (const bad of [undefined, null, [], 'x', 1]) {
    assertError(() => makeWindow().win.addCheckbox(bad), msg);
  }
});

test('addCheckbox: 知らない項目', () => {
  assertError(
    () => makeWindow().win.addCheckbox(goodSpec({ enabled: () => true })),
    PREFIX + 'spec に使えない項目 enabled があります',
  );
});

test('addCheckbox: x・y（x が先）・width・height・label・read・write', () => {
  const w = makeWindow().win;
  assertError(() => w.addCheckbox(goodSpec({ x: undefined })), PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addCheckbox(goodSpec({ x: NaN, y: NaN })), PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addCheckbox(goodSpec({ y: Infinity })), PREFIX + 'y は有限の数値で指定してください');
  assertError(() => w.addCheckbox(goodSpec({ width: undefined })), PREFIX + 'width は正の有限数で指定してください');
  assertError(() => w.addCheckbox(goodSpec({ width: 0 })), PREFIX + 'width は正の有限数で指定してください');
  assertError(() => w.addCheckbox(goodSpec({ height: 0 })), PREFIX + 'height は正の有限数で指定してください');
  assertError(() => w.addCheckbox(goodSpec({ height: null })), PREFIX + 'height は正の有限数で指定してください');
  assertError(
    () => w.addCheckbox(goodSpec({ label: 1 })),
    PREFIX + 'label は文字列か、文字列を返す関数で指定してください',
  );
  assertError(
    () => w.addCheckbox(goodSpec({ label: undefined })),
    PREFIX + 'label は文字列か、文字列を返す関数で指定してください',
  );
  assertError(() => w.addCheckbox(goodSpec({ read: undefined })), PREFIX + 'read は関数で指定してください');
  assertError(() => w.addCheckbox(goodSpec({ read: 'f' })), PREFIX + 'read は関数で指定してください');
  assertError(() => w.addCheckbox(goodSpec({ write: undefined })), PREFIX + 'write は関数で指定してください');
  assertError(() => w.addCheckbox(goodSpec({ write: null })), PREFIX + 'write は関数で指定してください');
});

test('addCheckbox: 検証の順（知らない項目 → x → width → label → read → write）', () => {
  const w = makeWindow().win;
  assertError(() => w.addCheckbox({ foo: 1, x: 'a' }), PREFIX + 'spec に使えない項目 foo があります');
  assertError(() => w.addCheckbox({ x: 'a', width: 'a' }), PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addCheckbox({ x: 1, y: 'a' }), PREFIX + 'y は有限の数値で指定してください');
  assertError(() => w.addCheckbox({ x: 1, y: 1, width: 'a', label: 1 }), PREFIX + 'width は正の有限数で指定してください');
  assertError(
    () => w.addCheckbox({ x: 1, y: 1, width: 1, height: 0, label: 1 }),
    PREFIX + 'height は正の有限数で指定してください',
  );
  assertError(
    () => w.addCheckbox({ x: 1, y: 1, width: 1, label: 1, read: 1, write: 1 }),
    PREFIX + 'label は文字列か、文字列を返す関数で指定してください',
  );
  assertError(
    () => w.addCheckbox({ x: 1, y: 1, width: 1, label: 'a', read: 1, write: 1 }),
    PREFIX + 'read は関数で指定してください',
  );
  assertError(
    () => w.addCheckbox({ x: 1, y: 1, width: 1, label: 'a', read: () => 0, write: 1 }),
    PREFIX + 'write は関数で指定してください',
  );
});

test('addCheckbox: エラーのときは部品が足されない', () => {
  const w = makeWindow().win;
  assert.throws(() => w.addCheckbox(goodSpec({ write: 1 })));
  assert.deepEqual(w.view().parts, []);
});

test('addCheckbox: 戻り値は使わない（undefined）', () => {
  const { win } = makeWindow();
  assert.equal(win.addCheckbox(goodSpec()), undefined);
});

test('既定の高さは 88、位置は x が窓の x・y が内側の y を原点にする', () => {
  assert.equal(DEFAULT_PART_HEIGHT, 88);
  const { win } = addBox(false);
  const part = win.view().parts[0];
  assert.equal(part.kind, 'checkbox');
  assert.equal(part.info.x, 120);
  assert.equal(part.info.y, 198);
  assert.equal(part.info.width, 200);
  assert.equal(part.info.height, 88);
});

test('高さを渡せば、その高さになる', () => {
  const { win } = addBox(false, { height: 50 });
  assert.equal(win.view().parts[0].info.height, 50);
});

test('info: checked は Boolean(read())、label、textSize', () => {
  const cases = [[true, true], [false, false], [1, true], [0, false], ['', false], ['a', true], [undefined, false], [null, false]];
  for (const [value, checked] of cases) {
    const { win } = addBox(value, { label: 'ラベル' });
    const info = win.view().parts[0].info;
    assert.equal(info.checked, checked);
    assert.equal(info.label, 'ラベル');
    assert.equal(info.pressed, false);
    assert.equal(info.textSize, DEFAULT_TEXT_SIZE);
    assert.deepEqual(Object.keys(info).sort(), ['checked', 'height', 'label', 'pressed', 'textSize', 'width', 'x', 'y']);
  }
});

test('info: textSize は窓の textSize', () => {
  const win = new UiWindow(
    { title: 'T', x: 100, y: 100, width: 600, height: 400, textSize: 20, onClose: () => {} },
    SCREEN,
  );
  win.addCheckbox(goodSpec());
  assert.equal(win.view().parts[0].info.textSize, 20);
});

test('info: label が関数なら view() ごとに呼ぶ', () => {
  let n = 0;
  const { win } = addBox(false, { label: () => `N${++n}` });
  assert.equal(n, 0);
  assert.equal(win.view().parts[0].info.label, 'N1');
  assert.equal(win.view().parts[0].info.label, 'N2');
  assert.equal(n, 2);
});

test('info: 新しいオブジェクト（書き換えても部品に影響しない）', () => {
  const { win } = addBox(true);
  const a = win.view().parts[0].info;
  a.checked = false;
  a.x = 0;
  const b = win.view().parts[0].info;
  assert.equal(b.checked, true);
  assert.equal(b.x, 120);
  assert.notEqual(a, b);
});

test('read: view() ごとに1回。足す操作・down・move では呼ばれない', () => {
  const { win, io } = addBox(false);
  assert.equal(io.reads(), 0);
  win.view();
  assert.equal(io.reads(), 1);
  win.view();
  assert.equal(io.reads(), 2);
  ptr(win, 'down', 130, 210);
  assert.equal(io.reads(), 2);
  ptr(win, 'move', 140, 220);
  assert.equal(io.reads(), 2);
  ptr(win, 'move', 900, 900);
  assert.equal(io.reads(), 2);
});

test('read: 離したとき（当たりの中）に1回だけ呼ばれ、write は反転した値', () => {
  const { win, io } = addBox(false);
  ptr(win, 'down', 130, 210);
  ptr(win, 'up', 130, 210);
  assert.equal(io.reads(), 1);
  assert.deepEqual(io.writes(), [true]);
});

test('view() は write を呼ばない', () => {
  const { win, io } = addBox(true);
  win.view();
  win.view();
  assert.deepEqual(io.writes(), []);
});

test('押す: pressed になり、write はまだ呼ばれない', () => {
  const { win, io } = addBox(false);
  assert.equal(pressedOf(win), false);
  ptr(win, 'down', 130, 210);
  assert.equal(pressedOf(win), true);
  assert.deepEqual(io.writes(), []);
});

test('押して離す: write が1回、引数は読んだ値の反対', () => {
  const { win, io } = addBox(false);
  ptr(win, 'down', 130, 210);
  ptr(win, 'up', 130, 210);
  assert.equal(pressedOf(win), false);
  assert.deepEqual(io.writes(), [true]);
});

test('write の引数: read が true なら false、1 なら false、undefined なら true', () => {
  const cases = [[true, false], [1, false], [undefined, true], [0, true], ['a', false], [null, true]];
  for (const [value, expected] of cases) {
    const { win, io } = addBox(value);
    ptr(win, 'down', 130, 210);
    ptr(win, 'up', 130, 210);
    assert.deepEqual(io.writes(), [expected]);
  }
});

test('write は write の呼び出しの前に pressed を解いている（write の中の view で pressed が false）', () => {
  const { win } = makeWindow();
  let pressedInWrite = null;
  win.addCheckbox(goodSpec({
    write: () => { pressedInWrite = win.view().parts[0].info.pressed; },
  }));
  ptr(win, 'down', 130, 210);
  ptr(win, 'up', 130, 210);
  assert.equal(pressedInWrite, false);
});

test('同じ値でも離せば毎回 write を呼ぶ（読んだ値は変わらないまま2回押す）', () => {
  const { win, io } = addBox(false);
  for (let i = 0; i < 2; i++) {
    ptr(win, 'down', 130, 210);
    ptr(win, 'up', 130, 210);
  }
  assert.deepEqual(io.writes(), [true, true]);
});

test('外でずらす: pressed が解ける。外で離す: write は呼ばれない（取り消し）', () => {
  const { win, io } = addBox(false);
  ptr(win, 'down', 130, 210);
  assert.equal(pressedOf(win), true);
  ptr(win, 'move', 400, 210);
  assert.equal(pressedOf(win), false);
  ptr(win, 'up', 400, 210);
  assert.equal(pressedOf(win), false);
  assert.deepEqual(io.writes(), []);
});

test('外で離したときは read も呼ばれない', () => {
  const { win, io } = addBox(false);
  ptr(win, 'down', 130, 210);
  ptr(win, 'move', 400, 210);
  ptr(win, 'up', 400, 210);
  assert.equal(io.reads(), 0);
});

test('外へずらしてから戻して離す: 反応する', () => {
  const { win, io } = addBox(false);
  ptr(win, 'down', 130, 210);
  ptr(win, 'move', 400, 210);
  assert.equal(pressedOf(win), false);
  ptr(win, 'move', 140, 220);
  assert.equal(pressedOf(win), true);
  ptr(win, 'up', 140, 220);
  assert.deepEqual(io.writes(), [true]);
});

test('項目名の部分（箱の外。部品の矩形の端）を押しても反応する', () => {
  const { win, io } = addBox(false);
  // 矩形 x 120〜320・y 198〜286。左端・上端は含み、右端・下端は含まない
  ptr(win, 'down', 319, 285);
  ptr(win, 'up', 319, 285);
  ptr(win, 'down', 120, 198);
  ptr(win, 'up', 120, 198);
  assert.deepEqual(io.writes(), [true, true]);
});

test('矩形の右端・下端の外は押せない', () => {
  const { win, io, closes } = addBox(false);
  ptr(win, 'down', 320, 210);
  assert.equal(pressedOf(win), false);
  ptr(win, 'up', 320, 210);
  ptr(win, 'down', 130, 286);
  assert.equal(pressedOf(win), false);
  ptr(win, 'up', 130, 286);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test("'down' の無い 'up'・'move' には反応しない", () => {
  const { win, io } = addBox(false);
  ptr(win, 'up', 130, 210);
  ptr(win, 'move', 130, 210);
  ptr(win, 'up', 130, 210);
  assert.deepEqual(io.writes(), []);
  assert.equal(pressedOf(win), false);
});

test("部品の外で押して、中へずらして離しても反応しない", () => {
  const { win, io } = addBox(false);
  ptr(win, 'down', 400, 300);
  ptr(win, 'move', 130, 210);
  ptr(win, 'up', 130, 210);
  assert.deepEqual(io.writes(), []);
  assert.equal(pressedOf(win), false);
});

test('窓の内側で切り取られた部分だけが押せる', () => {
  // spec x 500・y 300・width 300 → 画面の矩形 x 600〜900・y 488〜576。内側は x 〜700・y 〜500 なので押せるのは x 600〜700・y 488〜500
  const { win, io } = addBox(false, { x: 500, y: 300, width: 300 });
  ptr(win, 'down', 750, 495);
  assert.equal(pressedOf(win), false);
  ptr(win, 'up', 750, 495);
  ptr(win, 'down', 650, 520);
  assert.equal(pressedOf(win), false);
  ptr(win, 'up', 650, 520);
  assert.deepEqual(io.writes(), []);
  ptr(win, 'down', 650, 495);
  assert.equal(pressedOf(win), true);
  ptr(win, 'up', 650, 495);
  assert.deepEqual(io.writes(), [true]);
});

test('押している間の別の down は無視する', () => {
  const { win, io } = addBox(false);
  ptr(win, 'down', 130, 210);
  ptr(win, 'down', 400, 300);
  ptr(win, 'up', 130, 210);
  assert.deepEqual(io.writes(), [true]);
});

test('窓の外で離しても窓は閉じない（持ち主が部品）', () => {
  const { win, io, closes } = addBox(false);
  ptr(win, 'down', 130, 210);
  ptr(win, 'up', 900, 700);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test('write の例外はそのまま伝わる。伝わった後は押されている状態が解けている', () => {
  const { win } = makeWindow();
  const boom = new Error('boom');
  win.addCheckbox(goodSpec({ write: () => { throw boom; } }));
  ptr(win, 'down', 130, 210);
  assert.throws(() => ptr(win, 'up', 130, 210), (e) => e === boom);
  assert.equal(pressedOf(win), false);
  // 持ち主も解けているので、次の down から始められる
  ptr(win, 'down', 130, 210);
  assert.equal(pressedOf(win), true);
});

test('read の例外もそのまま伝わる', () => {
  const { win } = makeWindow();
  const boom = new Error('boom');
  win.addCheckbox(goodSpec({ read: () => { throw boom; } }));
  ptr(win, 'down', 130, 210);
  assert.throws(() => ptr(win, 'up', 130, 210), (e) => e === boom);
});
