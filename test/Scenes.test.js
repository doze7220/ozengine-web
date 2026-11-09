/**
 * @fileoverview 責務: oz/src/Scenes.js の自動テスト（push・pop・change、init・destroy の順序、update、forEachFromBottom、consumeChanged）。
 * 公開されたプロパティ・メソッドだけを通して確かめる。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenes } from '../oz/src/Scenes.js';

/**
 * init・update・destroy の呼び出しを log に記録する偽のシーンを作る。
 * @param {string} name シーン名
 * @param {string[]} log 呼び出しを記録する共有の配列
 * @returns {{name: string, init: () => void, update: (dt: number) => void, destroy: () => void}} 偽のシーン
 */
function createFakeScene(name, log) {
  return {
    name,
    init() {
      log.push(`init:${name}`);
    },
    update(dt) {
      log.push(`update:${name}:${dt}`);
    },
    destroy() {
      log.push(`destroy:${name}`);
    },
  };
}

/**
 * スタックの下から順にシーン名を集める。
 * @param {Scenes} scenes 対象の Scenes
 * @returns {string[]} 下から順のシーン名
 */
function namesFromBottom(scenes) {
  const names = [];
  scenes.forEachFromBottom((scene) => names.push(scene.name));
  return names;
}

test('空のとき top は null', () => {
  assert.equal(new Scenes().top, null);
});

test('空のとき pop はエラーにならず何も呼ばない', () => {
  const scenes = new Scenes();
  assert.doesNotThrow(() => scenes.pop());
  assert.equal(scenes.top, null);
});

test('空のとき update はエラーにならない', () => {
  const scenes = new Scenes();
  assert.doesNotThrow(() => scenes.update(20));
});

test('空のとき forEachFromBottom のコールバックは呼ばれない', () => {
  const scenes = new Scenes();
  let called = 0;
  scenes.forEachFromBottom(() => called++);
  assert.equal(called, 0);
});

test('push したシーンが top になり、init が1回だけ呼ばれる', () => {
  const log = [];
  const scenes = new Scenes();
  const a = createFakeScene('A', log);
  scenes.push(a);
  assert.equal(scenes.top, a);
  assert.deepEqual(log, ['init:A']);
});

test('init の中から見た top は積んだシーン自身', () => {
  const scenes = new Scenes();
  let seenTop;
  const a = {
    init() {
      seenTop = scenes.top;
    },
    update() {},
    destroy() {},
  };
  scenes.push(a);
  assert.equal(seenTop, a);
});

test('2つ目を積んでも1つ目の destroy は呼ばれない', () => {
  const log = [];
  const scenes = new Scenes();
  const a = createFakeScene('A', log);
  const b = createFakeScene('B', log);
  scenes.push(a);
  scenes.push(b);
  assert.equal(scenes.top, b);
  assert.deepEqual(log, ['init:A', 'init:B']);
});

test('pop で最前面のシーンが外れて destroy が1回呼ばれ、top が1つ下になる', () => {
  const log = [];
  const scenes = new Scenes();
  const a = createFakeScene('A', log);
  const b = createFakeScene('B', log);
  scenes.push(a);
  scenes.push(b);
  log.length = 0;
  scenes.pop();
  assert.deepEqual(log, ['destroy:B']);
  assert.equal(scenes.top, a);
});

test('change は最前面から順に destroy し、新しいシーンを init してスタックがそれだけになる', () => {
  const log = [];
  const scenes = new Scenes();
  const a = createFakeScene('A', log);
  const b = createFakeScene('B', log);
  const c = createFakeScene('C', log);
  scenes.push(a);
  scenes.push(b);
  log.length = 0;
  scenes.change(c);
  assert.deepEqual(log, ['destroy:B', 'destroy:A', 'init:C']);
  assert.deepEqual(namesFromBottom(scenes), ['C']);
  assert.equal(scenes.top, c);
});

test('空のときの change は push と同じになる', () => {
  const log = [];
  const scenes = new Scenes();
  const a = createFakeScene('A', log);
  scenes.change(a);
  assert.deepEqual(log, ['init:A']);
  assert.equal(scenes.top, a);
});

test('update は最前面のシーンだけを、渡した dt で呼ぶ', () => {
  const log = [];
  const scenes = new Scenes();
  scenes.push(createFakeScene('A', log));
  scenes.push(createFakeScene('B', log));
  log.length = 0;
  scenes.update(20);
  assert.deepEqual(log, ['update:B:20']);
});

test('forEachFromBottom は下から順（積んだ順）に呼ぶ', () => {
  const log = [];
  const scenes = new Scenes();
  scenes.push(createFakeScene('A', log));
  scenes.push(createFakeScene('B', log));
  scenes.push(createFakeScene('C', log));
  assert.deepEqual(namesFromBottom(scenes), ['A', 'B', 'C']);
});

test('consumeChanged は最初は false', () => {
  assert.equal(new Scenes().consumeChanged(), false);
});

test('push の後の consumeChanged は1回目 true、続けて呼ぶと false', () => {
  const scenes = new Scenes();
  scenes.push(createFakeScene('A', []));
  assert.equal(scenes.consumeChanged(), true);
  assert.equal(scenes.consumeChanged(), false);
});

test('pop の後の consumeChanged は1回目 true、続けて呼ぶと false', () => {
  const scenes = new Scenes();
  scenes.push(createFakeScene('A', []));
  scenes.consumeChanged();
  scenes.pop();
  assert.equal(scenes.consumeChanged(), true);
  assert.equal(scenes.consumeChanged(), false);
});

test('change の後の consumeChanged は1回目 true、続けて呼ぶと false', () => {
  const scenes = new Scenes();
  scenes.push(createFakeScene('A', []));
  scenes.consumeChanged();
  scenes.change(createFakeScene('B', []));
  assert.equal(scenes.consumeChanged(), true);
  assert.equal(scenes.consumeChanged(), false);
});

test('空のときの pop の後も consumeChanged は false のまま', () => {
  const scenes = new Scenes();
  scenes.pop();
  assert.equal(scenes.consumeChanged(), false);
});

test('update・forEachFromBottom だけでは consumeChanged は true にならない', () => {
  const scenes = new Scenes();
  scenes.push(createFakeScene('A', []));
  scenes.consumeChanged();
  scenes.update(20);
  scenes.forEachFromBottom(() => {});
  assert.equal(scenes.consumeChanged(), false);
});
