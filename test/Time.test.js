/**
 * @fileoverview 責務: oz/src/Time.js の自動テスト（ティック長、蓄積と消費、上限、timeScale、gameTime、discardAccumulated、view）。
 * 公開されたプロパティ・メソッドだけを通して確かめる。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Time } from '../oz/src/Time.js';

/**
 * 蓄積されたティックをすべて消費し、消費できた回数を返す。
 * @param {Time} time 対象の Time
 * @returns {number} consumeTick() が true を返した回数
 */
function drainTicks(time) {
  let count = 0;
  while (time.consumeTick()) {
    count++;
    if (count > 100) throw new Error('consumeTick が終わらない');
  }
  return count;
}

/**
 * 最初の beginFrame（初回）を済ませた Time を作る。
 * @param {number} [tickRate=50] 1秒あたりのティック数
 * @param {number} [firstNow=0] 初回の now
 * @returns {Time} 初回を済ませた Time
 */
function createStartedTime(tickRate = 50, firstNow = 0) {
  const time = new Time(tickRate);
  time.beginFrame(firstNow);
  return time;
}

test('tickLength は 1000 / tickRate になる', () => {
  assert.equal(new Time(50).tickLength, 20);
  assert.equal(new Time(60).tickLength, 1000 / 60);
});

test('timeScale の初期値は 1', () => {
  assert.equal(new Time(50).timeScale, 1);
});

test('初回の beginFrame は realDelta が 0 で gameTime が進まず、consumeTick は false', () => {
  const time = new Time(50);
  time.beginFrame(123456);
  assert.equal(time.view.realDelta, 0);
  assert.equal(time.view.gameTime, 0);
  assert.equal(time.consumeTick(), false);
});

test('2回目以降の realDelta は now の差になる', () => {
  const time = createStartedTime(50, 1000);
  time.beginFrame(1050);
  assert.equal(time.view.realDelta, 50);
  time.beginFrame(1070);
  assert.equal(time.view.realDelta, 20);
});

test('蓄積がティック長に達している間だけ consumeTick が true になり、残りは持ち越される', () => {
  const time = createStartedTime();
  time.beginFrame(50);
  assert.equal(time.consumeTick(), true);
  assert.equal(time.consumeTick(), true);
  assert.equal(time.consumeTick(), false);
  time.beginFrame(60);
  assert.equal(time.consumeTick(), true);
  assert.equal(time.consumeTick(), false);
});

test('ティック長ちょうどの経過（tickRate 60）で、毎フレームちょうど1回 true になる', () => {
  const time = createStartedTime(60, 0);
  for (let i = 1; i <= 600; i++) {
    time.beginFrame(i * 1000 / 60);
    assert.equal(drainTicks(time), 1, `フレーム ${i}`);
  }
});

test('1フレームで消費できるのは5ティック分までで、gameTime も5ティック分だけ増える', () => {
  const time = createStartedTime();
  time.beginFrame(1000);
  assert.equal(drainTicks(time), 5);
  assert.equal(time.consumeTick(), false);
  assert.equal(time.view.gameTime, 100);
});

test('realDelta は上限で切られず、実際の差になる', () => {
  const time = createStartedTime();
  time.beginFrame(1000);
  assert.equal(time.view.realDelta, 1000);
});

test('timeScale 0.5 で 40ミリ秒経過すると gameTime が 20 増え、1ティック分になる', () => {
  const time = createStartedTime();
  time.timeScale = 0.5;
  time.beginFrame(40);
  assert.equal(time.view.gameTime, 20);
  assert.equal(drainTicks(time), 1);
});

test('timeScale 0 では realDelta は進むが gameTime と蓄積は進まない', () => {
  const time = createStartedTime();
  time.timeScale = 0;
  time.beginFrame(100);
  assert.equal(time.view.realDelta, 100);
  assert.equal(time.view.gameTime, 0);
  assert.equal(time.consumeTick(), false);
});

test('timeScale 2 のときも上限（5ティック分）が realDelta × timeScale に掛かる', () => {
  const time = createStartedTime();
  time.timeScale = 2;
  time.beginFrame(100);
  assert.equal(time.view.gameTime, 100);
  assert.equal(drainTicks(time), 5);
  time.beginFrame(1100);
  assert.equal(time.view.gameTime, 200);
  assert.equal(drainTicks(time), 5);
});

test('timeScale に不正な値を代入すると RangeError になり、値は変わらない', () => {
  for (const bad of [-1, NaN, Infinity, '1', null, undefined]) {
    const time = new Time(50);
    time.timeScale = 0.5;
    assert.throws(() => { time.timeScale = bad; }, RangeError, `値: ${String(bad)}`);
    assert.equal(time.timeScale, 0.5, `値: ${String(bad)}`);
  }
});

test('timeScale に 0 は代入できる', () => {
  const time = new Time(50);
  time.timeScale = 0;
  assert.equal(time.timeScale, 0);
});

test('gameTime は複数フレームの realDelta × timeScale（上限付き）の合計になる', () => {
  const time = createStartedTime();
  time.beginFrame(10); // +10 (x1)
  time.timeScale = 0.5;
  time.beginFrame(50); // +20 (40 x0.5)
  time.timeScale = 2;
  time.beginFrame(60); // +20 (10 x2)
  time.beginFrame(1060); // 上限 +100
  assert.equal(time.view.gameTime, 150);
});

test('discardAccumulated は蓄積を捨て、次の beginFrame では蓄積と gameTime を進めない', () => {
  const time = createStartedTime();
  time.beginFrame(30);
  time.discardAccumulated();
  assert.equal(time.consumeTick(), false);

  time.beginFrame(50);
  assert.equal(time.view.realDelta, 20);
  assert.equal(time.view.gameTime, 30);
  assert.equal(time.consumeTick(), false);

  time.beginFrame(70);
  assert.equal(time.view.realDelta, 20);
  assert.equal(time.view.gameTime, 50);
  assert.equal(time.consumeTick(), true);
});

test('view は毎回同じ凍結されたオブジェクトである', () => {
  const time = new Time(50);
  assert.equal(time.view, time.view);
  assert.equal(Object.isFrozen(time.view), true);
});

test('view の realDelta・gameTime・timeScale への代入は TypeError になる', () => {
  const view = new Time(50).view;
  assert.throws(() => { view.realDelta = 1; }, TypeError);
  assert.throws(() => { view.gameTime = 1; }, TypeError);
  assert.throws(() => { view.timeScale = 1; }, TypeError);
});

test('view から beginFrame や timeScale の変更後の最新の値が読める', () => {
  const time = createStartedTime();
  const view = time.view;
  time.timeScale = 0.5;
  time.beginFrame(40);
  assert.equal(view.realDelta, 40);
  assert.equal(view.gameTime, 20);
  assert.equal(view.timeScale, 0.5);
});
