/**
 * @fileoverview 責務: oz/src/Ui.js の公開の口（起動前のエラー、窓の操作の受け渡し、中央配置、ボタンの反応）の自動テスト。
 * Canvas と window は使わない（draw は呼ばない）。起動前のテストを先に書く（テストは書いた順に動く）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ui, setUiScreenSize } from '../oz/src/Ui.js';

/**
 * 呼ばれた回数を数える関数を作る。
 * @returns {{fn: Function, count: () => number}} 関数と回数の取得
 */
function counter() {
  let n = 0;
  return { fn: () => { n++; }, count: () => n };
}

/**
 * 中央に置かれる窓（幅 600、高さ 400）を作る。論理解像度 1280x720 なら x 340〜940・y 160〜560。
 * @param {Function} onClose 閉じるときに呼ぶ関数
 * @returns {ReturnType<typeof Ui.createWindow>} 窓の操作
 */
function makeCentered(onClose) {
  return Ui.createWindow({ title: 'T', width: 600, height: 400, onClose });
}

/**
 * 押して離す（同じ位置）。
 * @param {{onPointer: Function}} win 窓の操作
 * @param {number} x 論理座標の x
 * @param {number} y 論理座標の y
 * @returns {void}
 */
function click(win, x, y) {
  win.onPointer({ type: 'down', x, y });
  win.onPointer({ type: 'up', x, y });
}

const BEFORE_START = '[oz] Ui.createWindow: Engine.start の前には使えません';

test('起動前: 引数なしの Ui.createWindow は起動前のエラーになる', () => {
  assert.throws(() => Ui.createWindow(), { name: 'Error', message: BEFORE_START });
});

test('起動前: 正しい引数の Ui.createWindow も起動前のエラーになる', () => {
  assert.throws(() => makeCentered(() => {}), { name: 'Error', message: BEFORE_START });
});

test('起動後: 戻り値は凍結され、7つの関数だけを持つ', () => {
  setUiScreenSize(1280, 720);
  const win = makeCentered(() => {});
  assert.equal(Object.isFrozen(win), true);
  assert.deepEqual(Object.keys(win).sort(), [
    'addButton',
    'addCheckbox',
    'addChoices',
    'addSlider',
    'addValue',
    'draw',
    'onPointer',
  ]);
  for (const key of Object.keys(win)) {
    assert.equal(typeof win[key], 'function');
  }
});

test('起動後: 検証のエラーは [oz] Ui.createWindow: で始まる', () => {
  assert.throws(() => Ui.createWindow(), { name: 'Error', message: /^\[oz\] Ui\.createWindow: / });
  assert.throws(
    () => Ui.createWindow({ title: 'T', width: 600, height: 400, onClose() {}, closeOnOutsde: false }),
    { name: 'Error', message: '[oz] Ui.createWindow: options に使えない項目 closeOnOutsde があります' },
  );
});

test('中央配置: 窓の左端の1つ外 (339, 360) で押して離すと onClose が呼ばれる', () => {
  const onClose = counter();
  const win = makeCentered(onClose.fn);
  click(win, 339, 360);
  assert.equal(onClose.count(), 1);
});

test('中央配置: 窓の左端 (340, 360) で押して離しても onClose は呼ばれない', () => {
  const onClose = counter();
  const win = makeCentered(onClose.fn);
  click(win, 340, 360);
  assert.equal(onClose.count(), 0);
});

test('addButton で足したボタンが、戻り値の onPointer で反応する', () => {
  const onClose = counter();
  const onPress = counter();
  const win = makeCentered(onClose.fn);
  // 窓の内側の原点は (340, 248)（タイトルバー 88）。ボタンは画面上の x 340〜440・y 248〜298。
  win.addButton({ x: 0, y: 0, width: 100, height: 50, label: 'B', onPress: onPress.fn });
  click(win, 350, 260);
  assert.equal(onPress.count(), 1);
  assert.equal(onClose.count(), 0);
});

test('addCheckbox・addSlider・addChoices で足した部品が、戻り値の onPointer で反応する', () => {
  const win = makeCentered(() => {});
  const writes = [];
  // 窓の内側の原点は (340, 248)。3つの部品を縦に並べる（画面上の y 248〜、各 100 の間隔）。
  win.addCheckbox({ x: 0, y: 0, width: 200, height: 50, label: 'C', read: () => false, write: (v) => writes.push(['c', v]) });
  win.addSlider({ x: 0, y: 100, width: 300, height: 60, label: 'S', min: 0, max: 1, step: 0.5, read: () => 0, write: (v) => writes.push(['s', v]) });
  win.addChoices({
    x: 0,
    y: 200,
    width: 200,
    height: 50,
    choices: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }],
    read: () => 'a',
    write: (v) => writes.push(['x', v]),
  });
  click(win, 350, 260);
  click(win, 630, 360);
  click(win, 530, 460);
  assert.deepEqual(writes, [['c', true], ['s', 1], ['x', 'b']]);
});

test('addCheckbox・addSlider・addChoices の検証のエラーは戻り値の操作から投げられる', () => {
  const win = makeCentered(() => {});
  assert.throws(() => win.addCheckbox(), { name: 'Error', message: /^\[oz\] 窓の addCheckbox: / });
  assert.throws(() => win.addSlider(), { name: 'Error', message: /^\[oz\] 窓の addSlider: / });
  assert.throws(() => win.addChoices(), { name: 'Error', message: /^\[oz\] 窓の addChoices: / });
});

test('addButton の検証のエラーは戻り値の操作から投げられる', () => {
  const win = makeCentered(() => {});
  assert.throws(() => win.addButton(), { name: 'Error' });
});
