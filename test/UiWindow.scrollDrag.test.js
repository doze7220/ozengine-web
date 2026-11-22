/**
 * @fileoverview 責務: oz/src/UiWindow.js のスクロールする領域の中の指の扱い（タップとドラッグの区別、押していた部品の取り消し、領域の中のスライダー）の自動テスト。
 * 距離 SCROLL_DRAG_DISTANCE の境、押した瞬間からの pressed、ドラッグ中の持ち主、スライダーの横寄り・縦寄りの分かれ方と遊び、'down' の無い move・up を確かめる。
 * 領域の検証・位置の計算・位置の表示は UiWindow.scroll.test.js が受け持つ。Canvas と window は使わない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UiWindow } from '../oz/src/UiWindow.js';
import {
  DEFAULT_PART_HEIGHT,
  DEFAULT_TITLE_BAR_HEIGHT,
  SCROLL_DRAG_DISTANCE,
  SLIDER_HYSTERESIS,
  SLIDER_KNOB_SIZE,
} from '../oz/src/UiMetrics.js';

/** テストで使う論理解像度。 */
const SCREEN = { width: 1280, height: 720 };

/** 窓の左上の x（窓の内側の原点の x もこれ）。窓は x 100〜700。 */
const WX = 100;

/** 窓の内側の原点の y（窓の y 100 + タイトルバーの高さ）。 */
const OY = 100 + DEFAULT_TITLE_BAR_HEIGHT;

/** 窓の外の x（窓の右端 700 より右）。 */
const OUT_X = 900;

/** 部品の種類ごとの、押す x と、同じ部品の中から外れる x（どちらの距離も SCROLL_DRAG_DISTANCE 以内）。 */
const POINTS = {
  button: { downX: WX + 195, awayX: WX + 205 },
  checkbox: { downX: WX + 195, awayX: WX + 205 },
  choices: { downX: WX + 125, awayX: WX + 140 },
};

/**
 * 窓を作る（(100, 100)・幅 600・高さ 500。外で離すと closed.n が増える）。
 * @param {{n: number}} [closed] 閉じる操作の呼ばれた回数の記録先
 * @returns {UiWindow} 窓
 */
function makeWindow(closed = { n: 0 }) {
  return new UiWindow(
    { title: 'T', x: WX, y: 100, width: 600, height: 500, onClose: () => { closed.n++; } },
    SCREEN,
  );
}

/**
 * ポインタを1回渡す。
 * @param {UiWindow} win 窓
 * @param {string} type 'down'・'move'・'up'
 * @param {number} x 論理座標の x
 * @param {number} y 論理座標の y
 * @returns {void}
 */
function point(win, type, x, y) {
  win.onPointer({ type, x, y });
}

/**
 * 部品の種類ごとに、領域 {x 0・y 0・width 300・height 200} の先頭（y 0）に部品を1つ足した窓を作る。
 * 領域の下（y 300）に表示だけの部品を足して、縦にスクロールできるようにする（中身の高さ 388）。
 * 反応は log に 'press'・'write:値' として残る。
 * - button: 幅 200 のボタン（押すと 'press'）
 * - checkbox: 幅 200 のチェックボックス（切りから始まる。書くと 'write:true'）
 * - choices: 幅 200・3つ（'a'・'b'・'c'）の選択肢の列（'a' から始まる。真ん中の 'b' を押すと 'write:b'、押した位置から 15 ずらした先は 'c'）
 * @param {'button' | 'checkbox' | 'choices'} kind 部品の種類
 * @returns {{win: UiWindow, log: string[]}} 窓と反応の記録
 */
function makePartRig(kind) {
  const win = makeWindow();
  const log = [];
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  if (kind === 'button') {
    scroll.addButton({ x: 0, y: 0, width: 200, label: 'B', onPress: () => { log.push('press'); } });
  } else if (kind === 'checkbox') {
    const state = { on: false };
    scroll.addCheckbox({
      x: 0, y: 0, width: 200, label: 'C',
      read: () => state.on,
      write: (v) => { state.on = v; log.push(`write:${v}`); },
    });
  } else {
    const state = { v: 'a' };
    scroll.addChoices({
      x: 0, y: 0, width: 200,
      choices: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }, { label: 'C', value: 'c' }],
      read: () => state.v,
      write: (v) => { state.v = v; log.push(`write:${v}`); },
    });
  }
  scroll.addValue({ x: 0, y: 300, width: 200, label: 'V', read: () => 1 });
  return { win, log };
}

/**
 * view() の最初のスクロールする領域の要素を返す。
 * @param {UiWindow} win 窓
 * @returns {{kind: string, info: Object, parts: Object[], scrollBar: (Object|null)}} 領域の要素
 */
function scrollView(win) {
  return win.view().parts.find((p) => p.kind === 'scroll');
}

/**
 * 領域の今のスクロールの位置を返す。
 * @param {UiWindow} win 窓
 * @returns {number} スクロールの位置
 */
function scrollY(win) {
  return scrollView(win).info.scrollY;
}

/**
 * 領域の中の最初の部品が、押されている見た目かを返す（選択肢の列は、どれかの選択肢が押されているか）。
 * @param {UiWindow} win 窓
 * @returns {boolean} 押されていれば true
 */
function isPressed(win) {
  const part = scrollView(win).parts[0];
  return part.kind === 'choices' ? part.info.choices.some((c) => c.pressed) : part.info.pressed;
}

/**
 * 領域の中の最初のスライダーの info を返す。
 * @param {UiWindow} win 窓
 * @returns {Object} スライダーの info
 */
function sliderInfo(win) {
  return scrollView(win).parts.find((p) => p.kind === 'slider').info;
}

/**
 * 押して、指定の位置へ動かして、離す。
 * @param {UiWindow} win 窓
 * @param {number} x 押す x
 * @param {number} y 押す y
 * @param {number} dx 動かす x の量
 * @param {number} dy 動かす y の量
 * @returns {void}
 */
function dragAndUp(win, x, y, dx, dy) {
  point(win, 'down', x, y);
  point(win, 'move', x + dx, y + dy);
  point(win, 'up', x + dx, y + dy);
}

/** スライダー用の窓の、スライダーの幅。 */
const SLIDER_WIDTH = 552;

/** スライダーの刻みの数（min 0・max 10・step 1）。 */
const SLIDER_STEPS = 10;

/** スライダー用の窓の、溝の左端の x。 */
const TRACK_X = WX + SLIDER_KNOB_SIZE / 2;

/** スライダー用の窓の、溝の幅。 */
const TRACK_W = SLIDER_WIDTH - SLIDER_KNOB_SIZE;

/** スライダーを押す y（スライダーの高さの中ほど）。 */
const SLIDER_Y = OY + 60;

/**
 * 刻みの番号の位置（つまみの中心の x）を返す。
 * @param {number} i 刻みの番号（0〜10）
 * @returns {number} 論理座標の x
 */
function posAt(i) {
  return TRACK_X + (TRACK_W * i) / SLIDER_STEPS;
}

/**
 * 領域 {x 0・y 0・width 560・height 200} の先頭に幅 552 のスライダー（min 0・max 10・step 1）を足した窓を作る。
 * 領域の下（y 300）に表示だけの部品を足して縦にスクロールできるようにする。read・write の呼ばれ方は state に残る。
 * @param {number} initial スライダーの最初の値
 * @param {{n: number}} [closed] 閉じる操作の呼ばれた回数の記録先
 * @returns {{win: UiWindow, state: {value: number, reads: number, writes: number[]}}} 窓と記録
 */
function makeSliderRig(initial, closed = { n: 0 }) {
  const win = makeWindow(closed);
  const state = { value: initial, reads: 0, writes: [] };
  const scroll = win.addScroll({ x: 0, y: 0, width: 560, height: 200 });
  scroll.addSlider({
    x: 0, y: 0, width: SLIDER_WIDTH, label: 'S', min: 0, max: SLIDER_STEPS, step: 1,
    read: () => { state.reads++; return state.value; },
    write: (v) => { state.writes.push(v); state.value = v; },
  });
  scroll.addValue({ x: 0, y: 300, width: 200, label: 'V', read: () => 1 });
  return { win, state };
}

test('距離: ちょうど SCROLL_DRAG_DISTANCE まではタップ、越えるとドラッグ（3種類の部品、縦・横・斜め）', () => {
  const cases = [
    [-SCROLL_DRAG_DISTANCE, 0, true],
    [0, SCROLL_DRAG_DISTANCE, true],
    [-12, 16, true],
    [-(SCROLL_DRAG_DISTANCE + 1), 0, false],
    [0, SCROLL_DRAG_DISTANCE + 1, false],
    [-12, 17, false],
  ];
  for (const kind of ['button', 'checkbox', 'choices']) {
    for (const [dx, dy, reacts] of cases) {
      const { win, log } = makePartRig(kind);
      dragAndUp(win, POINTS[kind].downX, OY + 10, dx, dy);
      assert.equal(log.length, reacts ? 1 : 0, `${kind} (${dx}, ${dy})`);
      assert.equal(scrollY(win), 0, `${kind} (${dx}, ${dy}): ドラッグになった move 自体では動かない`);
    }
  }
});

test('押した瞬間から pressed で、離すと戻る。部品のない場所・押せないボタンは pressed にならない', () => {
  for (const kind of ['button', 'checkbox', 'choices']) {
    const { win, log } = makePartRig(kind);
    assert.equal(isPressed(win), false);
    point(win, 'down', POINTS[kind].downX, OY + 10);
    assert.equal(isPressed(win), true, kind);
    assert.equal(scrollView(win).info.dragging, false, kind);
    assert.deepEqual(log, [], `${kind}: 押しただけでは反応しない`);
    point(win, 'up', POINTS[kind].downX, OY + 10);
    assert.equal(isPressed(win), false, kind);
    assert.equal(log.length, 1, kind);
  }
  // 部品のない場所
  const { win } = makePartRig('button');
  point(win, 'down', WX + 250, OY + 10);
  assert.equal(isPressed(win), false);
  point(win, 'up', WX + 250, OY + 10);
  // 押せないボタンは持ち主にならず、押しても押されている見た目にならない
  const win2 = makeWindow();
  const presses = [];
  win2.addScroll({ x: 0, y: 0, width: 300, height: 200 })
    .addButton({ x: 0, y: 0, width: 200, label: 'B', enabled: () => false, onPress: () => { presses.push(1); } });
  point(win2, 'down', WX + 50, OY + 10);
  assert.equal(isPressed(win2), false);
  point(win2, 'up', WX + 50, OY + 10);
  assert.deepEqual(presses, []);
});

test('距離の手前で部品の外へずらすと取り消しで、戻して離すと反応する（3種類の部品）', () => {
  for (const kind of ['button', 'checkbox', 'choices']) {
    const { downX, awayX } = POINTS[kind];
    const { win, log } = makePartRig(kind);
    point(win, 'down', downX, OY + 10);
    point(win, 'move', awayX, OY + 10);
    assert.equal(isPressed(win), false, `${kind}: 外へずらすと消える`);
    assert.equal(scrollView(win).info.dragging, false, kind);
    point(win, 'move', downX, OY + 10);
    assert.equal(isPressed(win), true, `${kind}: 戻すと押されている`);
    point(win, 'move', awayX, OY + 10);
    point(win, 'up', awayX, OY + 10);
    assert.deepEqual(log, [], `${kind}: 外で離すと反応しない`);
    assert.equal(scrollY(win), 0, kind);
    // 戻して離す
    point(win, 'down', downX, OY + 10);
    point(win, 'move', awayX, OY + 10);
    point(win, 'move', downX, OY + 10);
    point(win, 'up', downX, OY + 10);
    assert.equal(log.length, 1, `${kind}: 戻して離すと反応する`);
  }
});

test('距離を越えるとドラッグになり、押されていた部品は取り消される（離しても反応しない。縦に越えても横に越えても）', () => {
  for (const kind of ['button', 'checkbox', 'choices']) {
    for (const [dx, dy] of [[0, -(SCROLL_DRAG_DISTANCE + 1)], [-(SCROLL_DRAG_DISTANCE + 1), 0]]) {
      const { win, log } = makePartRig(kind);
      const { downX } = POINTS[kind];
      point(win, 'down', downX, OY + 40);
      assert.equal(isPressed(win), true);
      point(win, 'move', downX + dx, OY + 40 + dy);
      assert.equal(isPressed(win), false, `${kind} (${dx}, ${dy}): 押されている見た目が消える`);
      assert.equal(scrollView(win).info.dragging, true);
      // 押した部品の上へ戻して離しても反応しない
      point(win, 'move', downX, OY + 40);
      assert.equal(isPressed(win), false);
      point(win, 'up', downX, OY + 40);
      assert.deepEqual(log, [], `${kind} (${dx}, ${dy})`);
      assert.equal(scrollView(win).info.dragging, false);
      // 次の押し始めは新しい押下で、タップなら反応する
      point(win, 'down', downX, OY + 40);
      point(win, 'up', downX, OY + 40);
      assert.equal(log.length, 1, `${kind} (${dx}, ${dy}): 取り消し後もタップできる`);
    }
  }
});

test('ドラッグは、表示だけの部品・文字の表示・押せないボタンの上で押し始めても始まる', () => {
  const win = makeWindow();
  const presses = [];
  // 領域の高さを 300 にして、3つの部品（y 0・100・200、高さ 88）が全部見える範囲に収める
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 300 });
  scroll.addValue({ x: 0, y: 0, width: 200, label: 'num', read: () => 12 });
  scroll.addValue({ x: 0, y: 100, width: 200, label: () => 'text', read: () => 'abc' });
  scroll.addButton({
    x: 0, y: 200, width: 200, label: 'off', enabled: () => false, onPress: () => { presses.push(1); },
  });
  scroll.addValue({ x: 0, y: 400, width: 200, label: 'end', read: () => 1 });
  // 押す位置が、その部品の見える矩形（領域 OY〜OY+300 の内側）の上にあることを座標で確かめる
  const targets = [
    { partY: 0, y: OY + 20 },
    { partY: 100, y: OY + 120 },
    { partY: 200, y: OY + 220 },
  ];
  for (const { partY, y } of targets) {
    assert.ok(y >= OY + partY && y < OY + partY + DEFAULT_PART_HEIGHT, `y ${y} は部品 y ${partY} の矩形の上`);
    assert.ok(OY + partY + DEFAULT_PART_HEIGHT <= OY + 300, `部品 y ${partY} は領域の見える範囲の中`);
    assert.equal(scrollY(win), 0);
    point(win, 'down', WX + 50, y);
    point(win, 'move', WX + 50, y - (SCROLL_DRAG_DISTANCE + 1));
    assert.equal(scrollView(win).info.dragging, true, `y ${y}`);
    point(win, 'move', WX + 50, y - (SCROLL_DRAG_DISTANCE + 1) - 10);
    assert.equal(scrollY(win), 10, `y ${y}`);
    point(win, 'up', WX + 50, y);
    // 見た目の位置を戻す（部品の幅 200 より右の空き地で押す）
    point(win, 'down', WX + 250, OY + 100);
    point(win, 'move', WX + 250, OY + 100 + SCROLL_DRAG_DISTANCE + 1);
    point(win, 'move', WX + 250, OY + 100 + SCROLL_DRAG_DISTANCE + 1 + 10);
    point(win, 'up', WX + 250, OY + 100);
    assert.equal(scrollY(win), 0);
  }
  assert.deepEqual(presses, []);
});

test('ドラッグの始まり: x の動きはスクロールに使わず、始まった move の y が以後の差の基準になる', () => {
  const win = makeWindow();
  win.addScroll({ x: 0, y: 0, width: 300, height: 200 })
    .addValue({ x: 0, y: 300, width: 200, label: 'V', read: () => 1 });
  const y = OY + 100;
  point(win, 'down', WX + 100, y);
  // 斜めに越える（距離 21.2）。この move では動かない
  point(win, 'move', WX + 100 + 15, y - 15);
  assert.equal(scrollY(win), 0);
  assert.equal(scrollView(win).info.dragging, true);
  // 横にだけ動かしても動かない
  point(win, 'move', WX + 100 + 80, y - 15);
  assert.equal(scrollY(win), 0);
  // 縦の差だけ動く
  point(win, 'move', WX + 100 - 30, y - 15 - 12);
  assert.equal(scrollY(win), 12);
  point(win, 'up', WX + 100 - 30, y - 15 - 12);
  assert.equal(scrollY(win), 12);
  assert.equal(scrollView(win).info.dragging, false);
});

test('ドラッグ中に領域の外・窓の外へ出ても続き、離しても窓は閉じない。押し始めが窓の外なら閉じる', () => {
  const closed = { n: 0 };
  const win = makeWindow(closed);
  const scroll = win.addScroll({ x: 0, y: 0, width: 300, height: 200 });
  scroll.addButton({ x: 0, y: 0, width: 200, label: 'B', onPress: () => {} });
  scroll.addValue({ x: 0, y: 300, width: 200, label: 'V', read: () => 1 });
  const y = OY + 150;
  point(win, 'down', WX + 250, y);
  point(win, 'move', WX + 250, y - (SCROLL_DRAG_DISTANCE + 1));
  // 領域の外（領域の下端より下・窓の下）へ
  point(win, 'move', OUT_X, 5);
  assert.equal(scrollView(win).info.dragging, true);
  assert.equal(scrollY(win), 188, '窓の外へ出ても続き、下端で止まる');
  point(win, 'move', OUT_X, 700);
  assert.equal(scrollY(win), 0);
  point(win, 'up', OUT_X, 700);
  assert.equal(closed.n, 0);
  assert.equal(scrollView(win).info.dragging, false);
  // 押し始めが窓の外で、窓の外で離したときだけ閉じる（この窓が閉じられることの確認）
  point(win, 'down', OUT_X, 300);
  point(win, 'move', WX + 250, y);
  point(win, 'up', OUT_X, 300);
  assert.equal(closed.n, 1);
  assert.equal(scrollY(win), 0);
});

test("'down' の無い 'move'・'up' は、領域の中の部品にもスクロールにも反応しない", () => {
  const { win, log } = makePartRig('button');
  point(win, 'move', POINTS.button.downX, OY + 10);
  point(win, 'move', POINTS.button.downX, OY - 100);
  point(win, 'up', POINTS.button.downX, OY + 10);
  assert.deepEqual(log, []);
  assert.equal(scrollY(win), 0);
  assert.equal(isPressed(win), false);
  // 離した後の 'move' も、押し始めの無い 'move' と同じ（状態が残らない）
  point(win, 'down', WX + 250, OY + 100);
  point(win, 'up', WX + 250, OY + 100);
  point(win, 'move', WX + 250, OY + 10);
  point(win, 'up', WX + 250, OY + 10);
  assert.equal(scrollY(win), 0);
  assert.equal(scrollView(win).info.dragging, false);
  // スライダーも同じ
  const { win: sw, state } = makeSliderRig(2);
  point(sw, 'move', posAt(5), SLIDER_Y);
  point(sw, 'up', posAt(5), SLIDER_Y);
  assert.deepEqual(state.writes, []);
});

test('スライダー: 押しただけ・距離の手前の move では read も write も呼ばず、押されている見た目にもならない', () => {
  const { win, state } = makeSliderRig(2);
  point(win, 'down', posAt(5), SLIDER_Y);
  point(win, 'move', posAt(5) + SCROLL_DRAG_DISTANCE, SLIDER_Y);
  point(win, 'move', posAt(5), SLIDER_Y - SCROLL_DRAG_DISTANCE);
  assert.equal(state.reads, 0);
  assert.deepEqual(state.writes, []);
  // view() の確認（read が呼ばれる）
  assert.equal(sliderInfo(win).pressed, false);
  assert.equal(sliderInfo(win).value, 2);
  assert.equal(scrollView(win).info.dragging, false);
  point(win, 'up', posAt(5), SLIDER_Y);
});

test('スライダー: 動かさずに離すと、押した位置の刻みの値を1回だけ書く（同じ値なら書かない）', () => {
  const a = makeSliderRig(2);
  point(a.win, 'down', posAt(8), SLIDER_Y);
  point(a.win, 'up', posAt(8), SLIDER_Y);
  assert.deepEqual(a.state.writes, [8]);
  assert.equal(sliderInfo(a.win).pressed, false);
  // 距離ちょうどまでずれて離しても、押した位置の値
  const b = makeSliderRig(2);
  point(b.win, 'down', posAt(8), SLIDER_Y);
  point(b.win, 'move', posAt(8) + SCROLL_DRAG_DISTANCE, SLIDER_Y);
  point(b.win, 'up', posAt(8) + SCROLL_DRAG_DISTANCE, SLIDER_Y);
  assert.deepEqual(b.state.writes, [8]);
  // 溝の左端の外（つまみの半径の中）を押すと 0
  const c = makeSliderRig(5);
  point(c.win, 'down', WX + 4, SLIDER_Y);
  point(c.win, 'up', WX + 4, SLIDER_Y);
  assert.deepEqual(c.state.writes, [0]);
  // すでにその値なら書かない
  const d = makeSliderRig(8);
  point(d.win, 'down', posAt(8), SLIDER_Y);
  point(d.win, 'up', posAt(8), SLIDER_Y);
  assert.deepEqual(d.state.writes, []);
});

test('スライダー: 横寄りで距離を越えると、押した位置の値を書いて、以後は遊び付きで追う。スクロールはしない', () => {
  const { win, state } = makeSliderRig(2);
  point(win, 'down', posAt(5), SLIDER_Y);
  point(win, 'move', posAt(5) + SCROLL_DRAG_DISTANCE + 1, SLIDER_Y);
  // 越えた時点で、押した位置（動いた先ではない）の値が1回だけ書かれる
  assert.deepEqual(state.writes, [5]);
  assert.equal(sliderInfo(win).pressed, true);
  assert.equal(scrollView(win).info.dragging, false);
  // 遊びの内側では変わらない
  const half = TRACK_W / SLIDER_STEPS / 2;
  point(win, 'move', posAt(5) + half + SLIDER_HYSTERESIS - 1, SLIDER_Y);
  assert.deepEqual(state.writes, [5]);
  point(win, 'move', posAt(5) + half + SLIDER_HYSTERESIS + 1, SLIDER_Y);
  assert.deepEqual(state.writes, [5, 6]);
  // 縦の動きではスクロールせず、値も変えない
  point(win, 'move', posAt(5) + half + SLIDER_HYSTERESIS + 1, SLIDER_Y - 300);
  point(win, 'move', posAt(5) + half + SLIDER_HYSTERESIS + 1, SLIDER_Y + 300);
  assert.equal(scrollY(win), 0);
  assert.deepEqual(state.writes, [5, 6]);
  // 溝の端より外では端の値
  point(win, 'move', WX - 50, SLIDER_Y);
  assert.deepEqual(state.writes, [5, 6, 0]);
  point(win, 'up', WX - 50, SLIDER_Y);
  // 離した位置では値を変えない
  assert.deepEqual(state.writes, [5, 6, 0]);
  assert.equal(sliderInfo(win).pressed, false);
  assert.equal(scrollView(win).info.dragging, false);
  // 離した後の move は何もしない
  point(win, 'move', posAt(9), SLIDER_Y);
  assert.deepEqual(state.writes, [5, 6, 0]);
});

test('スライダー: 縦寄り・斜め45度（|dx| = |dy|）はスクロールで、値を書かず、以後の横の動きでも書かない', () => {
  const cases = [
    [0, -(SCROLL_DRAG_DISTANCE + 1)],
    [14, -16],
    [-14, 16],
    [15, -15],
    [-15, 15],
    [15, 15],
  ];
  for (const [dx, dy] of cases) {
    const { win, state } = makeSliderRig(2);
    point(win, 'down', posAt(5), SLIDER_Y);
    point(win, 'move', posAt(5) + dx, SLIDER_Y + dy);
    assert.equal(scrollView(win).info.dragging, true, `(${dx}, ${dy})`);
    assert.equal(sliderInfo(win).pressed, false);
    point(win, 'move', posAt(9), SLIDER_Y + dy - 10);
    point(win, 'move', posAt(1), SLIDER_Y + dy - 10);
    point(win, 'up', posAt(1), SLIDER_Y + dy - 10);
    assert.deepEqual(state.writes, [], `(${dx}, ${dy})`);
    assert.equal(sliderInfo(win).value, 2);
  }
  // 縦の動きがスクロールとして効く
  const { win } = makeSliderRig(2);
  point(win, 'down', posAt(5), SLIDER_Y);
  point(win, 'move', posAt(5), SLIDER_Y - (SCROLL_DRAG_DISTANCE + 1));
  point(win, 'move', posAt(5), SLIDER_Y - (SCROLL_DRAG_DISTANCE + 1) - 40);
  assert.equal(scrollY(win), 40);
  point(win, 'up', posAt(5), SLIDER_Y);
});

test('スライダー: 横寄りに越えた後は、領域の外・窓の外へ出ても追い、離しても窓は閉じない', () => {
  const closed = { n: 0 };
  const { win, state } = makeSliderRig(2, closed);
  point(win, 'down', posAt(5), SLIDER_Y);
  point(win, 'move', posAt(5) - (SCROLL_DRAG_DISTANCE + 1), SLIDER_Y);
  assert.deepEqual(state.writes, [5]);
  point(win, 'move', OUT_X, 5);
  assert.deepEqual(state.writes, [5, 10]);
  assert.equal(sliderInfo(win).pressed, true);
  point(win, 'up', OUT_X, 5);
  assert.equal(closed.n, 0);
  assert.deepEqual(state.writes, [5, 10]);
  assert.equal(sliderInfo(win).pressed, false);
});

test('スライダー: 窓に直接置いたものは、今までどおり押した瞬間に書いて、距離に関係なくすぐ追う', () => {
  const win = makeWindow();
  const state = { value: 2, writes: [] };
  win.addSlider({
    x: 0, y: 0, width: SLIDER_WIDTH, label: 'S', min: 0, max: SLIDER_STEPS, step: 1,
    read: () => state.value,
    write: (v) => { state.writes.push(v); state.value = v; },
  });
  point(win, 'down', posAt(5), SLIDER_Y);
  assert.deepEqual(state.writes, [5]);
  assert.equal(win.view().parts[0].info.pressed, true);
  point(win, 'move', posAt(5) + TRACK_W / SLIDER_STEPS, SLIDER_Y);
  assert.deepEqual(state.writes, [5, 6]);
  point(win, 'up', posAt(6), SLIDER_Y);
  assert.equal(win.view().parts[0].info.pressed, false);
});
