/**
 * @fileoverview 責務: oz/src/UiWindow.js の、窓の内側で切り取られたチェックボックス・選択肢の列の、ずらす・離す・切り取られた部分での押下の自動テスト。
 * Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/*
 * テストの窓（makeWindow）: 窓の全体 x 100〜700・y 100〜500、
 * タイトルバー y 100〜188（閉じるボタン x 612〜700）、窓の内側 x 100〜700・y 188〜500。
 * 部品の原点は (100, 188)。部品の当たりの矩形は「部品の矩形と窓の内側の重なり」なので、
 * 内側からはみ出した部分（窓の外、またはタイトルバーに重なる部分）には当たらない。
 */

/**
 * 窓を作る。
 * @param {Object} [extra] 窓の設定への上書き・追加（例: `closeOnOutside: false`）
 * @returns {{win: UiWindow, closes: () => number}} 窓と onClose の回数の取得
 */
function makeWindow(extra = {}) {
  let n = 0;
  const win = new UiWindow(
    { title: 'T', x: 100, y: 100, width: 600, height: 400, onClose: () => { n++; }, ...extra },
    SCREEN,
  );
  return { win, closes: () => n };
}

/**
 * 値を読む関数と書く関数を記録する。write は値を変えない（記録だけ）。
 * @param {*} value read が返す値
 * @returns {{read: Function, write: Function, reads: () => number, writes: () => Array<*>}} 記録
 */
function makeIo(value) {
  let reads = 0;
  const written = [];
  return {
    read: () => { reads++; return value; },
    write: (v) => { written.push(v); },
    reads: () => reads,
    writes: () => written.slice(),
  };
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
 * 押して、順にずらして、最後の位置で離す。
 * @param {UiWindow} win 窓
 * @param {Array<[number, number]>} path 押す位置、ずらす位置…、離す位置（最後の位置で離す）
 * @returns {void}
 */
function drag(win, path) {
  ptr(win, 'down', path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) ptr(win, 'move', path[i][0], path[i][1]);
  const last = path[path.length - 1];
  ptr(win, 'up', last[0], last[1]);
}

/**
 * チェックボックスを1つ足した窓を作る。
 * @param {{x: number, y: number, width: number}} pos 部品の位置と幅
 * @param {Object} [winExtra] 窓の設定への上書き・追加
 * @returns {{win: UiWindow, io: ReturnType<typeof makeIo>, closes: () => number}} 窓と記録
 */
function addCheckbox(pos, winExtra = {}) {
  const { win, closes } = makeWindow(winExtra);
  const io = makeIo(false);
  win.addCheckbox({ ...pos, label: 'C', read: io.read, write: io.write });
  return { win, io, closes };
}

/**
 * 選択肢の列を1つ足した窓を作る（選択肢 'a'・'b'・'c'、read は初期値を返す）。
 * @param {Object} pos 部品の位置と幅（`direction` を含めてよい）
 * @param {string} value read が返す値
 * @param {Object} [winExtra] 窓の設定への上書き・追加
 * @returns {{win: UiWindow, io: ReturnType<typeof makeIo>, closes: () => number}} 窓と記録
 */
function addChoices(pos, value, winExtra = {}) {
  const { win, closes } = makeWindow(winExtra);
  const io = makeIo(value);
  win.addChoices({
    ...pos,
    choices: [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c' },
    ],
    read: io.read,
    write: io.write,
  });
  return { win, io, closes };
}

/**
 * view() の最初の部品の info を返す。
 * @param {UiWindow} win 窓
 * @returns {Object} info
 */
function infoOf(win) {
  return win.view().parts[0].info;
}

/**
 * チェックボックスの pressed を返す。
 * @param {UiWindow} win 窓
 * @returns {boolean} pressed
 */
function pressedCheck(win) {
  return infoOf(win).pressed;
}

/**
 * 選択肢の列の、選択肢ごとの pressed を返す。
 * @param {UiWindow} win 窓
 * @returns {boolean[]} pressed の配列
 */
function pressedOf(win) {
  return infoOf(win).choices.map((c) => c.pressed);
}

/*
 * チェックボックス A: { x: 500, y: 300, width: 300 } → 矩形 x 600〜900・y 488〜576、
 * 当たり x 600〜700・y 488〜500（窓の内側との重なり）。x 700 より右と y 500 より下は窓の外。
 */
const CHECK_A = { x: 500, y: 300, width: 300 };

test('チェックボックス: 内側で押して切り取られた部分へずらすと押下が消え、そこで離すと取り消し', () => {
  const { win, io, closes } = addCheckbox(CHECK_A);
  ptr(win, 'down', 650, 495);
  assert.equal(pressedCheck(win), true);
  ptr(win, 'move', 750, 495);
  assert.equal(pressedCheck(win), false);
  ptr(win, 'move', 650, 520);
  assert.equal(pressedCheck(win), false);
  ptr(win, 'up', 650, 520);
  assert.equal(pressedCheck(win), false);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test('チェックボックス: 取り消しのとき read は呼ばれない（view を呼ばない）', () => {
  const { win, io } = addCheckbox(CHECK_A);
  drag(win, [[650, 495], [750, 495], [650, 520]]);
  assert.equal(io.reads(), 0);
  assert.deepEqual(io.writes(), []);
});

test('チェックボックス: 切り取られた部分から内側へ戻して離すと反応する', () => {
  const { win, io } = addCheckbox(CHECK_A);
  ptr(win, 'down', 650, 495);
  ptr(win, 'move', 750, 495);
  ptr(win, 'move', 660, 490);
  assert.equal(pressedCheck(win), true);
  ptr(win, 'up', 660, 490);
  assert.deepEqual(io.writes(), [true]);
});

test('チェックボックス: 切り取られた部分（窓の外）で押して離すと、既定では窓が閉じる', () => {
  const { win, io, closes } = addCheckbox(CHECK_A);
  ptr(win, 'down', 750, 495);
  assert.equal(pressedCheck(win), false);
  ptr(win, 'up', 750, 495);
  assert.equal(pressedCheck(win), false);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 1);
});

test('チェックボックス: 切り取られた部分（窓の外）で押して離しても、closeOnOutside が false なら閉じない', () => {
  const { win, io, closes } = addCheckbox(CHECK_A, { closeOnOutside: false });
  drag(win, [[750, 495], [750, 495]]);
  assert.equal(pressedCheck(win), false);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test('チェックボックス: 窓の外で押し、見えている部分へずらして離しても、反応せず閉じない', () => {
  const { win, io, closes } = addCheckbox(CHECK_A);
  ptr(win, 'down', 650, 520);
  assert.equal(pressedCheck(win), false);
  ptr(win, 'move', 650, 495);
  assert.equal(pressedCheck(win), false);
  ptr(win, 'up', 650, 495);
  assert.equal(pressedCheck(win), false);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

/*
 * チェックボックス B: { x: 20, y: -40, width: 200 } → 矩形 x 120〜320・y 148〜236、
 * 当たり y 188〜236。矩形の上の部分（y 148〜188）はタイトルバーに重なる。
 */
const CHECK_B = { x: 20, y: -40, width: 200 };

test('チェックボックス: タイトルバーに重なる切り取られた部分で押して離しても、何も起きない', () => {
  const { win, io, closes } = addCheckbox(CHECK_B);
  ptr(win, 'down', 150, 160);
  assert.equal(pressedCheck(win), false);
  ptr(win, 'up', 150, 160);
  assert.equal(pressedCheck(win), false);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test('チェックボックス: 内側で押してタイトルバーに重なる部分へずらすと押下が消え、離しても取り消し', () => {
  const { win, io, closes } = addCheckbox(CHECK_B);
  ptr(win, 'down', 150, 200);
  assert.equal(pressedCheck(win), true);
  ptr(win, 'move', 150, 160);
  assert.equal(pressedCheck(win), false);
  ptr(win, 'up', 150, 160);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

/*
 * 横の選択肢の列 H: { x: 400, y: 300, width: 300 }・read は 'a' → 矩形 x 500〜800・y 488〜576。
 * 選択肢 0 は x 500〜600、1 は x 600〜700、2 は x 700〜800（全部が窓の外）。
 * 当たり x 500〜700・y 488〜500。
 */
const ROW_H = { x: 400, y: 300, width: 300 };

test('横の選択肢の列: 同じ選択肢の切り取られた部分へずらすと押下が消え、離すと取り消し', () => {
  const { win, io, closes } = addChoices(ROW_H, 'a');
  ptr(win, 'down', 650, 495);
  assert.deepEqual(pressedOf(win), [false, true, false]);
  ptr(win, 'move', 650, 520);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 650, 520);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test('横の選択肢の列: 別の選択肢の切り取られた部分へずらして離すと取り消し', () => {
  const { win, io } = addChoices(ROW_H, 'a');
  ptr(win, 'down', 650, 495);
  ptr(win, 'move', 750, 495);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 750, 495);
  assert.deepEqual(io.writes(), []);
});

test('横の選択肢の列: 切り取られた部分から押した選択肢へ戻して離すと反応する', () => {
  const { win, io } = addChoices(ROW_H, 'a');
  ptr(win, 'down', 650, 495);
  ptr(win, 'move', 650, 520);
  ptr(win, 'move', 660, 490);
  assert.deepEqual(pressedOf(win), [false, true, false]);
  ptr(win, 'up', 660, 490);
  assert.deepEqual(io.writes(), ['b']);
});

test('横の選択肢の列: 切り取られた部分（窓の外）で押して離すと、既定では窓が閉じる', () => {
  const { win, io, closes } = addChoices(ROW_H, 'a');
  ptr(win, 'down', 750, 495);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 750, 495);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 1);
});

test('横の選択肢の列: 切り取られた部分（窓の外）で押して離しても、closeOnOutside が false なら閉じない', () => {
  const { win, io, closes } = addChoices(ROW_H, 'a', { closeOnOutside: false });
  drag(win, [[750, 495], [750, 495]]);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test('横の選択肢の列: 窓の外で押し、見えている部分へずらして離しても、反応せず閉じない', () => {
  const { win, io, closes } = addChoices(ROW_H, 'a');
  ptr(win, 'down', 650, 520);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'move', 650, 495);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 650, 495);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

/*
 * 縦の選択肢の列 V: { x: 0, y: 250, width: 200, direction: 'vertical' }・read は 'b'
 * → 矩形 x 100〜300・y 438〜702。選択肢 0 は y 438〜526、当たり y 438〜500。
 */
const COLUMN_V = { x: 0, y: 250, width: 200, direction: 'vertical' };

test('縦の選択肢の列: 同じ選択肢の切り取られた部分へずらして離すと取り消し', () => {
  const { win, io } = addChoices(COLUMN_V, 'b');
  ptr(win, 'down', 150, 495);
  assert.deepEqual(pressedOf(win), [true, false, false]);
  ptr(win, 'move', 150, 510);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 150, 510);
  assert.deepEqual(io.writes(), []);
});

test('縦の選択肢の列: 切り取られた部分から押した選択肢へ戻して離すと反応する', () => {
  const { win, io } = addChoices(COLUMN_V, 'b');
  ptr(win, 'down', 150, 495);
  ptr(win, 'move', 150, 510);
  ptr(win, 'move', 150, 490);
  assert.deepEqual(pressedOf(win), [true, false, false]);
  ptr(win, 'up', 150, 490);
  assert.deepEqual(io.writes(), ['a']);
});

/*
 * 横の選択肢の列 T: { x: 0, y: -40, width: 300 } → 矩形 y 148〜236。
 * 上の部分（y 148〜188）はタイトルバーに重なる。
 */
test('横の選択肢の列: タイトルバーに重なる切り取られた部分で押して離しても、何も起きない', () => {
  const { win, io, closes } = addChoices({ x: 0, y: -40, width: 300 }, 'a');
  ptr(win, 'down', 150, 160);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  ptr(win, 'up', 150, 160);
  assert.deepEqual(pressedOf(win), [false, false, false]);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});
