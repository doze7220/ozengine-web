/**
 * @fileoverview 責務: oz/src/VirtualPads.js の自動テスト（touched、指の振り分け、キー列の差し込み、最前面の変化、blur、state）。
 * 公開されたものだけを通して確かめる。window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualPad, validatePadLayout } from '../oz/src/VirtualPad.js';
import { VirtualPads } from '../oz/src/VirtualPads.js';

/**
 * 基本の layout からパッドを作る。スティックは (200,500) 半径100、ボタンは (1000,500) 半径80。
 * @returns {VirtualPad} パッド
 */
function makePad() {
  const layout = {
    stick: { x: 200, y: 500, radius: 100, deadZone: 0.25, keys: { left: 'ArrowLeft', right: 'ArrowRight' } },
    buttons: [{ x: 1000, y: 500, radius: 80, key: 'Space' }],
  };
  validatePadLayout(layout, 'Engine.addVirtualPad');
  return new VirtualPad(layout);
}

/**
 * ポインタのイベントを作る。
 * @param {'down'|'move'|'up'} type 種類
 * @param {number} id pointerId
 * @param {number} x 論理座標 x
 * @param {number} y 論理座標 y
 * @param {boolean} [touch] タッチなら true
 * @returns {object} イベント
 */
function ptr(type, id, x, y, touch = true) {
  return { kind: 'pointer', type, x, y, id, touch };
}

/**
 * シーンの代わりのオブジェクトにパッドを登録した VirtualPads を作る。
 * @returns {{pads: VirtualPads, scene: object, other: object}} 振り分け器と2つのシーン
 */
function setup() {
  const pads = new VirtualPads();
  const scene = {};
  const other = {};
  pads.add(scene, makePad());
  return { pads, scene, other };
}

test('touched: マウスでは立たず、タッチの down で立つ', () => {
  const { pads, scene } = setup();
  assert.equal(pads.touched, false);
  pads.route([ptr('down', 1, 0, 0, false)], scene);
  assert.equal(pads.touched, false);
  pads.route([ptr('down', 2, 0, 0, true)], scene);
  assert.equal(pads.touched, true);
});

test('登録の無いシーンでは、タッチもそのまま通す', () => {
  const { pads, other } = setup();
  const events = [ptr('down', 1, 200, 500), ptr('up', 1, 200, 500), { kind: 'keydown', code: 'KeyA', source: 'keyboard' }];
  assert.deepEqual(pads.route(events, other), events);
  assert.deepEqual(pads.route(events, null), events);
});

test('route は新しい配列を返す', () => {
  const { pads, scene } = setup();
  const events = [{ kind: 'blur' }];
  assert.notEqual(pads.route(events, scene), events);
});

test('パッドの上のタッチを取り、キーの列を位置どおりに差し込む', () => {
  const { pads, scene } = setup();
  const before = { kind: 'keydown', code: 'KeyA', source: 'keyboard' };
  const after = { kind: 'keyup', code: 'KeyA', source: 'keyboard' };
  const out = pads.route([before, ptr('down', 1, 280, 500), after], scene);
  assert.deepEqual(out, [
    before,
    { kind: 'keydown', code: 'ArrowRight', source: 'pad' },
    after,
  ]);
});

test('キーの差は keyup を先、keydown を後にする', () => {
  const { pads, scene } = setup();
  pads.route([ptr('down', 1, 280, 500)], scene);
  const out = pads.route([ptr('move', 1, 120, 500)], scene);
  assert.deepEqual(out, [
    { kind: 'keyup', code: 'ArrowRight', source: 'pad' },
    { kind: 'keydown', code: 'ArrowLeft', source: 'pad' },
  ]);
});

test('パッドの指の move と up のポインタのイベントは捨てる', () => {
  const { pads, scene } = setup();
  pads.route([ptr('down', 1, 1000, 500)], scene);
  const moved = pads.route([ptr('move', 1, 1010, 500)], scene);
  assert.deepEqual(moved, []);
  const up = pads.route([ptr('up', 1, 1010, 500)], scene);
  assert.deepEqual(up, [{ kind: 'keyup', code: 'Space', source: 'pad' }]);
  // 離した後の同じ id は、パッドの外なら通る
  const again = pads.route([ptr('down', 1, 600, 100)], scene);
  assert.equal(again.length, 1);
  assert.equal(again[0].kind, 'pointer');
});

test('パッドの外のタッチはそのまま通す', () => {
  const { pads, scene } = setup();
  const e = ptr('down', 1, 600, 100);
  assert.deepEqual(pads.route([e], scene), [e]);
});

test('マウスはパッドの上でも通す', () => {
  const { pads, scene } = setup();
  const e = ptr('down', 1, 200, 500, false);
  assert.deepEqual(pads.route([e], scene), [e]);
});

test('最前面が変わったら keyup を先頭に入れ、その指は離すまで捨てる', () => {
  const { pads, scene, other } = setup();
  pads.route([ptr('down', 1, 280, 500), ptr('down', 2, 1000, 500)], scene);
  const e = { kind: 'keydown', code: 'KeyA', source: 'keyboard' };
  const out = pads.route([e, ptr('move', 1, 290, 500)], other);
  assert.equal(out.length, 3);
  assert.deepEqual(out.slice(0, 2).map((x) => x.kind), ['keyup', 'keyup']);
  assert.deepEqual(out.slice(0, 2).map((x) => x.code).sort(), ['ArrowRight', 'Space']);
  assert.deepEqual(out[2], e);
  // 元の最前面に戻っても、死んだ指は何も押さない
  const back = pads.route([ptr('move', 1, 290, 500)], scene);
  assert.deepEqual(back, []);
  const up = pads.route([ptr('up', 1, 290, 500)], scene);
  assert.deepEqual(up, []);
});

test('最前面が変わった後の同じフレームでは、新しい最前面にパッドが無ければタッチを通す', () => {
  const { pads, scene, other } = setup();
  pads.route([ptr('down', 1, 280, 500)], scene);
  const e = ptr('down', 2, 1000, 500);
  const out = pads.route([e], other);
  assert.deepEqual(out.slice(-1), [e]);
});

test('blur: 指を持つパッドを解除してから blur を足す。その指は離すまで捨てる', () => {
  const { pads, scene } = setup();
  pads.route([ptr('down', 1, 280, 500)], scene);
  const out = pads.route([{ kind: 'blur' }], scene);
  assert.deepEqual(out, [{ kind: 'keyup', code: 'ArrowRight', source: 'pad' }, { kind: 'blur' }]);
  assert.deepEqual(pads.route([ptr('move', 1, 290, 500)], scene), []);
});

test('state: 登録が無ければ null、あれば visible と stick・buttons を持つ', () => {
  const { pads, scene, other } = setup();
  assert.equal(pads.state(other), null);
  const s0 = pads.state(scene);
  assert.equal(s0.visible, false);
  assert.equal(s0.stick.active, false);
  assert.equal(s0.buttons.length, 1);
  pads.route([ptr('down', 1, 280, 500)], scene);
  const s1 = pads.state(scene);
  assert.equal(s1.visible, true);
  assert.equal(s1.stick.active, true);
  assert.equal(s1.stick.knobX, 280);
  assert.notEqual(pads.state(scene), s1);
});

test('has: 登録の有無を返す', () => {
  const { pads, scene, other } = setup();
  assert.equal(pads.has(scene), true);
  assert.equal(pads.has(other), false);
});
