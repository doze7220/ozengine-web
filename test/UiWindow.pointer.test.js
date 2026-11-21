/**
 * @fileoverview 責務: oz/src/UiWindow.js のポインタの振り分け（押す・ずらす・離す、押し始めの持ち主、窓の外・閉じるボタン、はみ出し・重なり）の自動テスト。
 * Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/*
 * 窓の形（makeWindow）: 窓 (100, 100)-(700, 500)、タイトルバー y 100〜188、
 * 閉じるボタン x 612〜700・y 100〜188、窓の内側 x 100〜700・y 188〜500（部品の原点は (100, 188)）。
 */

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
 * 窓を作る（位置 (100, 100)、幅 600、高さ 400）。
 * @param {Object} [extra] 上書き・追加する options の項目
 * @returns {{win: UiWindow, onClose: {fn: Function, count: () => number}}} 窓と onClose の回数
 */
function makeWindow(extra = {}) {
  const onClose = counter();
  const win = new UiWindow(
    { title: 'T', x: 100, y: 100, width: 600, height: 400, onClose: onClose.fn, ...extra },
    SCREEN,
  );
  return { win, onClose };
}

/**
 * ボタンを足す（窓の内側の左上が原点）。
 * @param {UiWindow} win 窓
 * @param {number} x 内側での x
 * @param {number} y 内側での y
 * @param {number} width 幅
 * @param {number} height 高さ
 * @param {Object} [extra] 上書き・追加する spec の項目
 * @returns {{count: () => number}} onPress の回数の取得
 */
function addBtn(win, x, y, width, height, extra = {}) {
  const onPress = counter();
  win.addButton({ x, y, width, height, label: 'B', onPress: onPress.fn, ...extra });
  return { count: onPress.count };
}

/**
 * ポインタを渡す。
 * @param {UiWindow} win 窓
 * @param {string} type 'down' | 'move' | 'up'
 * @param {number} x 論理座標の x
 * @param {number} y 論理座標の y
 * @returns {void}
 */
function ptr(win, type, x, y) {
  win.onPointer({ type, x, y });
}

/**
 * view() の部品の pressed を返す。
 * @param {UiWindow} win 窓
 * @param {number} index 部品の足した順
 * @returns {boolean} 押されている見た目か
 */
function pressedOf(win, index) {
  return win.view().parts[index].info.pressed;
}

/**
 * 押して離す（同じ位置）。
 * @param {UiWindow} win 窓
 * @param {number} x 論理座標の x
 * @param {number} y 論理座標の y
 * @returns {void}
 */
function click(win, x, y) {
  ptr(win, 'down', x, y);
  ptr(win, 'up', x, y);
}

// ボタン A: 画面 x 110〜210・y 198〜248（内側 (10, 10, 100, 50)）。
const A_IN = [150, 220];

test('押して離すと onPress が1回呼ばれる', () => {
  const { win } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50);
  click(win, ...A_IN);
  assert.equal(a.count(), 1);
});

test('押している間は pressed が真で、離すと偽になる', () => {
  const { win } = makeWindow();
  addBtn(win, 10, 10, 100, 50);
  assert.equal(pressedOf(win, 0), false);
  ptr(win, 'down', ...A_IN);
  assert.equal(pressedOf(win, 0), true);
  ptr(win, 'up', ...A_IN);
  assert.equal(pressedOf(win, 0), false);
});

test('押しただけでは onPress は呼ばれない', () => {
  const { win } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50);
  ptr(win, 'down', ...A_IN);
  assert.equal(a.count(), 0);
});

test('外へずらすと pressed が偽になり、外で離しても呼ばれない', () => {
  const { win } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50);
  ptr(win, 'down', ...A_IN);
  ptr(win, 'move', 400, 400);
  assert.equal(pressedOf(win, 0), false);
  ptr(win, 'up', 400, 400);
  assert.equal(a.count(), 0);
  assert.equal(pressedOf(win, 0), false);
});

test('外へずらしてから戻して離すと呼ばれる', () => {
  const { win } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50);
  ptr(win, 'down', ...A_IN);
  ptr(win, 'move', 400, 400);
  ptr(win, 'move', ...A_IN);
  assert.equal(pressedOf(win, 0), true);
  ptr(win, 'up', ...A_IN);
  assert.equal(a.count(), 1);
});

test('押し始めた部品だけが反応する（ほかのボタンの上で離すと、どちらも呼ばれない）', () => {
  const { win } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50);
  const b = addBtn(win, 150, 10, 100, 50); // 画面 x 250〜350
  ptr(win, 'down', ...A_IN);
  ptr(win, 'move', 300, 220);
  assert.equal(pressedOf(win, 1), false);
  ptr(win, 'up', 300, 220);
  assert.equal(a.count(), 0);
  assert.equal(b.count(), 0);
});

test('押せないボタン: 押しても pressed にならず、呼ばれない', () => {
  const { win } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50, { enabled: () => false });
  ptr(win, 'down', ...A_IN);
  assert.equal(pressedOf(win, 0), false);
  ptr(win, 'up', ...A_IN);
  assert.equal(a.count(), 0);
});

test('押したときは押せて、離すときに押せないなら呼ばれない', () => {
  const { win } = makeWindow();
  let enabled = true;
  const a = addBtn(win, 10, 10, 100, 50, { enabled: () => enabled });
  ptr(win, 'down', ...A_IN);
  assert.equal(pressedOf(win, 0), true);
  enabled = false;
  ptr(win, 'up', ...A_IN);
  assert.equal(a.count(), 0);
  assert.equal(pressedOf(win, 0), false);
});

test('押したときに押せないなら、離すときに押せても呼ばれない', () => {
  const { win } = makeWindow();
  let enabled = false;
  const a = addBtn(win, 10, 10, 100, 50, { enabled: () => enabled });
  ptr(win, 'down', ...A_IN);
  enabled = true;
  ptr(win, 'up', ...A_IN);
  assert.equal(a.count(), 0);
});

test('数値・文字の表示を押しても何も起きない（離すまで、下のボタンも反応しない）', () => {
  const { win, onClose } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50);
  win.addValue({ x: 10, y: 10, width: 100, height: 50, label: 'V', read: () => 1 });
  click(win, ...A_IN);
  assert.equal(a.count(), 0);
  assert.equal(onClose.count(), 0);
});

test('部品の無いところを押しても何も起きない（その押下は部品にも届かない）', () => {
  const { win, onClose } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50);
  ptr(win, 'down', 500, 400); // 内側の部品の無いところ
  ptr(win, 'move', ...A_IN);
  assert.equal(pressedOf(win, 0), false);
  ptr(win, 'up', ...A_IN);
  assert.equal(a.count(), 0);
  assert.equal(onClose.count(), 0);
});

test('タイトルバー（閉じるボタン以外）を押しても何も起きない', () => {
  const { win, onClose } = makeWindow();
  click(win, 300, 140);
  assert.equal(onClose.count(), 0);
});

test('閉じるボタン: 押して離すと onClose が1回呼ばれる', () => {
  const { win, onClose } = makeWindow();
  ptr(win, 'down', 650, 140);
  assert.equal(win.view().closeButton.pressed, true);
  assert.equal(onClose.count(), 0);
  ptr(win, 'up', 650, 140);
  assert.equal(win.view().closeButton.pressed, false);
  assert.equal(onClose.count(), 1);
});

test('閉じるボタン: 外へずらして離すと呼ばれない', () => {
  const { win, onClose } = makeWindow();
  ptr(win, 'down', 650, 140);
  ptr(win, 'move', 300, 140);
  assert.equal(win.view().closeButton.pressed, false);
  ptr(win, 'up', 300, 140);
  assert.equal(onClose.count(), 0);
});

test('窓の外で押して外で離すと onClose が1回呼ばれる', () => {
  const { win, onClose } = makeWindow();
  ptr(win, 'down', 50, 50);
  assert.equal(onClose.count(), 0);
  ptr(win, 'up', 900, 600);
  assert.equal(onClose.count(), 1);
});

test('窓の中で押して外で離すと呼ばれない', () => {
  const { win, onClose } = makeWindow();
  ptr(win, 'down', 500, 400);
  ptr(win, 'up', 900, 600);
  assert.equal(onClose.count(), 0);
});

test('窓の外で押して中で離すと呼ばれない', () => {
  const { win, onClose } = makeWindow();
  ptr(win, 'down', 50, 50);
  ptr(win, 'up', 500, 400);
  assert.equal(onClose.count(), 0);
});

test('窓の外で押して部品の上へずらして離しても、部品は反応しない', () => {
  const { win, onClose } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50);
  ptr(win, 'down', 50, 50);
  ptr(win, 'move', ...A_IN);
  assert.equal(pressedOf(win, 0), false);
  ptr(win, 'up', ...A_IN);
  assert.equal(a.count(), 0);
  assert.equal(onClose.count(), 0);
});

test('closeOnOutside が false なら、外で押して外で離しても呼ばれない', () => {
  const { win, onClose } = makeWindow({ closeOnOutside: false });
  ptr(win, 'down', 50, 50);
  ptr(win, 'up', 900, 600);
  assert.equal(onClose.count(), 0);
});

test("'down' の無い 'move'・'up' は、部品の上でも窓の外でも反応しない", () => {
  const { win, onClose } = makeWindow();
  const a = addBtn(win, 10, 10, 100, 50);
  ptr(win, 'move', ...A_IN);
  assert.equal(pressedOf(win, 0), false);
  ptr(win, 'up', ...A_IN);
  assert.equal(a.count(), 0);
  ptr(win, 'move', 50, 50);
  ptr(win, 'up', 50, 50);
  assert.equal(onClose.count(), 0);
  ptr(win, 'up', 650, 140); // 閉じるボタンの上
  assert.equal(onClose.count(), 0);
});

test('はみ出した部品: 窓の内側の部分は押せる', () => {
  const { win } = makeWindow();
  // 内側 x 450〜650 は、画面 x 550〜750。窓の右端は 700。
  const a = addBtn(win, 450, 10, 200, 50);
  click(win, 690, 220);
  assert.equal(a.count(), 1);
});

test('はみ出した部品: 窓の外の部分の押下は窓の外の押下になり、部品は反応しない', () => {
  const { win, onClose } = makeWindow();
  const a = addBtn(win, 450, 10, 200, 50);
  click(win, 720, 220);
  assert.equal(a.count(), 0);
  assert.equal(onClose.count(), 1);
});

test('はみ出した部品: 全部が窓の内側の外にある部品は押せない', () => {
  const { win, onClose } = makeWindow();
  // 内側の上端（画面 y 188）より上、タイトルバーの中（画面 y 138〜178）。
  const a = addBtn(win, 10, -50, 100, 40);
  click(win, 150, 150);
  assert.equal(a.count(), 0);
  assert.equal(onClose.count(), 0);
  // 窓の下端（画面 y 500）より下は窓の外の押下。
  const b = addBtn(win, 10, 330, 100, 40); // 画面 y 518〜558
  click(win, 150, 530);
  assert.equal(b.count(), 0);
  assert.equal(onClose.count(), 1);
});

test('重なり: 後に足した部品だけが反応する', () => {
  const { win } = makeWindow();
  const under = addBtn(win, 10, 10, 100, 50);
  const over = addBtn(win, 10, 10, 100, 50);
  click(win, ...A_IN);
  assert.equal(under.count(), 0);
  assert.equal(over.count(), 1);
});

test('重なり: 上が押せないボタンなら、下のボタンも押せない', () => {
  const { win } = makeWindow();
  const under = addBtn(win, 10, 10, 100, 50);
  addBtn(win, 10, 10, 100, 50, { enabled: () => false });
  click(win, ...A_IN);
  assert.equal(under.count(), 0);
});

test('onPress の中で同じ窓に部品を足しても、離した後の down が普通に動く', () => {
  const { win } = makeWindow();
  const later = counter();
  const first = counter();
  win.addButton({
    x: 10,
    y: 10,
    width: 100,
    height: 50,
    label: 'B',
    onPress: () => {
      first.fn();
      win.addButton({ x: 150, y: 10, width: 100, height: 50, label: 'C', onPress: later.fn });
    },
  });
  click(win, ...A_IN);
  assert.equal(first.count(), 1);
  assert.equal(win.view().parts.length, 2);
  assert.equal(pressedOf(win, 0), false);
  click(win, 300, 220); // 後から足したボタン
  assert.equal(later.count(), 1);
  click(win, ...A_IN);
  assert.equal(first.count(), 2);
});
