/**
 * @fileoverview 責務: oz/src/DebugOverlay.js の自動テスト（FPS の値の計算、最初の計算までの null、表示の有無と位置の保持、位置の一覧）。
 * 描画はテストしない。window と Canvas は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DebugOverlay, FPS_POSITIONS } from '../oz/src/DebugOverlay.js';

/**
 * 同じ間隔で update を複数回呼ぶ。
 * @param {DebugOverlay} overlay 対象。
 * @param {number} delta 1回あたりの経過時間（ミリ秒）。
 * @param {number} times 呼ぶ回数。
 * @returns {void}
 */
function run(overlay, delta, times) {
  for (let i = 0; i < times; i += 1) overlay.update(delta);
}

/**
 * 新しい DebugOverlay を作る。
 * @returns {DebugOverlay} インスタンス。
 */
function make() {
  return new DebugOverlay(1280, 720);
}

test('作った直後は fps が null、visible が false、position が top-left', () => {
  const o = make();
  assert.equal(o.fps, null);
  assert.equal(o.visible, false);
  assert.equal(o.position, 'top-left');
});

test('合計が1000未満の間は fps は null のまま', () => {
  const o = make();
  run(o, 20, 49);
  assert.equal(o.fps, null);
});

test('合計がちょうど1000になったフレームで更新される', () => {
  const o = make();
  run(o, 20, 49);
  assert.equal(o.fps, null);
  o.update(20);
  assert.equal(o.fps, 50);
});

test('四捨五入される', () => {
  const a = make();
  run(a, 400, 3);
  assert.equal(a.fps, 3);
  const b = make();
  run(b, 150, 7);
  assert.equal(b.fps, 7);
});

test('更新後は次に合計が1000に達するまで前の値を保つ', () => {
  const o = make();
  run(o, 20, 50);
  assert.equal(o.fps, 50);
  run(o, 25, 39);
  assert.equal(o.fps, 50);
  o.update(25);
  assert.equal(o.fps, 40);
});

test('update(0) もフレームに数える', () => {
  const o = make();
  o.update(0);
  run(o, 20, 50);
  assert.equal(o.fps, 51);
});

test('visible に関係なく fps は更新される', () => {
  const hidden = make();
  run(hidden, 20, 50);
  assert.equal(hidden.fps, 50);

  const toggled = make();
  toggled.visible = true;
  run(toggled, 20, 20);
  toggled.visible = false;
  run(toggled, 20, 20);
  toggled.visible = true;
  run(toggled, 20, 10);
  assert.equal(toggled.fps, 50);
});

test('FPS_POSITIONS は4つの値をこの順で持ち、凍結されている', () => {
  assert.deepEqual([...FPS_POSITIONS], ['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  assert.equal(Object.isFrozen(FPS_POSITIONS), true);
});

test('position と visible は代入した値を読み戻せる', () => {
  const o = make();
  for (const p of FPS_POSITIONS) {
    o.position = p;
    assert.equal(o.position, p);
  }
  o.visible = true;
  assert.equal(o.visible, true);
  o.visible = false;
  assert.equal(o.visible, false);
});
