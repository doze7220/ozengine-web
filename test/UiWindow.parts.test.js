/**
 * @fileoverview 責務: oz/src/UiWindow.js の addButton・addValue の設定の検証、部品の位置、view() の部品の info（読む関数の呼び出し）、並びの自動テスト。
 * Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';
import { DEFAULT_PART_HEIGHT } from '../oz/src/UiMetrics.js';

const BUTTON_PREFIX = '[oz] 窓の addButton: ';
const VALUE_PREFIX = '[oz] 窓の addValue: ';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/**
 * 窓を作る（幅 600、高さ 400、位置は中央なので窓は (340, 160)、内側の左上は (340, 248)）。
 * @returns {UiWindow} 窓
 */
function makeWindow() {
  return new UiWindow({ title: 'T', width: 600, height: 400, onClose: () => {} }, SCREEN);
}

/**
 * 正しいボタンの設定を作る。
 * @param {Object} [extra] 上書き・追加する項目
 * @returns {Object} spec
 */
function goodButton(extra = {}) {
  return { x: 10, y: 20, width: 100, label: 'B', onPress: () => {}, ...extra };
}

/**
 * 正しい数値・文字の表示の設定を作る。
 * @param {Object} [extra] 上書き・追加する項目
 * @returns {Object} spec
 */
function goodValue(extra = {}) {
  return { x: 10, y: 20, width: 100, label: 'V', read: () => 1, ...extra };
}

/**
 * 呼ばれた回数を数える関数を作る。
 * @param {*} [result] 関数の戻り値
 * @returns {{fn: Function, count: () => number}} 関数と回数の取得
 */
function counter(result) {
  let n = 0;
  return { fn: () => { n++; return result; }, count: () => n };
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

test('addButton: spec がオブジェクトでない', () => {
  const msg = BUTTON_PREFIX + 'spec (ボタンの設定オブジェクト) が渡されていません';
  for (const bad of [undefined, null, [], 'x', 1]) {
    assertError(() => makeWindow().addButton(bad), msg);
  }
});

test('addButton: 知らない項目', () => {
  assertError(
    () => makeWindow().addButton(goodButton({ enable: () => true })),
    BUTTON_PREFIX + 'spec に使えない項目 enable があります',
  );
});

test('addButton: x・y（x が先）・width・height・label・onPress・enabled', () => {
  const w = makeWindow();
  assertError(() => w.addButton(goodButton({ x: undefined })), BUTTON_PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addButton(goodButton({ x: NaN, y: NaN })), BUTTON_PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addButton(goodButton({ y: Infinity })), BUTTON_PREFIX + 'y は有限の数値で指定してください');
  assertError(() => w.addButton(goodButton({ width: undefined })), BUTTON_PREFIX + 'width は正の有限数で指定してください');
  assertError(() => w.addButton(goodButton({ width: 0 })), BUTTON_PREFIX + 'width は正の有限数で指定してください');
  assertError(() => w.addButton(goodButton({ height: 0 })), BUTTON_PREFIX + 'height は正の有限数で指定してください');
  assertError(() => w.addButton(goodButton({ height: null })), BUTTON_PREFIX + 'height は正の有限数で指定してください');
  assertError(
    () => w.addButton(goodButton({ label: 1 })),
    BUTTON_PREFIX + 'label は文字列か、文字列を返す関数で指定してください',
  );
  assertError(
    () => w.addButton(goodButton({ label: undefined })),
    BUTTON_PREFIX + 'label は文字列か、文字列を返す関数で指定してください',
  );
  assertError(() => w.addButton(goodButton({ onPress: 'f' })), BUTTON_PREFIX + 'onPress は関数で指定してください');
  assertError(() => w.addButton(goodButton({ enabled: true })), BUTTON_PREFIX + 'enabled は関数で指定してください');
  assertError(() => w.addButton(goodButton({ enabled: null })), BUTTON_PREFIX + 'enabled は関数で指定してください');
});

test('addButton: 検証の順（知らない項目 → x → width → label → onPress）', () => {
  const w = makeWindow();
  assertError(
    () => w.addButton({ foo: 1, x: 'a' }),
    BUTTON_PREFIX + 'spec に使えない項目 foo があります',
  );
  assertError(() => w.addButton({ x: 'a', width: 'a' }), BUTTON_PREFIX + 'x は有限の数値で指定してください');
  assertError(
    () => w.addButton({ x: 1, y: 1, width: 1, label: 1, onPress: 1 }),
    BUTTON_PREFIX + 'label は文字列か、文字列を返す関数で指定してください',
  );
});

test('addValue: spec がオブジェクトでない', () => {
  const msg = VALUE_PREFIX + 'spec (表示の設定オブジェクト) が渡されていません';
  for (const bad of [undefined, null, [], 'x', 1]) {
    assertError(() => makeWindow().addValue(bad), msg);
  }
});

test('addValue: 知らない項目', () => {
  assertError(
    () => makeWindow().addValue(goodValue({ fromat: String })),
    VALUE_PREFIX + 'spec に使えない項目 fromat があります',
  );
});

test('addValue: x・y・width・height・label・read・format', () => {
  const w = makeWindow();
  assertError(() => w.addValue(goodValue({ x: 'a' })), VALUE_PREFIX + 'x は有限の数値で指定してください');
  assertError(() => w.addValue(goodValue({ y: NaN })), VALUE_PREFIX + 'y は有限の数値で指定してください');
  assertError(() => w.addValue(goodValue({ width: -1 })), VALUE_PREFIX + 'width は正の有限数で指定してください');
  assertError(() => w.addValue(goodValue({ height: Infinity })), VALUE_PREFIX + 'height は正の有限数で指定してください');
  assertError(
    () => w.addValue(goodValue({ label: {} })),
    VALUE_PREFIX + 'label は文字列か、文字列を返す関数で指定してください',
  );
  assertError(() => w.addValue(goodValue({ read: undefined })), VALUE_PREFIX + 'read は関数で指定してください');
  assertError(() => w.addValue(goodValue({ read: 5 })), VALUE_PREFIX + 'read は関数で指定してください');
  assertError(() => w.addValue(goodValue({ format: 'f' })), VALUE_PREFIX + 'format は関数で指定してください');
  assertError(() => w.addValue(goodValue({ format: null })), VALUE_PREFIX + 'format は関数で指定してください');
});

test('エラーのときは部品が足されない', () => {
  const w = makeWindow();
  assert.throws(() => w.addButton(goodButton({ onPress: 1 })));
  assert.throws(() => w.addValue(goodValue({ read: 1 })));
  assert.deepEqual(w.view().parts, []);
});

test('部品の位置: x は窓の x、y は内側の y を原点にする。既定の高さは 88', () => {
  assert.equal(DEFAULT_PART_HEIGHT, 88);
  const w = makeWindow();
  w.addButton(goodButton({ x: 10, y: 20, width: 100 }));
  w.addValue(goodValue({ x: 30, y: 40, width: 50, height: 60 }));
  const [b, v] = w.view().parts;
  assert.equal(b.info.x, 350);
  assert.equal(b.info.y, 268);
  assert.equal(b.info.width, 100);
  assert.equal(b.info.height, 88);
  assert.equal(v.info.x, 370);
  assert.equal(v.info.y, 288);
  assert.equal(v.info.width, 50);
  assert.equal(v.info.height, 60);
});

test('部品の位置は窓の外へはみ出しても info にそのまま入る（負の位置も）', () => {
  const w = makeWindow();
  w.addButton(goodButton({ x: -20, y: 300, width: 100 }));
  const info = w.view().parts[0].info;
  assert.equal(info.x, 320);
  assert.equal(info.y, 548);
});

test('部品の種類と並び（足した順）', () => {
  const w = makeWindow();
  w.addButton(goodButton({ label: 'A' }));
  w.addValue(goodValue({ label: 'B' }));
  w.addButton(goodButton({ label: 'C' }));
  const parts = w.view().parts;
  assert.deepEqual(parts.map((p) => p.kind), ['button', 'value', 'button']);
  assert.deepEqual(parts.map((p) => p.info.label), ['A', 'B', 'C']);
});

test('addButton・addValue の戻り値は無い', () => {
  const w = makeWindow();
  assert.equal(w.addButton(goodButton()), undefined);
  assert.equal(w.addValue(goodValue()), undefined);
});

test('ボタンの info: 文字列の label、押されていない、押せる、textSize', () => {
  const w = makeWindow();
  w.addButton(goodButton({ label: 'ボタン' }));
  const { kind, info } = w.view().parts[0];
  assert.equal(kind, 'button');
  assert.deepEqual(info, {
    x: 350, y: 268, width: 100, height: 88, label: 'ボタン', pressed: false, enabled: true, textSize: 36,
  });
});

test('ボタンの label が関数なら view() ごとに呼び、String(...) にする', () => {
  const w = makeWindow();
  let n = 0;
  w.addButton(goodButton({ label: () => ++n }));
  assert.equal(n, 0);
  assert.equal(w.view().parts[0].info.label, '1');
  assert.equal(w.view().parts[0].info.label, '2');
  assert.equal(n, 2);
});

test('ボタンの enabled の結果が info に入る（Boolean(...) で真偽にする）', () => {
  const w = makeWindow();
  let state = true;
  w.addButton(goodButton({ enabled: () => state }));
  w.addButton(goodButton({ enabled: () => 0 }));
  w.addButton(goodButton({ enabled: () => 'x' }));
  assert.deepEqual(w.view().parts.map((p) => p.info.enabled), [true, false, true]);
  state = false;
  assert.equal(w.view().parts[0].info.enabled, false);
});

test('addButton・onPointer では label・enabled を呼ばない（enabled は押したときに呼ぶ）', () => {
  const w = makeWindow();
  const label = counter('L');
  const enabled = counter(true);
  w.addButton(goodButton({ label: label.fn, enabled: enabled.fn }));
  assert.equal(label.count(), 0);
  assert.equal(enabled.count(), 0);
  w.onPointer({ type: 'move', x: 1, y: 1 });
  assert.equal(label.count(), 0);
  assert.equal(enabled.count(), 0);
  w.view();
  assert.equal(label.count(), 1);
  assert.equal(enabled.count(), 1);
});

test('数値・文字の表示の info: format が無ければ String(value)', () => {
  const w = makeWindow();
  w.addValue(goodValue({ read: () => 42 }));
  const { kind, info } = w.view().parts[0];
  assert.equal(kind, 'value');
  assert.deepEqual(info, {
    x: 350, y: 268, width: 100, height: 88, label: 'V', value: 42, text: '42', textSize: 36,
  });
});

test('format が無いとき null は \'null\'、undefined は \'undefined\'、value は読んだ値そのもの', () => {
  const w = makeWindow();
  const obj = { a: 1 };
  w.addValue(goodValue({ read: () => null }));
  w.addValue(goodValue({ read: () => undefined }));
  w.addValue(goodValue({ read: () => obj }));
  const [a, b, c] = w.view().parts.map((p) => p.info);
  assert.equal(a.value, null);
  assert.equal(a.text, 'null');
  assert.equal(b.value, undefined);
  assert.equal(b.text, 'undefined');
  assert.equal(c.value, obj);
  assert.equal(c.text, '[object Object]');
});

test('format には読んだ値が渡り、戻り値が String(...) で text になる', () => {
  const w = makeWindow();
  const args = [];
  w.addValue(goodValue({ read: () => 3.14159, format: (v) => { args.push(v); return v.toFixed(2); } }));
  w.addValue(goodValue({ read: () => null, format: (v) => (v === null ? '--' : String(v)) }));
  w.addValue(goodValue({ read: () => 1, format: () => 7 }));
  const infos = w.view().parts.map((p) => p.info);
  assert.deepEqual(args, [3.14159]);
  assert.equal(infos[0].text, '3.14');
  assert.equal(infos[0].value, 3.14159);
  assert.equal(infos[1].text, '--');
  assert.equal(infos[2].text, '7');
});

test('read・format は view() ごとに1回呼ばれ、addValue・onPointer では呼ばれない', () => {
  const w = makeWindow();
  const read = counter(5);
  const format = counter('x');
  w.addValue(goodValue({ read: read.fn, format: format.fn }));
  assert.equal(read.count(), 0);
  assert.equal(format.count(), 0);
  w.onPointer({ type: 'down', x: 350, y: 268 });
  w.onPointer({ type: 'move', x: 351, y: 269 });
  w.onPointer({ type: 'up', x: 351, y: 269 });
  assert.equal(read.count(), 0);
  assert.equal(format.count(), 0);
  w.view();
  assert.equal(read.count(), 1);
  assert.equal(format.count(), 1);
  w.view();
  assert.equal(read.count(), 2);
  assert.equal(format.count(), 2);
});

test('数値・文字の表示の label が関数なら view() ごとに呼ぶ', () => {
  const w = makeWindow();
  let n = 0;
  w.addValue(goodValue({ label: () => `名${++n}` }));
  assert.equal(w.view().parts[0].info.label, '名1');
  assert.equal(w.view().parts[0].info.label, '名2');
});

test('textSize は部品の info にも入る', () => {
  const w = new UiWindow({ title: 'T', width: 600, height: 400, onClose: () => {}, textSize: 20 }, SCREEN);
  w.addButton(goodButton());
  w.addValue(goodValue());
  assert.deepEqual(w.view().parts.map((p) => p.info.textSize), [20, 20]);
});

test('info を書き換えても部品に影響しない（毎回新しい）', () => {
  const w = makeWindow();
  w.addButton(goodButton());
  const a = w.view().parts[0].info;
  a.x = 0;
  a.label = 'changed';
  const b = w.view().parts[0].info;
  assert.equal(b.x, 350);
  assert.equal(b.label, 'B');
  assert.notEqual(a, b);
});

test('渡した spec を後から変えても部品に影響しない', () => {
  const w = makeWindow();
  const spec = goodButton({ x: 10 });
  w.addButton(spec);
  spec.x = 500;
  spec.width = 1;
  assert.equal(w.view().parts[0].info.x, 350);
  assert.equal(w.view().parts[0].info.width, 100);
});

test('view() は部品の状態を変えない（呼び続けても同じ）', () => {
  const w = makeWindow();
  w.addButton(goodButton());
  const first = w.view().parts[0].info;
  const second = w.view().parts[0].info;
  assert.deepEqual(first, second);
});
