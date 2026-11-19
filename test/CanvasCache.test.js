/**
 * @fileoverview 責務: oz/src/CanvasCache.js の自動テスト（引数の検証、画素数と余白の計算、画素合わせの判定、起動前のエラー）。
 * Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CanvasCache, validateCreateArgs, computeBakeLayout, snapToDevicePixels } from '../oz/src/CanvasCache.js';

const PREFIX = '[oz] CanvasCache.create: ';
const MSG_SOURCE = PREFIX + 'source (draw(ctx) を持つオブジェクト、または ctx を受け取る関数) が渡されていません';
const MSG_OPTIONS = PREFIX + 'options (設定オブジェクト) が渡されていません';
const MSG_BOUNDS = PREFIX + 'bounds (焼き付ける範囲 { minX, minY, maxX, maxY }) が渡されていません';
const MSG_FINITE = PREFIX + 'bounds の minX / minY / maxX / maxY は有限の数値で指定してください';
const MSG_EMPTY = PREFIX + 'bounds の範囲が空です（maxX は minX より、maxY は minY より大きくしてください）';
const MSG_SCALE = PREFIX + 'scale は正の有限数で指定してください';
const MSG_BEFORE_START = PREFIX + 'Engine.start の前には使えません';

/**
 * 正しい bounds を新しく作る。
 * @returns {{minX: number, minY: number, maxX: number, maxY: number}} bounds
 */
function goodBounds() {
  return { minX: -23, minY: -18, maxX: 22, maxY: 18 };
}

/**
 * 正しい source を作る。
 * @returns {{draw: Function}} source
 */
function goodSource() {
  return { draw() {} };
}

/**
 * validateCreateArgs が指定の文面の Error を投げることを確かめる。
 * @param {*} source source
 * @param {*} options options
 * @param {string} message 期待する文面
 * @returns {void}
 */
function assertInvalid(source, options, message) {
  assert.throws(
    () => validateCreateArgs(source, options),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.startsWith('[oz] CanvasCache.create:'));
      assert.equal(e.message, message);
      return true;
    },
  );
}

/**
 * 数値が許容幅内で等しいことを確かめる。
 * @param {number} actual 実際の値
 * @param {number} expected 期待する値
 * @returns {void}
 */
function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);
}

test('validateCreateArgs: draw を持つオブジェクトと関数が通り、scale は省略で 1', () => {
  const r1 = validateCreateArgs(goodSource(), { bounds: goodBounds() });
  assert.equal(r1.scale, 1);
  assert.deepEqual(r1.bounds, goodBounds());
  const r2 = validateCreateArgs(() => {}, { bounds: goodBounds(), scale: 0.5 });
  assert.equal(r2.scale, 0.5);
});

test('validateCreateArgs: bounds は写しである', () => {
  const b = goodBounds();
  const r = validateCreateArgs(goodSource(), { bounds: b });
  assert.notEqual(r.bounds, b);
  b.minX = -999;
  b.maxY = 999;
  assert.deepEqual(r.bounds, goodBounds());
});

test('validateCreateArgs: source が正しくない', () => {
  const opt = { bounds: goodBounds() };
  for (const s of [undefined, null, 5, {}, { draw: 1 }, { draw: 'x' }]) {
    assertInvalid(s, opt, MSG_SOURCE);
  }
});

test('validateCreateArgs: options が正しくない', () => {
  for (const o of [undefined, null, 5]) {
    assertInvalid(goodSource(), o, MSG_OPTIONS);
  }
});

test('validateCreateArgs: bounds が無い・null', () => {
  assertInvalid(goodSource(), {}, MSG_BOUNDS);
  assertInvalid(goodSource(), { bounds: null }, MSG_BOUNDS);
});

test('validateCreateArgs: bounds の4つの値が有限の数値でない', () => {
  for (const key of ['minX', 'minY', 'maxX', 'maxY']) {
    for (const bad of [NaN, Infinity, -Infinity, '1']) {
      const b = goodBounds();
      b[key] = bad;
      assertInvalid(goodSource(), { bounds: b }, MSG_FINITE);
    }
    const b = goodBounds();
    delete b[key];
    assertInvalid(goodSource(), { bounds: b }, MSG_FINITE);
  }
});

test('validateCreateArgs: bounds の範囲が空', () => {
  const cases = [
    { minX: 1, minY: 0, maxX: 1, maxY: 5 },
    { minX: 2, minY: 0, maxX: 1, maxY: 5 },
    { minX: 0, minY: 3, maxX: 5, maxY: 3 },
    { minX: 0, minY: 4, maxX: 5, maxY: 3 },
  ];
  for (const b of cases) {
    assertInvalid(goodSource(), { bounds: b }, MSG_EMPTY);
  }
});

test('validateCreateArgs: scale が正しくない', () => {
  for (const s of [0, -1, NaN, Infinity, null, '2']) {
    assertInvalid(goodSource(), { bounds: goodBounds(), scale: s }, MSG_SCALE);
  }
});

test('validateCreateArgs: チェックの順', () => {
  assertInvalid(undefined, undefined, MSG_SOURCE);
  assertInvalid(goodSource(), { bounds: null, scale: 0 }, MSG_BOUNDS);
  assertInvalid(goodSource(), { bounds: { minX: 1, minY: 0, maxX: 1, maxY: NaN }, scale: 0 }, MSG_FINITE);
  assertInvalid(goodSource(), { bounds: { minX: 1, minY: 0, maxX: 1, maxY: 5 }, scale: 0 }, MSG_EMPTY);
});

test('computeBakeLayout: 倍率 1、scale 1', () => {
  const l = computeBakeLayout(goodBounds(), 1, 1, 1);
  assert.equal(l.pixelWidth, 49);
  assert.equal(l.pixelHeight, 40);
  assert.equal(l.originX, 25);
  assert.equal(l.originY, 20);
  assert.equal(l.destX, -25);
  assert.equal(l.destY, -20);
  assert.equal(l.destWidth, 49);
  assert.equal(l.destHeight, 40);
  assert.equal(l.densityX, 1);
  assert.equal(l.densityY, 1);
});

test('computeBakeLayout: scale 1.5、倍率 2', () => {
  const l = computeBakeLayout(goodBounds(), 1.5, 2, 2);
  assert.equal(l.densityX, 3);
  assert.equal(l.densityY, 3);
  assert.equal(l.pixelWidth, 139);
  assert.equal(l.originX, 71);
  assert.equal(l.destX, -35.5);
  assert.equal(l.destWidth, 69.5);
  assert.equal(l.pixelHeight, 112);
  assert.equal(l.originY, 56);
  assert.equal(l.destY, -28);
  assert.equal(l.destHeight, 56);
});

test('computeBakeLayout: 端数のある範囲と x・y で違う倍率', () => {
  const b = { minX: -0.3, minY: 0.2, maxX: 10.4, maxY: 5.5 };
  const rx = 1.5;
  const ry = 1.25;
  const l = computeBakeLayout(b, 1, rx, ry);
  assert.equal(l.densityX, rx);
  assert.equal(l.densityY, ry);
  for (const v of [l.pixelWidth, l.pixelHeight, l.originX, l.originY]) {
    assert.ok(Number.isInteger(v));
  }
  assert.ok(l.pixelWidth >= 1 && l.pixelHeight >= 1);
  assert.ok(-l.originX <= b.minX * l.densityX - 2);
  assert.ok(l.pixelWidth - l.originX >= b.maxX * l.densityX + 2);
  assert.ok(-l.originY <= b.minY * l.densityY - 2);
  assert.ok(l.pixelHeight - l.originY >= b.maxY * l.densityY + 2);
  near(l.destX * rx, -l.originX);
  near(l.destWidth * rx, l.pixelWidth);
  near(l.destY * ry, -l.originY);
  near(l.destHeight * ry, l.pixelHeight);
});

test('computeBakeLayout: ratioX・ratioY が渡した倍率', () => {
  const l = computeBakeLayout(goodBounds(), 1, 1.5, 1.25);
  assert.equal(l.ratioX, 1.5);
  assert.equal(l.ratioY, 1.25);
});

test('snapToDevicePixels: 平行移動だけなら画素の位置を返す', () => {
  const layout = computeBakeLayout(goodBounds(), 1, 1.5, 1.25);
  const m = { a: 1.5, b: 0, c: 0, d: 1.25, e: 100.37, f: 55.62 };
  const r = snapToDevicePixels(m, layout);
  assert.deepEqual(r, {
    x: Math.round(m.e + m.a * layout.destX),
    y: Math.round(m.f + m.d * layout.destY),
  });
  assert.ok(Number.isInteger(r.x));
  assert.ok(Number.isInteger(r.y));
});

test('snapToDevicePixels: 回転・拡大・反転は null', () => {
  const layout = computeBakeLayout(goodBounds(), 1, 2, 2);
  assert.equal(snapToDevicePixels({ a: 2, b: 0.1, c: 0, d: 2, e: 0, f: 0 }, layout), null);
  assert.equal(snapToDevicePixels({ a: 2, b: 0, c: -0.1, d: 2, e: 0, f: 0 }, layout), null);
  assert.equal(snapToDevicePixels({ a: 3, b: 0, c: 0, d: 2, e: 0, f: 0 }, layout), null);
  assert.equal(snapToDevicePixels({ a: 2, b: 0, c: 0, d: 3, e: 0, f: 0 }, layout), null);
  assert.equal(snapToDevicePixels({ a: -2, b: 0, c: 0, d: 2, e: 0, f: 0 }, layout), null);
  assert.equal(snapToDevicePixels({ a: 2, b: 0, c: 0, d: -2, e: 0, f: 0 }, layout), null);
});

test('snapToDevicePixels: ε 以内のずれは画素合わせになる', () => {
  const layout = computeBakeLayout(goodBounds(), 1, 2, 2);
  const r = snapToDevicePixels({ a: 2 + 1e-9, b: 1e-9, c: -1e-9, d: 2 - 1e-9, e: 10.2, f: 20.7 }, layout);
  assert.notEqual(r, null);
  assert.ok(Number.isInteger(r.x));
  assert.ok(Number.isInteger(r.y));
});

test('CanvasCache.create: Engine.start の前には使えない', () => {
  assert.throws(
    () => CanvasCache.create(goodSource(), { bounds: goodBounds() }),
    (e) => e instanceof Error && e.message === MSG_BEFORE_START,
  );
  assert.throws(
    () => CanvasCache.create(),
    (e) => e instanceof Error && e.message === MSG_BEFORE_START,
  );
});
