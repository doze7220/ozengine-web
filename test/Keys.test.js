/**
 * @fileoverview 責務: oz/src/Keys.js の自動テスト（短い押下、入力元の合成、blur、取りこぼし、ポインタの通過）。
 * 公開されたメソッドだけを通して確かめる。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keys } from '../oz/src/Keys.js';

/**
 * keydown のイベントを作る。
 * @param {string} code KeyboardEvent.code
 * @param {'keyboard'|'pad'} [source='keyboard'] 入力元
 * @returns {object} イベント
 */
function down(code, source = 'keyboard') {
  return { kind: 'keydown', code, source };
}

/**
 * keyup のイベントを作る。
 * @param {string} code KeyboardEvent.code
 * @param {'keyboard'|'pad'} [source='keyboard'] 入力元
 * @returns {object} イベント
 */
function up(code, source = 'keyboard') {
  return { kind: 'keyup', code, source };
}

test('キーボードだけ: 押すと isDown が真になり keydown が配られる', () => {
  const keys = new Keys();
  const out = keys.confirm([down('Space')]);
  assert.deepEqual(out, [down('Space')]);
  assert.equal(keys.isDown('Space'), true);
  assert.equal(keys.isDown('KeyA'), false);
});

test('キーボードだけ: 同じフレームで押して離しても、次の確定まで isDown は真', () => {
  const keys = new Keys();
  const out = keys.confirm([down('Space'), up('Space')]);
  assert.equal(out.length, 1);
  assert.equal(keys.isDown('Space'), true);
  keys.confirm([]);
  assert.equal(keys.isDown('Space'), false);
});

test('キーボードだけ: 離すと次の確定で偽になる', () => {
  const keys = new Keys();
  keys.confirm([down('KeyA')]);
  keys.confirm([up('KeyA')]);
  assert.equal(keys.isDown('KeyA'), false);
});

test('キーボードだけ: keyup を取りこぼした keydown も必ず配られる', () => {
  const keys = new Keys();
  keys.confirm([down('KeyA')]);
  const out = keys.confirm([down('KeyA')]);
  assert.deepEqual(out, [down('KeyA')]);
  assert.equal(keys.isDown('KeyA'), true);
});

test('blur: 押しているキーをすべて解除する', () => {
  const keys = new Keys();
  keys.confirm([down('KeyA'), down('KeyB', 'pad')]);
  keys.confirm([{ kind: 'blur' }]);
  assert.equal(keys.isDown('KeyA'), false);
  assert.equal(keys.isDown('KeyB'), false);
});

test('blur: 同じフレームで押したキーは次の確定まで押下を保つ', () => {
  const keys = new Keys();
  keys.confirm([down('KeyA'), { kind: 'blur' }]);
  assert.equal(keys.isDown('KeyA'), true);
  keys.confirm([]);
  assert.equal(keys.isDown('KeyA'), false);
});

test('キーボードとパッドで同じキー: keydown は1回だけ配られる', () => {
  const keys = new Keys();
  const first = keys.confirm([down('Space', 'keyboard')]);
  const second = keys.confirm([down('Space', 'pad')]);
  assert.equal(first.length, 1);
  assert.equal(second.length, 0);
});

test('キーボードとパッドで同じキー: 片方を離しても押したまま、両方離すと偽', () => {
  const keys = new Keys();
  keys.confirm([down('Space', 'keyboard')]);
  keys.confirm([down('Space', 'pad')]);
  keys.confirm([up('Space', 'keyboard')]);
  assert.equal(keys.isDown('Space'), true);
  keys.confirm([up('Space', 'pad')]);
  assert.equal(keys.isDown('Space'), false);
});

test('押していない入力元の keyup は何もしない', () => {
  const keys = new Keys();
  keys.confirm([down('Space', 'keyboard')]);
  keys.confirm([up('Space', 'pad')]);
  assert.equal(keys.isDown('Space'), true);
  keys.confirm([up('KeyZ')]);
  assert.equal(keys.isDown('KeyZ'), false);
});

test('ポインタのイベントはそのまま順に返る', () => {
  const keys = new Keys();
  const p1 = { kind: 'pointer', type: 'down', x: 1, y: 2 };
  const p2 = { kind: 'pointer', type: 'up', x: 3, y: 4 };
  const out = keys.confirm([p1, down('KeyA'), p2]);
  assert.deepEqual(out, [p1, down('KeyA'), p2]);
});
