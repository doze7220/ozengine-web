/**
 * @fileoverview 責務: oz/src/UiWindow.js の addSlider のポインタの動き（押した位置へ飛ぶ、刻みの値と小数の丸め、ドラッグ、端、遊び、read・write の呼ばれ方）の自動テスト。
 * 設定の検証と描く情報は UiWindow.slider.test.js が受け持つ。Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';
import { SLIDER_HYSTERESIS } from '../oz/src/UiMetrics.js';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/*
 * 窓の形（makeWindow）: 窓 (100, 100)-(700, 500)、窓の内側 x 100〜700・y 188〜500（部品の原点は (100, 188)）。
 * 標準のスライダー（addBar）: spec x 0・y 10・width 564 → 画面の矩形 x 100〜664・y 198〜330（高さ 132）。
 * 溝 track.x = 132・track.width = 500・中心の高さ 286。min 0・max 1・step 0.1 なら k = 10（刻みの幅 50）、
 * 刻み i の位置は 132 + 50 × i（0 → 132、3 → 282、4 → 332、10 → 632）。
 * 狭いスライダー（addNarrow）: width 164 → track.x = 132・track.width = 100、k = 10（刻みの幅 10）。
 */

/** ポインタの縦の位置（溝の中心）。 */
const Y = 286;

/**
 * 窓を作る。
 * @returns {{win: UiWindow, closes: () => number}} 窓と onClose の回数の取得
 */
function makeWindow() {
  let n = 0;
  const win = new UiWindow(
    { title: 'T', x: 100, y: 100, width: 600, height: 400, onClose: () => { n++; } },
    SCREEN,
  );
  return { win, closes: () => n };
}

/**
 * 値を読む関数と書く関数を記録する。follow が true なら write が値を変える（読み返しの確認用）。
 * @param {*} value read が返す最初の値
 * @param {boolean} [follow] write で値を更新するか
 * @returns {{read: Function, write: Function, reads: () => number, writes: () => Array<*>}} 記録
 */
function makeIo(value, follow = false) {
  let current = value;
  let reads = 0;
  const written = [];
  return {
    read: () => { reads++; return current; },
    write: (v) => { written.push(v); if (follow) current = v; },
    reads: () => reads,
    writes: () => written.slice(),
  };
}

/**
 * 正しいスライダーの設定を作る。
 * @param {Object} [extra] 上書き・追加する項目
 * @returns {Object} spec
 */
function goodSpec(extra = {}) {
  return {
    x: 0, y: 10, width: 564, label: 'L', min: 0, max: 1, step: 0.1, read: () => 0, write: () => {}, ...extra,
  };
}

/**
 * スライダーを1つ足した窓を作る。
 * @param {*} value read が返す最初の値
 * @param {Object} [extra] 上書き・追加する spec の項目
 * @param {boolean} [follow] write で値を更新するか
 * @returns {{win: UiWindow, io: ReturnType<typeof makeIo>, closes: () => number}} 窓と記録
 */
function addBar(value, extra = {}, follow = false) {
  const { win, closes } = makeWindow();
  const io = makeIo(value, follow);
  win.addSlider(goodSpec({ read: io.read, write: io.write, ...extra }));
  return { win, io, closes };
}

/**
 * 溝の幅 100 の狭いスライダー（刻みの幅 10、遊びを含めた 13 が刻みの幅より大きい）を足した窓を作る。
 * @param {*} value read が返す最初の値
 * @returns {{win: UiWindow, io: ReturnType<typeof makeIo>, closes: () => number}} 窓と記録
 */
function addNarrow(value) {
  return addBar(value, { width: 164 }, true);
}

/**
 * ポインタを渡す。
 * @param {UiWindow} win 窓
 * @param {string} type 'down' | 'move' | 'up'
 * @param {number} x 論理座標の x
 * @param {number} [y] 論理座標の y（省略は溝の中心の高さ）
 * @returns {void}
 */
function ptr(win, type, x, y = Y) {
  win.onPointer({ type, x, y });
}

/**
 * 最初の部品の pressed を返す。
 * @param {UiWindow} win 窓
 * @returns {boolean} ドラッグ中か
 */
function pressedOf(win) {
  return win.view().parts[0].info.pressed;
}

test('押した位置へ飛ぶ: write の引数は押した位置の刻みの値', () => {
  const { win, io } = addBar(0);
  ptr(win, 'down', 282);
  assert.deepEqual(io.writes(), [0.3]);
  assert.equal(pressedOf(win), true);
});

test('押した位置は、遊びを使わずに最も近い刻みへ丸める', () => {
  const { win, io } = addBar(0);
  ptr(win, 'down', 306); // r = 3.48 → 3
  ptr(win, 'up', 306);
  ptr(win, 'down', 308); // r = 3.52 → 4
  assert.deepEqual(io.writes(), [0.3, 0.4]);
});

test('刻みに合わせて止まる（刻みの間の位置は最も近い刻みの値）', () => {
  for (const [x, expected] of [[132, 0], [150, 0.0], [160, 0.1], [290, 0.3], [310, 0.4], [632, 1]]) {
    const { win, io } = addBar(0.55);
    ptr(win, 'down', x);
    assert.deepEqual(io.writes(), [expected], `x = ${x}`);
  }
});

test('同じ値なら write を呼ばない（read は1回呼ぶ）', () => {
  const { win, io } = addBar(0.3);
  ptr(win, 'down', 282);
  assert.deepEqual(io.writes(), []);
  assert.equal(io.reads(), 1);
  assert.equal(pressedOf(win), true);
});

test('読んだ値との比べ方は === （文字列の "0.3" は違う値として write する）', () => {
  const { win, io } = addBar('0.3');
  ptr(win, 'down', 282);
  assert.deepEqual(io.writes(), [0.3]);
});

test('小数の誤差が出ない: 0.3・0.7（min 0・max 1・step 0.1）', () => {
  const a = addBar(0);
  ptr(a.win, 'down', 282);
  assert.equal(a.io.writes()[0], 0.3);
  assert.notEqual(a.io.writes()[0], 0.30000000000000004);
  const b = addBar(0);
  ptr(b.win, 'down', 482);
  assert.equal(b.io.writes()[0], 0.7);
});

test('小数の誤差が出ない: -0.7（min -1・max 1・step 0.1）', () => {
  // k = 20、刻みの幅 25、番号 3 の位置は 132 + 75 = 207
  const { win, io } = addBar(0, { min: -1, max: 1, step: 0.1 });
  ptr(win, 'down', 207);
  assert.equal(io.writes()[0], -0.7);
});

test('小数の誤差が出ない: 1.25（min 0.5・max 2・step 0.25）', () => {
  // k = 6、番号 3 の位置は 132 + 250 = 382
  const { win, io } = addBar(0, { min: 0.5, max: 2, step: 0.25 });
  ptr(win, 'down', 382);
  assert.equal(io.writes()[0], 1.25);
});

test('小数の誤差が出ない: min 0・max 0.3・step 0.1 の最後は max そのもの', () => {
  // k = 3（2.9999999999999996 を整数倍とみなす）、番号 3 の位置は溝の右端 632、番号 2 は 132 + 500 × 2 / 3
  const a = addBar(0, { min: 0, max: 0.3, step: 0.1 });
  ptr(a.win, 'down', 632);
  assert.equal(a.io.writes()[0], 0.3);
  const b = addBar(0, { min: 0, max: 0.3, step: 0.1 });
  ptr(b.win, 'down', 132 + (500 * 2) / 3);
  assert.equal(b.io.writes()[0], 0.2);
});

test('端の刻みは min・max そのもの', () => {
  const a = addBar(0.5, { min: 0.1, max: 0.7, step: 0.2 });
  ptr(a.win, 'down', 132);
  assert.equal(a.io.writes()[0], 0.1);
  const b = addBar(0.5, { min: 0.1, max: 0.7, step: 0.2 });
  ptr(b.win, 'down', 632);
  assert.equal(b.io.writes()[0], 0.7);
});

test('溝の端より外（部品の中の端の余白）は min・max', () => {
  // 矩形 x 100〜664、溝 132〜632
  const a = addBar(0.5);
  ptr(a.win, 'down', 101);
  assert.deepEqual(a.io.writes(), [0]);
  const b = addBar(0.5);
  ptr(b.win, 'down', 663);
  assert.deepEqual(b.io.writes(), [1]);
});

test('押す位置の縦は使わない（部品の矩形の上端・下端の近くでも同じ）', () => {
  const a = addBar(0);
  ptr(a.win, 'down', 282, 198);
  assert.deepEqual(a.io.writes(), [0.3]);
  const b = addBar(0);
  ptr(b.win, 'down', 282, 329);
  assert.deepEqual(b.io.writes(), [0.3]);
});

test('矩形の外は押せない（右端・下端を含まない）', () => {
  const { win, io, closes } = addBar(0);
  ptr(win, 'down', 664, Y);
  assert.equal(pressedOf(win), false);
  ptr(win, 'up', 664, Y);
  ptr(win, 'down', 282, 330);
  assert.equal(pressedOf(win), false);
  ptr(win, 'up', 282, 330);
  assert.deepEqual(io.writes(), []);
  assert.equal(closes(), 0);
});

test('ドラッグで追う: move で刻みが変わるたびに write、同じ刻みの間は呼ばない', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282); // 0.3
  ptr(win, 'move', 380); // r = 4.96 → 5
  ptr(win, 'move', 384);
  ptr(win, 'move', 480); // r = 6.96 → 7
  assert.deepEqual(io.writes(), [0.3, 0.5, 0.7]);
});

test('ドラッグで戻る方向にも追う', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 482); // 0.7
  ptr(win, 'move', 382); // 0.5
  ptr(win, 'move', 232); // 0.2
  assert.deepEqual(io.writes(), [0.7, 0.5, 0.2]);
});

test('ドラッグ中の pressed: 押している間は true、離すと false', () => {
  const { win } = addBar(0, {}, true);
  assert.equal(pressedOf(win), false);
  ptr(win, 'down', 282);
  assert.equal(pressedOf(win), true);
  ptr(win, 'move', 380);
  assert.equal(pressedOf(win), true);
  ptr(win, 'up', 380);
  assert.equal(pressedOf(win), false);
});

test('溝の端より外へずらすと、端で止まる（部品の外でも）', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282); // 0.3
  ptr(win, 'move', 1000); // 部品・窓の外の右 → max
  ptr(win, 'move', 5); // 窓の外の左 → min
  assert.deepEqual(io.writes(), [0.3, 1, 0]);
});

test('端の外は遊びを使わない（刻みの幅が遊びを含めた幅より小さくても端へ行く）', () => {
  // 狭いスライダー: 溝 132〜232・刻みの幅 10。番号 1 の位置 142 から x 132 へ動かすと距離 10 < 5 + 8
  assert.equal(SLIDER_HYSTERESIS, 8);
  const a = addNarrow(0);
  ptr(a.win, 'down', 142);
  ptr(a.win, 'move', 132);
  assert.deepEqual(a.io.writes(), [0.1, 0]);
  // 番号 9 の位置 222 から x 232 へ動かす
  const b = addNarrow(0);
  ptr(b.win, 'down', 222);
  ptr(b.win, 'move', 232);
  assert.deepEqual(b.io.writes(), [0.9, 1]);
});

test('遊び: 要件の例の流れ（押して 3 → 314 は変わらない → 316 で 4 → 307 は 4 のまま → 298 で 3）', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282);
  assert.deepEqual(io.writes(), [0.3]);
  ptr(win, 'move', 314); // 中点 307 を 7 越えた
  assert.deepEqual(io.writes(), [0.3]);
  ptr(win, 'move', 316); // 9 越えた
  assert.deepEqual(io.writes(), [0.3, 0.4]);
  ptr(win, 'move', 307); // 戻しても 4 のまま
  assert.deepEqual(io.writes(), [0.3, 0.4]);
  ptr(win, 'move', 298); // 4 の位置 332 から 34 ≥ 33
  assert.deepEqual(io.writes(), [0.3, 0.4, 0.3]);
});

test('遊び: 境目の近くで指が揺れても値が行き来しない', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282);
  for (const x of [300, 310, 305, 312, 304, 314, 303, 311]) ptr(win, 'move', x);
  assert.deepEqual(io.writes(), [0.3]);
});

test('遊び: 押した瞬間は使わない（境目のすぐ向こうを押しても、その位置の刻みへ飛ぶ）', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282); // 0.3
  ptr(win, 'up', 282);
  ptr(win, 'down', 308); // 中点 307 を 1 越えただけ → 0.4
  assert.deepEqual(io.writes(), [0.3, 0.4]);
});

test('番号が変わらない move では read も write も呼ばない', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282);
  const reads = io.reads();
  ptr(win, 'move', 285);
  ptr(win, 'move', 290);
  ptr(win, 'move', 314);
  assert.equal(io.reads(), reads);
  assert.deepEqual(io.writes(), [0.3]);
});

test('番号が変わった move は read を1回呼び、値が同じなら write を呼ばない', () => {
  // read が 0.4 を返し続ける（write で更新しない）。押して 0.3 を書き、4 へ動かすと read の 0.4 と同じなので write しない
  const { win, io } = addBar(0.4);
  ptr(win, 'down', 282);
  assert.deepEqual(io.writes(), [0.3]);
  const reads = io.reads();
  ptr(win, 'move', 332);
  assert.equal(io.reads(), reads + 1);
  assert.deepEqual(io.writes(), [0.3]);
});

test("離したとき: 'up' は read も write も呼ばず、位置では値を変えない", () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282);
  const reads = io.reads();
  ptr(win, 'up', 582); // 離した位置は遠いが、値は変えない
  assert.equal(io.reads(), reads);
  assert.deepEqual(io.writes(), [0.3]);
  assert.equal(pressedOf(win), false);
});

test('外で離しても、それまでに書いた値はそのまま（取り消しは無い）', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282);
  ptr(win, 'move', 380);
  ptr(win, 'up', 1200, 700);
  assert.deepEqual(io.writes(), [0.3, 0.5]);
});

test('離した後は、新しい down から始める（前のドラッグの番号は残らない）', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282); // 0.3
  ptr(win, 'up', 282);
  ptr(win, 'down', 314); // 押した位置へ飛ぶ。r = 3.64 → 4
  assert.deepEqual(io.writes(), [0.3, 0.4]);
});

test('指が部品の上下へずれてもドラッグが続く', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282);
  ptr(win, 'move', 380, 150); // 部品の上（タイトルバーの高さ）
  ptr(win, 'move', 480, 450); // 部品の下（窓の内側の中）
  assert.deepEqual(io.writes(), [0.3, 0.5, 0.7]);
  assert.equal(pressedOf(win), true);
});

test('指が窓の内側の外・窓の外へずれてもドラッグが続き、離しても窓は閉じない', () => {
  const { win, io, closes } = addBar(0, {}, true);
  ptr(win, 'down', 282);
  ptr(win, 'move', 380, 600); // 窓の下
  ptr(win, 'move', 480, 20); // 窓の上
  ptr(win, 'move', 580, 700);
  assert.deepEqual(io.writes(), [0.3, 0.5, 0.7, 0.9]);
  ptr(win, 'up', 900, 700);
  assert.equal(closes(), 0);
  assert.equal(pressedOf(win), false);
});

test("'down' の無い 'move'・'up' に反応しない", () => {
  const { win, io, closes } = addBar(0);
  ptr(win, 'move', 282);
  ptr(win, 'up', 282);
  ptr(win, 'move', 380);
  ptr(win, 'up', 900, 700);
  assert.deepEqual(io.writes(), []);
  assert.equal(io.reads(), 0);
  assert.equal(pressedOf(win), false);
  assert.equal(closes(), 0);
});

test('部品の外で押して、部品の中へずらしても反応しない', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 400, 450); // 窓の中の、部品のない場所
  ptr(win, 'move', 282);
  ptr(win, 'up', 282);
  assert.deepEqual(io.writes(), []);
  assert.equal(pressedOf(win), false);
});

test('押している間の別の down は無視する', () => {
  const { win, io } = addBar(0, {}, true);
  ptr(win, 'down', 282);
  ptr(win, 'down', 482);
  assert.deepEqual(io.writes(), [0.3]);
  ptr(win, 'up', 282);
  assert.deepEqual(io.writes(), [0.3]);
});

test('窓の内側で切り取られた部分だけが押せる（押した後の位置と値の対応は切り取られていない溝のまま）', () => {
  // spec x 500・y 300・width 300 → 画面の矩形 x 600〜900・y 488〜620。溝 632〜868（幅 236）・k = 10。
  // 内側は x 〜700・y 〜500 なので押せるのは x 600〜700・y 488〜500
  const { win, io } = addBar(0, { x: 500, y: 300, width: 300 }, true);
  ptr(win, 'down', 750, 495);
  assert.equal(pressedOf(win), false);
  ptr(win, 'up', 750, 495);
  ptr(win, 'down', 650, 520);
  assert.equal(pressedOf(win), false);
  ptr(win, 'up', 650, 520);
  assert.deepEqual(io.writes(), []);
  ptr(win, 'down', 650, 495); // r = (650 - 632) / 236 × 10 = 0.76 → 1
  assert.equal(pressedOf(win), true);
  assert.deepEqual(io.writes(), [0.1]);
  ptr(win, 'move', 868, 495); // 切り取られていない溝の右端 → max
  assert.deepEqual(io.writes(), [0.1, 1]);
});

test('write は down では write の後に押されている状態にする（write の中の view では pressed が false）', () => {
  const { win } = makeWindow();
  let pressedInWrite = null;
  win.addSlider(goodSpec({
    write: () => { pressedInWrite = win.view().parts[0].info.pressed; },
  }));
  ptr(win, 'down', 282);
  assert.equal(pressedInWrite, false);
  assert.equal(pressedOf(win), true);
});

test('down の write の例外はそのまま伝わる。ドラッグは始まらない', () => {
  const { win } = makeWindow();
  const boom = new Error('boom');
  win.addSlider(goodSpec({ write: () => { throw boom; } }));
  assert.throws(() => ptr(win, 'down', 282), (e) => e === boom);
  assert.equal(pressedOf(win), false);
  // 持ち主も無いので、move・up は何も起こさない
  ptr(win, 'move', 380);
  ptr(win, 'up', 380);
  assert.equal(pressedOf(win), false);
});

test('move の write の例外はそのまま伝わる', () => {
  const { win } = makeWindow();
  const boom = new Error('boom');
  let calls = 0;
  win.addSlider(goodSpec({
    write: () => { calls++; if (calls === 2) throw boom; },
  }));
  ptr(win, 'down', 282);
  assert.throws(() => ptr(win, 'move', 380), (e) => e === boom);
  // up で解ける
  ptr(win, 'up', 380);
  assert.equal(pressedOf(win), false);
});

test('read の例外もそのまま伝わる', () => {
  const { win } = makeWindow();
  const boom = new Error('boom');
  win.addSlider(goodSpec({ read: () => { throw boom; } }));
  assert.throws(() => ptr(win, 'down', 282), (e) => e === boom);
});
