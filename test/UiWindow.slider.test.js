/**
 * @fileoverview 責務: oz/src/UiWindow.js の addSlider（設定の検証、既定の高さ、溝とつまみの形、read の値からのつまみの位置、値の文字、info）の自動テスト。
 * ドラッグの動きは UiWindow.sliderDrag.test.js が受け持つ。Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';
import {
  DEFAULT_SLIDER_HEIGHT,
  SLIDER_KNOB_SIZE,
  SLIDER_GROOVE_HEIGHT,
  DEFAULT_TEXT_SIZE,
} from '../oz/src/UiMetrics.js';

const PREFIX = '[oz] 窓の addSlider: ';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/*
 * 窓の形（makeWindow）: 窓 (100, 100)-(700, 500)、タイトルバー y 100〜188、
 * 窓の内側 x 100〜700・y 188〜500（部品の原点は (100, 188)）。
 * 標準のスライダー（addBar）: spec x 0・y 10・width 564 → 画面の矩形 x 100〜664・y 198〜330（高さ 132）。
 * 溝 track.x = 132・track.width = 500・中心の高さ cy = 286。min 0・max 1・step 0.1 なら k = 10、刻み i の位置は 132 + 50 × i。
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
 * 値を読む関数と書く関数を記録する。write は値を変えない（記録だけ）。
 * @param {*} value read が返す値
 * @returns {{read: Function, write: Function, reads: () => number, writes: () => Array<*>}} 記録
 */
function makeIo(value) {
  let reads = 0;
  const written = [];
  return {
    read: () => { reads++; return value; },
    write: (v) => { written.push(v); },
    reads: () => reads,
    writes: () => written.slice(),
  };
}

/**
 * 正しいスライダーの設定を作る。
 * @param {Object} [extra] 上書き・追加する項目
 * @returns {Object} spec
 */
function goodSpec(extra = {}) {
  return {
    x: 0, y: 10, width: 564, label: 'L', min: 0, max: 1, step: 0.1, read: () => 0, write: () => {}, ...extra,
  };
}

/**
 * スライダーを1つ足した窓を作る。
 * @param {*} value read が返す値
 * @param {Object} [extra] 上書き・追加する spec の項目
 * @returns {{win: UiWindow, io: ReturnType<typeof makeIo>, closes: () => number}} 窓と記録
 */
function addBar(value, extra = {}) {
  const { win, closes } = makeWindow();
  const io = makeIo(value);
  win.addSlider(goodSpec({ read: io.read, write: io.write, ...extra }));
  return { win, io, closes };
}

/**
 * 最初の部品の info を返す。
 * @param {UiWindow} win 窓
 * @returns {Object} info
 */
function infoOf(win) {
  return win.view().parts[0].info;
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

test('addSlider: spec がオブジェクトでない', () => {
  const msg = PREFIX + 'spec (スライダーの設定オブジェクト) が渡されていません';
  for (const bad of [undefined, null, [], 'x', 1]) {
    assertError(() => makeWindow().win.addSlider(bad), msg);
  }
});

test('addSlider: 知らない項目', () => {
  assertError(
    () => makeWindow().win.addSlider(goodSpec({ enabled: () => true })),
    PREFIX + 'spec に使えない項目 enabled があります',
  );
});

test('addSlider: x・y（x が先）・width・height', () => {
  const w = makeWindow().win;
  assertError(() => w.addSlider(goodSpec({ x: undefined })), PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addSlider(goodSpec({ x: NaN, y: NaN })), PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addSlider(goodSpec({ y: Infinity })), PREFIX + 'y は有限の数値で指定してください');
  assertError(() => w.addSlider(goodSpec({ width: undefined })), PREFIX + 'width は正の有限数で指定してください');
  assertError(() => w.addSlider(goodSpec({ width: 0 })), PREFIX + 'width は正の有限数で指定してください');
  assertError(() => w.addSlider(goodSpec({ height: 0 })), PREFIX + 'height は正の有限数で指定してください');
  assertError(() => w.addSlider(goodSpec({ height: null })), PREFIX + 'height は正の有限数で指定してください');
});

test('addSlider: width が 64 以下はエラー（64 より大きければ通る）', () => {
  assert.equal(SLIDER_KNOB_SIZE, 64);
  const w = makeWindow().win;
  const msg = PREFIX + 'width は 64 より大きくしてください';
  assertError(() => w.addSlider(goodSpec({ width: 64 })), msg);
  assertError(() => w.addSlider(goodSpec({ width: 10 })), msg);
  w.addSlider(goodSpec({ width: 65 }));
  assert.equal(w.view().parts.length, 1);
});

test('addSlider: label・min・max', () => {
  const w = makeWindow().win;
  const labelMsg = PREFIX + 'label は文字列か、文字列を返す関数で指定してください';
  assertError(() => w.addSlider(goodSpec({ label: 1 })), labelMsg);
  assertError(() => w.addSlider(goodSpec({ label: undefined })), labelMsg);
  assertError(() => w.addSlider(goodSpec({ min: undefined })), PREFIX + 'min は有限の数値で指定してください');
  assertError(() => w.addSlider(goodSpec({ min: Infinity })), PREFIX + 'min は有限の数値で指定してください');
  assertError(() => w.addSlider(goodSpec({ min: NaN, max: NaN })), PREFIX + 'min は有限の数値で指定してください');
  assertError(() => w.addSlider(goodSpec({ max: undefined })), PREFIX + 'max は有限の数値で指定してください');
  assertError(() => w.addSlider(goodSpec({ max: '1' })), PREFIX + 'max は有限の数値で指定してください');
  assertError(() => w.addSlider(goodSpec({ min: 1, max: 1 })), PREFIX + 'max は min より大きくしてください');
  assertError(() => w.addSlider(goodSpec({ min: 2, max: 1 })), PREFIX + 'max は min より大きくしてください');
});

test('addSlider: step（正の有限数、max - min 以下、整数倍）', () => {
  const w = makeWindow().win;
  const positive = PREFIX + 'step は正の有限数で指定してください';
  assertError(() => w.addSlider(goodSpec({ step: undefined })), positive);
  assertError(() => w.addSlider(goodSpec({ step: 0 })), positive);
  assertError(() => w.addSlider(goodSpec({ step: -0.1 })), positive);
  assertError(() => w.addSlider(goodSpec({ step: Infinity })), positive);
  assertError(() => w.addSlider(goodSpec({ step: NaN })), positive);
  assertError(() => w.addSlider(goodSpec({ step: 2 })), PREFIX + 'step は max - min 以下にしてください');
  assertError(() => w.addSlider(goodSpec({ min: 0, max: 1, step: 0.3 })), PREFIX + 'max - min は step の整数倍にしてください');
  assertError(() => w.addSlider(goodSpec({ min: 0, max: 10, step: 3 })), PREFIX + 'max - min は step の整数倍にしてください');
});

test('addSlider: step が max - min より大きいエラーは、整数倍のエラーより先', () => {
  const w = makeWindow().win;
  assertError(
    () => w.addSlider(goodSpec({ min: 0, max: 1, step: 1.5 })),
    PREFIX + 'step は max - min 以下にしてください',
  );
});

test('addSlider: 小数の誤差があっても整数倍なら通る（min 0・max 0.3・step 0.1 など）', () => {
  const cases = [
    { min: 0, max: 0.3, step: 0.1 },
    { min: 0, max: 1, step: 0.1 },
    { min: -1, max: 1, step: 0.1 },
    { min: 0.5, max: 2, step: 0.25 },
    { min: 0, max: 1, step: 1 },
    { min: 0, max: 0.7, step: 0.1 },
  ];
  for (const c of cases) {
    const w = makeWindow().win;
    w.addSlider(goodSpec(c));
    assert.equal(w.view().parts.length, 1);
  }
});

test('addSlider: 整数倍でない例（min 0・max 1・step 0.3）はエラー', () => {
  assertError(
    () => makeWindow().win.addSlider(goodSpec({ min: 0, max: 1, step: 0.3 })),
    PREFIX + 'max - min は step の整数倍にしてください',
  );
});

test('addSlider: read・write・format', () => {
  const w = makeWindow().win;
  assertError(() => w.addSlider(goodSpec({ read: undefined })), PREFIX + 'read は関数で指定してください');
  assertError(() => w.addSlider(goodSpec({ read: 'f' })), PREFIX + 'read は関数で指定してください');
  assertError(() => w.addSlider(goodSpec({ write: undefined })), PREFIX + 'write は関数で指定してください');
  assertError(() => w.addSlider(goodSpec({ write: null })), PREFIX + 'write は関数で指定してください');
  assertError(() => w.addSlider(goodSpec({ format: 'f' })), PREFIX + 'format は関数で指定してください');
  assertError(() => w.addSlider(goodSpec({ format: null })), PREFIX + 'format は関数で指定してください');
  w.addSlider(goodSpec({ format: (v) => String(v) }));
  assert.equal(w.view().parts.length, 1);
});

test('addSlider: 検証の順（知らない項目 → x → y → width → height → width と64 → label → min → max → step → read → write → format）', () => {
  const w = makeWindow().win;
  assertError(() => w.addSlider({ foo: 1, x: 'a' }), PREFIX + 'spec に使えない項目 foo があります');
  assertError(() => w.addSlider({ x: 'a', width: 'a' }), PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addSlider({ x: 1, y: 'a', width: 'a' }), PREFIX + 'y は有限の数値で指定してください');
  assertError(() => w.addSlider({ x: 1, y: 1, width: 'a', label: 1 }), PREFIX + 'width は正の有限数で指定してください');
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 10, height: 0, label: 1 }),
    PREFIX + 'height は正の有限数で指定してください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 10, label: 1 }),
    PREFIX + 'width は 64 より大きくしてください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 100, label: 1, min: 'a' }),
    PREFIX + 'label は文字列か、文字列を返す関数で指定してください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 100, label: 'a', min: 'a', max: 'a' }),
    PREFIX + 'min は有限の数値で指定してください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 100, label: 'a', min: 0, max: 'a', step: 'a' }),
    PREFIX + 'max は有限の数値で指定してください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 100, label: 'a', min: 1, max: 0, step: 'a' }),
    PREFIX + 'max は min より大きくしてください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 100, label: 'a', min: 0, max: 1, step: 'a', read: 1 }),
    PREFIX + 'step は正の有限数で指定してください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 100, label: 'a', min: 0, max: 1, step: 0.3, read: 1 }),
    PREFIX + 'max - min は step の整数倍にしてください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 100, label: 'a', min: 0, max: 1, step: 0.1, read: 1, write: 1, format: 1 }),
    PREFIX + 'read は関数で指定してください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 100, label: 'a', min: 0, max: 1, step: 0.1, read: () => 0, write: 1, format: 1 }),
    PREFIX + 'write は関数で指定してください',
  );
  assertError(
    () => w.addSlider({ x: 1, y: 1, width: 100, label: 'a', min: 0, max: 1, step: 0.1, read: () => 0, write: () => {}, format: 1 }),
    PREFIX + 'format は関数で指定してください',
  );
});

test('addSlider: エラーのときは部品が足されない', () => {
  const w = makeWindow().win;
  assert.throws(() => w.addSlider(goodSpec({ write: 1 })));
  assert.deepEqual(w.view().parts, []);
});

test('addSlider: 戻り値は使わない（undefined）', () => {
  assert.equal(makeWindow().win.addSlider(goodSpec()), undefined);
});

test('addSlider: 足す操作は label・read・write・format を呼ばない', () => {
  const { win } = makeWindow();
  const calls = [];
  win.addSlider(goodSpec({
    label: () => { calls.push('label'); return 'L'; },
    read: () => { calls.push('read'); return 0; },
    write: () => { calls.push('write'); },
    format: () => { calls.push('format'); return ''; },
  }));
  assert.deepEqual(calls, []);
});

test('既定の高さは 132、位置は x が窓の x・y が内側の y を原点にする', () => {
  assert.equal(DEFAULT_SLIDER_HEIGHT, 132);
  const { win } = addBar(0);
  const part = win.view().parts[0];
  assert.equal(part.kind, 'slider');
  assert.equal(part.info.x, 100);
  assert.equal(part.info.y, 198);
  assert.equal(part.info.width, 564);
  assert.equal(part.info.height, 132);
});

test('形（既定の高さ）: textRow・track・knob（value が min のとき、つまみの中心は溝の左端）', () => {
  assert.equal(SLIDER_GROOVE_HEIGHT, 12);
  const info = infoOf(addBar(0).win);
  assert.deepEqual(info.textRow, { x: 100, y: 198, width: 564, height: 44 });
  assert.deepEqual(info.track, { x: 132, y: 280, width: 500, height: 12 });
  assert.deepEqual(info.knob, { x: 100, y: 254, width: 64, height: 64 });
});

test('形（高さを変える）: 溝の段がつまみより低いと、つまみが溝の段の高さに縮む', () => {
  // 高さ 60: 溝の段 40・つまみ 40・cy = 198 + 40 = 238
  const info = infoOf(addBar(0, { height: 60 }).win);
  assert.equal(info.height, 60);
  assert.deepEqual(info.textRow, { x: 100, y: 198, width: 564, height: 20 });
  assert.deepEqual(info.track, { x: 120, y: 232, width: 524, height: 12 });
  assert.deepEqual(info.knob, { x: 100, y: 218, width: 40, height: 40 });
});

test('形（高さを変える）: 溝の段がつまみ以上なら、つまみは 64 のまま', () => {
  // 高さ 192: 文字の段 64・溝の段 128・つまみ 64
  const info = infoOf(addBar(0, { height: 192 }).win);
  assert.equal(info.knob.width, 64);
  assert.equal(info.knob.height, 64);
  assert.equal(info.textRow.height, 64);
  assert.equal(info.track.x, 132);
  assert.equal(info.track.width, 500);
});

test('つまみの位置: 範囲の中（刻みの値）', () => {
  // 中心 = 132 + 500 × t、knob.x = 中心 - 32
  const cases = [[0, 100], [0.5, 350], [1, 600], [0.2, 200]];
  for (const [value, knobX] of cases) {
    const info = infoOf(addBar(value).win);
    assert.equal(info.knob.x, knobX);
    assert.equal(info.value, value);
  }
});

test('つまみの位置: 刻みに合っていない値は、寄せずにその値の位置', () => {
  // 0.33 → 中心 132 + 165 = 297 → knob.x 265
  assert.equal(infoOf(addBar(0.33).win).knob.x, 265);
});

test('つまみの位置: 範囲外・Infinity・-Infinity は端', () => {
  assert.equal(infoOf(addBar(5).win).knob.x, 600);
  assert.equal(infoOf(addBar(-3).win).knob.x, 100);
  assert.equal(infoOf(addBar(Infinity).win).knob.x, 600);
  assert.equal(infoOf(addBar(-Infinity).win).knob.x, 100);
});

test('つまみの位置: NaN と数でない値は左端（min の位置）', () => {
  for (const v of [NaN, undefined, null, '0.5', true, {}, [0.5]]) {
    assert.equal(infoOf(addBar(v).win).knob.x, 100);
  }
});

test('値の文字: format が無ければ String(value)', () => {
  assert.equal(infoOf(addBar(0.5).win).text, '0.5');
  assert.equal(infoOf(addBar(undefined).win).text, 'undefined');
  assert.equal(infoOf(addBar(null).win).text, 'null');
});

test('値の文字: format があれば、読んだ値を渡した戻り値の文字', () => {
  const seen = [];
  const { win } = addBar(0.5, { format: (v) => { seen.push(v); return Math.round(v * 100) + '%'; } });
  assert.equal(infoOf(win).text, '50%');
  assert.deepEqual(seen, [0.5]);
});

test('値の文字: 範囲外でも読んだ値そのものを format に渡す（寄せた値ではない）', () => {
  const seen = [];
  const { win } = addBar(5, { format: (v) => { seen.push(v); return `<${v}>`; } });
  const info = infoOf(win);
  assert.equal(info.text, '<5>');
  assert.equal(info.value, 5);
  assert.deepEqual(seen, [5]);
  assert.equal(infoOf(addBar(5).win).text, '5');
});

test('info: 項目と値（value は read の戻り値そのもの）', () => {
  const info = infoOf(addBar(0.3, { label: 'ラベル', min: 0, max: 0.5, step: 0.1 }).win);
  assert.equal(info.label, 'ラベル');
  assert.equal(info.value, 0.3);
  assert.equal(info.min, 0);
  assert.equal(info.max, 0.5);
  assert.equal(info.step, 0.1);
  assert.equal(info.pressed, false);
  assert.equal(info.textSize, DEFAULT_TEXT_SIZE);
  assert.deepEqual(
    Object.keys(info).sort(),
    ['height', 'knob', 'label', 'max', 'min', 'pressed', 'step', 'text', 'textRow', 'textSize', 'track', 'value', 'width', 'x', 'y'],
  );
});

test('info: value が文字列でもそのまま', () => {
  assert.equal(infoOf(addBar('abc').win).value, 'abc');
});

test('info: textSize は窓の textSize', () => {
  const win = new UiWindow(
    { title: 'T', x: 100, y: 100, width: 600, height: 400, textSize: 20, onClose: () => {} },
    SCREEN,
  );
  win.addSlider(goodSpec());
  assert.equal(infoOf(win).textSize, 20);
});

test('info: label が関数なら view() ごとに呼ぶ', () => {
  let n = 0;
  const { win } = addBar(0, { label: () => `N${++n}` });
  assert.equal(n, 0);
  assert.equal(infoOf(win).label, 'N1');
  assert.equal(infoOf(win).label, 'N2');
  assert.equal(n, 2);
});

test('info: textRow・track・knob は新しいオブジェクト（書き換えても部品に影響しない）', () => {
  const { win } = addBar(0);
  const a = infoOf(win);
  a.track.x = 0;
  a.track.width = 1;
  a.textRow.y = 0;
  a.knob.x = 0;
  a.value = 99;
  const b = infoOf(win);
  assert.deepEqual(b.track, { x: 132, y: 280, width: 500, height: 12 });
  assert.equal(b.textRow.y, 198);
  assert.equal(b.knob.x, 100);
  assert.equal(b.value, 0);
  assert.notEqual(a.track, b.track);
  assert.notEqual(a.knob, b.knob);
  assert.notEqual(a.textRow, b.textRow);
});

test('view(): read を1回だけ呼び、write を呼ばない', () => {
  const { win, io } = addBar(0.5);
  assert.equal(io.reads(), 0);
  win.view();
  assert.equal(io.reads(), 1);
  win.view();
  assert.equal(io.reads(), 2);
  assert.deepEqual(io.writes(), []);
});

test('view(): format は1回だけ呼ぶ', () => {
  let n = 0;
  const { win } = addBar(0.5, { format: (v) => { n++; return String(v); } });
  win.view();
  assert.equal(n, 1);
});

test('値が外から変わっても次の描画で追従する', () => {
  const { win } = makeWindow();
  let v = 0;
  win.addSlider(goodSpec({ read: () => v }));
  assert.equal(infoOf(win).knob.x, 100);
  v = 1;
  assert.equal(infoOf(win).knob.x, 600);
});
