/**
 * @fileoverview 責務: oz/src/Screen.js の自動テスト（表示サイズの調整、画素数（devicePixelRatio と上限）、リサイズ、toLogical）。
 * 偽の window と偽の canvas を使い、公開されたものだけを通して確かめる。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Screen } from '../oz/src/Screen.js';

/**
 * 偽の window を作る。addEventListener に登録されたリスナーを listeners に記録する。
 * @param {number} innerWidth ウィンドウの幅
 * @param {number} innerHeight ウィンドウの高さ
 * @param {number} [devicePixelRatio] 画素密度。省略時は持たない（倍率 1 として扱われる）
 * @returns {{innerWidth: number, innerHeight: number, devicePixelRatio?: number, listeners: Object<string, Function[]>, addEventListener: (type: string, listener: Function) => void}} 偽の window
 */
function createFakeWindow(innerWidth, innerHeight, devicePixelRatio) {
  const listeners = {};
  const fakeWindow = {
    innerWidth,
    innerHeight,
    listeners,
    addEventListener(type, listener) {
      (listeners[type] ??= []).push(listener);
    },
  };
  if (devicePixelRatio !== undefined) fakeWindow.devicePixelRatio = devicePixelRatio;
  return fakeWindow;
}

/**
 * 偽の window を globalThis.window に置き、テストの終了時に元の状態へ戻す。
 * @param {import('node:test').TestContext} t テストのコンテキスト
 * @param {object} fakeWindow 置く偽の window
 * @returns {void}
 */
function installWindow(t, fakeWindow) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    value: fakeWindow,
    configurable: true,
    writable: true,
  });
  t.after(() => {
    if (original) {
      Object.defineProperty(globalThis, 'window', original);
    } else {
      delete globalThis.window;
    }
  });
}

/**
 * 偽の canvas を作る。getBoundingClientRect の戻り値は rect プロパティを差し替えて変える。
 * @param {{left: number, top: number, width: number, height: number}} rect 表示矩形の初期値
 * width・height への代入は assigns.width・assigns.height に回数として数える。
 * @returns {{width: number, height: number, assigns: {width: number, height: number}, style: object, rect: object, getBoundingClientRect: () => object}} 偽の canvas
 */
function createFakeCanvas(rect) {
  let width = 0;
  let height = 0;
  return {
    assigns: { width: 0, height: 0 },
    get width() {
      return width;
    },
    set width(value) {
      width = value;
      this.assigns.width += 1;
    },
    get height() {
      return height;
    },
    set height(value) {
      height = value;
      this.assigns.height += 1;
    },
    style: {},
    rect,
    getBoundingClientRect() {
      return this.rect;
    },
  };
}

/**
 * 偽の window を置き、論理解像度 320x180 の Screen を作る。
 * @param {import('node:test').TestContext} t テストのコンテキスト
 * @param {number} innerWidth ウィンドウの幅
 * @param {number} innerHeight ウィンドウの高さ
 * @param {{left: number, top: number, width: number, height: number}} [rect] 表示矩形
 * @param {number} [devicePixelRatio] 画素密度。省略時は持たない
 * @returns {{screen: Screen, canvas: ReturnType<typeof createFakeCanvas>, fakeWindow: ReturnType<typeof createFakeWindow>}} 作ったもの
 */
function createScreen(t, innerWidth, innerHeight, rect = { left: 0, top: 0, width: 320, height: 180 }, devicePixelRatio) {
  const fakeWindow = createFakeWindow(innerWidth, innerHeight, devicePixelRatio);
  installWindow(t, fakeWindow);
  const canvas = createFakeCanvas(rect);
  const screen = new Screen(canvas, 320, 180);
  return { screen, canvas, fakeWindow };
}

test('構築時に canvas の width・height が表示サイズ（倍率 1）になる', async (t) => {
  await t.test('1280x720 のウィンドウ', (st) => {
    const { canvas } = createScreen(st, 1280, 720);
    assert.equal(canvas.width, 1280);
    assert.equal(canvas.height, 720);
  });
  await t.test('1000x700 のウィンドウ', (st) => {
    const { canvas } = createScreen(st, 1000, 700);
    assert.equal(canvas.width, 1000);
    assert.equal(canvas.height, 562);
  });
});

test('ウィンドウと同じ縦横比なら style がウィンドウの大きさになる', (t) => {
  const { canvas } = createScreen(t, 1280, 720);
  assert.equal(canvas.style.width, '1280px');
  assert.equal(canvas.style.height, '720px');
});

test('横で決まるとき、高さは切り捨てられる', (t) => {
  const { canvas } = createScreen(t, 1000, 700);
  assert.equal(canvas.style.width, '1000px');
  assert.equal(canvas.style.height, '562px');
});

test('縦で決まるとき、縦横比を保って収まる', (t) => {
  const { canvas } = createScreen(t, 2000, 360);
  assert.equal(canvas.style.width, '640px');
  assert.equal(canvas.style.height, '360px');
});

test('構築時に window へ resize のリスナーが登録される', (t) => {
  const { fakeWindow } = createScreen(t, 1280, 720);
  assert.equal(fakeWindow.listeners.resize.length, 1);
  assert.equal(typeof fakeWindow.listeners.resize[0], 'function');
});

test('リサイズで style と canvas の画素数が新しいウィンドウに合わせて変わる', (t) => {
  const { canvas, fakeWindow } = createScreen(t, 1280, 720);
  fakeWindow.innerWidth = 2000;
  fakeWindow.innerHeight = 360;
  for (const listener of fakeWindow.listeners.resize) listener();
  assert.equal(canvas.style.width, '640px');
  assert.equal(canvas.style.height, '360px');
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
});

test('devicePixelRatio が 2 なら画素数が表示サイズの2倍になる', (t) => {
  const { canvas } = createScreen(t, 1280, 720, undefined, 2);
  assert.equal(canvas.style.width, '1280px');
  assert.equal(canvas.width, 2560);
  assert.equal(canvas.height, 1440);
});

test('devicePixelRatio が 1.5 なら四捨五入した1.5倍になる', (t) => {
  const { canvas } = createScreen(t, 1000, 700, undefined, 1.5);
  assert.equal(canvas.style.width, '1000px');
  assert.equal(canvas.style.height, '562px');
  assert.equal(canvas.width, 1500);
  assert.equal(canvas.height, 843);
});

test('devicePixelRatio が 3 でも上限の 2 として扱われる', (t) => {
  const { canvas } = createScreen(t, 1280, 720, undefined, 3);
  assert.equal(canvas.width, 2560);
  assert.equal(canvas.height, 1440);
});

test('devicePixelRatio が使えない値なら倍率 1 として扱われる', async (t) => {
  for (const value of [0, NaN, -2]) {
    await t.test(`値 ${value}`, (st) => {
      const { canvas } = createScreen(st, 1280, 720, undefined, value);
      assert.equal(canvas.width, 1280);
      assert.equal(canvas.height, 720);
    });
  }
});

test('リサイズで devicePixelRatio が変わると画素数が追従する', (t) => {
  const { canvas, fakeWindow } = createScreen(t, 1280, 720, undefined, 1);
  assert.equal(canvas.width, 1280);
  fakeWindow.devicePixelRatio = 2;
  for (const listener of fakeWindow.listeners.resize) listener();
  assert.equal(canvas.width, 2560);
  assert.equal(canvas.height, 1440);
});

test('リサイズで画素数が変わらないときは width・height に代入しない', (t) => {
  const { canvas, fakeWindow } = createScreen(t, 1280, 720);
  assert.deepEqual(canvas.assigns, { width: 1, height: 1 });
  for (const listener of fakeWindow.listeners.resize) listener();
  assert.deepEqual(canvas.assigns, { width: 1, height: 1 });
});

test('toLogical: 表示矩形が論理解像度と同じなら座標がそのまま返る', (t) => {
  const { screen } = createScreen(t, 1280, 720);
  assert.deepEqual(screen.toLogical(10, 20), { x: 10, y: 20 });
  assert.deepEqual(screen.toLogical(0, 0), { x: 0, y: 0 });
});

test('toLogical: 表示サイズが論理解像度と違うとき、拡大率で換算される', (t) => {
  const { screen } = createScreen(t, 1280, 720, { left: 0, top: 0, width: 640, height: 360 });
  assert.deepEqual(screen.toLogical(320, 180), { x: 160, y: 90 });
});

test('toLogical: canvas の位置がずれていても左上が原点、右下が論理解像度になる', (t) => {
  const { screen } = createScreen(t, 1280, 720, { left: 100, top: 40, width: 320, height: 180 });
  assert.deepEqual(screen.toLogical(100, 40), { x: 0, y: 0 });
  assert.deepEqual(screen.toLogical(420, 220), { x: 320, y: 180 });
});

test('toLogical: 範囲外の座標は丸められない', (t) => {
  const { screen } = createScreen(t, 1280, 720, { left: 100, top: 40, width: 320, height: 180 });
  assert.deepEqual(screen.toLogical(90, 30), { x: -10, y: -10 });
  assert.deepEqual(screen.toLogical(500, 300), { x: 400, y: 260 });
});

test('toLogical: 呼ぶたびに矩形を取り直す', (t) => {
  const { screen, canvas } = createScreen(t, 1280, 720);
  assert.deepEqual(screen.toLogical(320, 180), { x: 320, y: 180 });
  canvas.rect = { left: 0, top: 0, width: 640, height: 360 };
  assert.deepEqual(screen.toLogical(320, 180), { x: 160, y: 90 });
});
