/**
 * @fileoverview 責務: oz/src/VirtualPad.js の自動テスト（配置の検証、当たり判定、方向、つまみ、ボタン、指の扱い）。
 * 公開されたものだけを通して確かめる。window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualPad, validatePadLayout } from '../oz/src/VirtualPad.js';

/**
 * 検証を通る基本の layout を作る。
 * @returns {object} layout
 */
function baseLayout() {
  return {
    stick: { x: 200, y: 500, radius: 100, deadZone: 0.25, keys: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' } },
    buttons: [{ x: 1000, y: 500, radius: 80, key: 'Space' }],
  };
}

/**
 * 基本の layout からパッドを作る。
 * @param {object} [layout] 使う layout
 * @returns {VirtualPad} パッド
 */
function makePad(layout = baseLayout()) {
  validatePadLayout(layout, 'Engine.addVirtualPad');
  return new VirtualPad(layout);
}

/**
 * 指でスティックを操作したときに押されるキーを並べて返す。
 * @param {number} dx 中心からのずれ x
 * @param {number} dy 中心からのずれ y
 * @param {object} [layout] 使う layout
 * @returns {string[]} 並べ替えたキー
 */
function keysAt(dx, dy, layout) {
  const pad = makePad(layout);
  pad.down(1, 200, 500);
  pad.move(1, 200 + dx, 500 + dy);
  return [...pad.heldKeys()].sort();
}

test('validatePadLayout: 正しい layout は通る', () => {
  assert.doesNotThrow(() => validatePadLayout(baseLayout(), 'Engine.addVirtualPad'));
  assert.doesNotThrow(() => validatePadLayout({ buttons: [{ x: 0, y: 0, radius: 1, key: 'A' }] }, 'X'));
  assert.doesNotThrow(() => validatePadLayout({ stick: { x: 0, y: 0, radius: 1, deadZone: 0, keys: {} } }, 'X'));
});

test('validatePadLayout: エラーは先頭に API 名を付け、項目名を含む', () => {
  const cases = [
    [(l) => { l.stick.radius = 0; }, 'stick.radius'],
    [(l) => { l.stick.x = NaN; }, 'stick.x'],
    [(l) => { l.stick.deadZone = 1; }, 'stick.deadZone'],
    [(l) => { l.stick.deadZone = -0.1; }, 'stick.deadZone'],
    [(l) => { delete l.stick.deadZone; }, 'stick.deadZone'],
    [(l) => { delete l.stick.keys; }, 'stick.keys'],
    [(l) => { l.stick.keys.Left = 'A'; }, 'stick.keys に使えない項目 Left'],
    [(l) => { l.stick.keys.left = ''; }, 'stick.keys.left'],
    [(l) => { l.buttons[0].key = ''; }, 'buttons[0].key'],
    [(l) => { l.buttons[0].radius = -1; }, 'buttons[0].radius'],
    [(l) => { delete l.buttons[0].x; }, 'buttons[0].x'],
    [(l) => { l.buttons[0].image = 'a.png'; }, 'buttons[0] に使えない項目 image'],
    [(l) => { l.stick.image = 'a.png'; }, 'stick に使えない項目 image'],
    [(l) => { l.extra = 1; }, 'layout に使えない項目 extra'],
    [(l) => { l.stick = null; }, 'stick'],
    [(l) => { l.buttons = {}; }, 'buttons'],
  ];
  for (const [mutate, expected] of cases) {
    const l = baseLayout();
    mutate(l);
    assert.throws(
      () => validatePadLayout(l, 'Engine.addVirtualPad'),
      (e) => e instanceof Error && e.message.startsWith('[oz] Engine.addVirtualPad:') && e.message.includes(expected),
      expected,
    );
  }
});

test('validatePadLayout: layout が不正な型、stick も buttons も無いとエラー', () => {
  assert.throws(() => validatePadLayout(null, 'X'), /\[oz\] X:/);
  assert.throws(() => validatePadLayout([], 'X'), /\[oz\] X:/);
  assert.throws(() => validatePadLayout({}, 'X'), /\[oz\] X:.*stick/);
  assert.throws(() => validatePadLayout({ buttons: [] }, 'X'), /\[oz\] X:/);
});

test('当たり判定: 円の内側（縁を含む）で持ち、外では持たない', () => {
  const pad = makePad();
  assert.equal(pad.down(1, 200, 500), true);
  assert.equal(pad.down(2, 300, 500), true);
  assert.equal(pad.down(3, 301, 500), false);
  assert.equal(pad.down(4, 1080, 500), true);
  assert.equal(pad.down(5, 1081, 500), false);
  assert.equal(pad.up(3), false);
});

test('スティックの方向: 右・左・上・下', () => {
  assert.deepEqual(keysAt(80, 0), ['ArrowRight']);
  assert.deepEqual(keysAt(-80, 0), ['ArrowLeft']);
  assert.deepEqual(keysAt(0, -80), ['ArrowUp']);
  assert.deepEqual(keysAt(0, 80), ['ArrowDown']);
});

test('スティックの方向: 斜めでは2方向が同時に押される', () => {
  assert.deepEqual(keysAt(60, 60), ['ArrowDown', 'ArrowRight']);
  assert.deepEqual(keysAt(-60, -60), ['ArrowLeft', 'ArrowUp']);
});

test('スティックの方向: 斜めの境界の手前では1方向だけ', () => {
  // 角度が約 22.5 度より小さければ縦の成分は押さない
  assert.deepEqual(keysAt(90, 20), ['ArrowRight']);
});

test('スティックの方向: 遊びの内側では何も押さない', () => {
  assert.deepEqual(keysAt(24, 0), []);
  assert.deepEqual(keysAt(25, 0), ['ArrowRight']);
});

test('スティックの方向: 割り当てのない方向は押さない', () => {
  const l = baseLayout();
  l.stick.keys = { left: 'ArrowLeft', right: 'ArrowRight' };
  assert.deepEqual(keysAt(0, 80, l), []);
  assert.deepEqual(keysAt(60, 60, l), ['ArrowRight']);
});

test('スティックの方向: 円の外へ出ても丸めずに判定する', () => {
  assert.deepEqual(keysAt(500, 0), ['ArrowRight']);
  assert.deepEqual(keysAt(300, -300), ['ArrowRight', 'ArrowUp']);
});

test('つまみの位置: 指が無ければ中心、円の内側なら指の位置、外なら円の縁に丸める', () => {
  const pad = makePad();
  let s = pad.snapshot().stick;
  assert.deepEqual([s.knobX, s.knobY, s.active], [200, 500, false]);
  pad.down(1, 230, 540);
  s = pad.snapshot().stick;
  assert.deepEqual([s.knobX, s.knobY, s.active], [230, 540, true]);
  pad.move(1, 200 + 600, 500 + 800);
  s = pad.snapshot().stick;
  assert.ok(Math.abs(s.knobX - 260) < 1e-9);
  assert.ok(Math.abs(s.knobY - 580) < 1e-9);
  pad.up(1);
  s = pad.snapshot().stick;
  assert.deepEqual([s.knobX, s.knobY, s.active], [200, 500, false]);
  assert.equal(pad.heldKeys().size, 0);
});

test('ボタン: 指を離すまで押したまま。外へ出ても押したまま', () => {
  const pad = makePad();
  pad.down(1, 1000, 500);
  assert.deepEqual([...pad.heldKeys()], ['Space']);
  pad.move(1, 5000, 5000);
  assert.deepEqual([...pad.heldKeys()], ['Space']);
  assert.equal(pad.snapshot().buttons[0].pressed, true);
  assert.equal(pad.up(1), true);
  assert.equal(pad.heldKeys().size, 0);
  assert.equal(pad.snapshot().buttons[0].pressed, false);
});

test('ボタン: 押し始めていない指が上を通っても押さない', () => {
  const pad = makePad();
  assert.equal(pad.down(1, 700, 500), false);
  pad.move(1, 1000, 500);
  assert.equal(pad.heldKeys().size, 0);
});

test('ボタン: 複数の指で押したら全部離すまで押したまま', () => {
  const pad = makePad();
  pad.down(1, 1000, 500);
  pad.down(2, 1010, 500);
  pad.up(1);
  assert.deepEqual([...pad.heldKeys()], ['Space']);
  pad.up(2);
  assert.equal(pad.heldKeys().size, 0);
});

test('スティックの2本目の指は何もしない（持つが操作に影響しない）', () => {
  const pad = makePad();
  pad.down(1, 280, 500);
  assert.equal(pad.down(2, 120, 500), true);
  assert.deepEqual([...pad.heldKeys()], ['ArrowRight']);
  pad.move(2, 120, 500);
  assert.deepEqual([...pad.heldKeys()], ['ArrowRight']);
  assert.equal(pad.up(2), true);
  assert.deepEqual([...pad.heldKeys()], ['ArrowRight']);
});

test('releaseAll: 何も押さない状態になり、その指は離すまで死んだ指として持たれる', () => {
  const pad = makePad();
  pad.down(1, 280, 500);
  pad.down(2, 1000, 500);
  pad.releaseAll();
  assert.equal(pad.heldKeys().size, 0);
  assert.equal(pad.snapshot().stick.active, false);
  pad.move(1, 290, 500);
  assert.equal(pad.heldKeys().size, 0);
  // 死んだ指は離すまで持ち続ける
  assert.equal(pad.down(1, 0, 0), true);
  assert.equal(pad.up(1), true);
  assert.equal(pad.up(2), true);
  assert.equal(pad.up(2), false);
  // 離した後は新しく押せる
  pad.down(3, 280, 500);
  assert.deepEqual([...pad.heldKeys()], ['ArrowRight']);
});

test('snapshot: 写しであり、変えても内部に影響しない。毎回新しいオブジェクト', () => {
  const pad = makePad();
  const a = pad.snapshot();
  a.stick.x = 999;
  a.buttons[0].pressed = true;
  a.buttons.push({});
  const b = pad.snapshot();
  assert.notEqual(a, b);
  assert.equal(b.stick.x, 200);
  assert.equal(b.buttons.length, 1);
  assert.equal(b.buttons[0].pressed, false);
  assert.deepEqual(b.buttons[0], { x: 1000, y: 500, radius: 80, key: 'Space', pressed: false });
});

test('snapshot: stick が無ければ null、buttons が無ければ空の配列', () => {
  assert.equal(makePad({ buttons: [{ x: 0, y: 0, radius: 5, key: 'A' }] }).snapshot().stick, null);
  const s = makePad({ stick: { x: 0, y: 0, radius: 5, deadZone: 0, keys: {} } }).snapshot();
  assert.deepEqual(s.buttons, []);
});

test('登録後に元の layout を変えても影響しない', () => {
  const l = baseLayout();
  const pad = makePad(l);
  l.stick.x = 0;
  l.stick.keys.right = 'KeyD';
  l.buttons[0].key = 'KeyB';
  l.buttons.push({ x: 0, y: 0, radius: 1, key: 'KeyC' });
  pad.down(1, 280, 500);
  pad.down(2, 1000, 500);
  assert.deepEqual([...pad.heldKeys()].sort(), ['ArrowRight', 'Space']);
  const s = pad.snapshot();
  assert.equal(s.stick.x, 200);
  assert.equal(s.buttons.length, 1);
});

test('ボタンが重なるときは配列の後ろのボタンが優先される', () => {
  const pad = makePad({
    buttons: [
      { x: 0, y: 0, radius: 50, key: 'A' },
      { x: 10, y: 0, radius: 50, key: 'B' },
    ],
  });
  pad.down(1, 5, 0);
  assert.deepEqual([...pad.heldKeys()], ['B']);
});
