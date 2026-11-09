/**
 * @fileoverview 責務: oz/src/Storage.js の自動テスト（open・get・set の基本、引数とAPIのエラー、コピー、その場の保存）。
 * テストごとにクエリ付きの動的 import で Storage を読み込み直し、偽の localStorage を持つ偽の window を使う。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/** 動的 import に付ける連番（テストごとに別のモジュールにするため）。 */
let importCounter = 0;

/**
 * 偽の localStorage を作る。値は Map に文字列で持ち、setItem の呼び出し回数を setCount に記録する。
 * @returns {{store: Map<string, string>, setCount: number, getItem: (key: string) => (string | null), setItem: (key: string, value: *) => void}} 偽の localStorage
 */
function createFakeLocalStorage() {
  const store = new Map();
  return {
    store,
    setCount: 0,
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      this.setCount++;
      store.set(key, String(value));
    },
  };
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
 * 偽の localStorage を持つ偽の window を置き、未 open の新しい Storage を読み込む。
 * @param {import('node:test').TestContext} t テストのコンテキスト
 * @returns {Promise<{Storage: object, localStorage: ReturnType<typeof createFakeLocalStorage>}>} 読み込んだ Storage と偽の localStorage
 */
async function loadFreshStorage(t) {
  const localStorage = createFakeLocalStorage();
  installWindow(t, { localStorage });
  const module = await import(`../oz/src/Storage.js?case=${++importCounter}`);
  return { Storage: module.Storage, localStorage };
}

const KEY = 'test-save';

test('open の後、get は既定値を返し、set した値を get で取り出せる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: { volume: 5, name: 'a' } });
  assert.equal(Storage.get('volume'), 5);
  assert.equal(Storage.get('name'), 'a');
  Storage.set('volume', 8);
  assert.equal(Storage.get('volume'), 8);
  assert.equal(Storage.get('name'), 'a');
});

test('defaults が空のオブジェクトでも open できる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: {} });
  assert.throws(() => Storage.get('x'), /^Error: \[oz\] Storage\.get:/);
});

test('open は localStorage へ書き込まない', async (t) => {
  const { Storage, localStorage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: { a: 1 } });
  assert.equal(localStorage.setCount, 0);
  assert.equal(localStorage.store.size, 0);
});

test('open の時点でコピーを取るので、後から defaults の元を書き換えても get は変わらない', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  const defaults = { nested: { list: [1, 2], inner: { v: 1 } }, n: 1 };
  Storage.open({ key: KEY, version: 1, defaults });
  defaults.n = 99;
  defaults.nested.list.push(3);
  defaults.nested.inner.v = 99;
  assert.equal(Storage.get('n'), 1);
  assert.deepEqual(Storage.get('nested'), { list: [1, 2], inner: { v: 1 } });
});

test('open の引数がオブジェクトでないとき Storage.open のエラーになる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  for (const bad of [undefined, null, 'text', [], 1]) {
    assert.throws(() => Storage.open(bad), /^Error: \[oz\] Storage\.open:/);
  }
});

test('open の key が空文字列・文字列でないとき Storage.open のエラーになる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  for (const bad of ['', 1, null, undefined, {}]) {
    assert.throws(() => Storage.open({ key: bad, version: 1, defaults: {} }), /^Error: \[oz\] Storage\.open:/);
  }
});

test('open の version が有限の数値でないとき Storage.open のエラーになる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  for (const bad of [NaN, Infinity, -Infinity, '1', null]) {
    assert.throws(() => Storage.open({ key: KEY, version: bad, defaults: {} }), /^Error: \[oz\] Storage\.open:/);
  }
  assert.throws(() => Storage.open({ key: KEY, defaults: {} }), /^Error: \[oz\] Storage\.open:/);
});

test('open の defaults がオブジェクトでないとき Storage.open のエラーになる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  for (const bad of [null, [], 'text', 1]) {
    assert.throws(() => Storage.open({ key: KEY, version: 1, defaults: bad }), /^Error: \[oz\] Storage\.open:/);
  }
  assert.throws(() => Storage.open({ key: KEY, version: 1 }), /^Error: \[oz\] Storage\.open:/);
});

test('open の defaults の値が JSON にできないとき Storage.open のエラーになる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  for (const bad of [() => {}, NaN, Infinity, undefined, { inner: NaN }]) {
    assert.throws(() => Storage.open({ key: KEY, version: 1, defaults: { a: bad } }), /^Error: \[oz\] Storage\.open:/);
  }
});

test('open がエラーになった後は開いていない状態のままで、正しい引数で open し直せる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  assert.throws(() => Storage.open({ key: '', version: 1, defaults: {} }), /^Error: \[oz\] Storage\.open:/);
  assert.throws(() => Storage.get('a'), /^Error: \[oz\] Storage\.get: .*open の前/);
  Storage.open({ key: KEY, version: 1, defaults: { a: 1 } });
  assert.equal(Storage.get('a'), 1);
});

test('2回目の open は Storage.open のエラーになり、1回目の状態が残る', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: { a: 1 } });
  Storage.set('a', 2);
  assert.throws(() => Storage.open({ key: 'other', version: 2, defaults: { b: 1 } }), /^Error: \[oz\] Storage\.open:/);
  assert.equal(Storage.get('a'), 2);
  assert.throws(() => Storage.get('b'), /^Error: \[oz\] Storage\.get:/);
});

test('open の前の get・set はそれぞれのAPI名のエラーになる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  assert.throws(() => Storage.get('a'), /^Error: \[oz\] Storage\.get:/);
  assert.throws(() => Storage.set('a', 1), /^Error: \[oz\] Storage\.set:/);
});

test('defaults にない名前の get・set はエラーになる', async (t) => {
  const { Storage, localStorage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: { a: 1 } });
  for (const name of ['nope', 'constructor', '__proto__', 'toString']) {
    assert.throws(() => Storage.get(name), /^Error: \[oz\] Storage\.get:/);
    assert.throws(() => Storage.set(name, 1), /^Error: \[oz\] Storage\.set:/);
  }
  assert.equal(localStorage.setCount, 0);
});

test('set に JSON にできない値を渡すとエラーになり、値は変わらず setItem も呼ばれない', async (t) => {
  const { Storage, localStorage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: { a: 'init' } });
  const circular = {};
  circular.self = circular;
  const circularArray = [];
  circularArray.push(circularArray);
  class Custom {}
  const bads = [
    undefined,
    () => {},
    Symbol('s'),
    10n,
    NaN,
    Infinity,
    -Infinity,
    new Date(0),
    new Map(),
    new Custom(),
    circular,
    circularArray,
    { inner: { deep: [circular] } },
    { inner: [undefined] },
    [NaN],
  ];
  for (const bad of bads) {
    assert.throws(() => Storage.set('a', bad), /^Error: \[oz\] Storage\.set:/);
  }
  assert.equal(Storage.get('a'), 'init');
  assert.equal(localStorage.setCount, 0);
});

test('set は null・真偽値・文字列・有限の数値・配列・入れ子のプレーンなオブジェクトを受け取れる', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: { a: 0 } });
  const goods = [null, true, false, 'text', '', 0, -1.5, [1, 'a', null], { x: { y: [1, { z: 2 }] } }];
  for (const good of goods) {
    Storage.set('a', good);
    assert.deepEqual(Storage.get('a'), good);
  }
});

test('get の結果を書き換えても、次の get の値は変わらない', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: { obj: { v: 1, list: [1] }, list: [1, 2] } });
  const obj = Storage.get('obj');
  obj.v = 99;
  obj.list.push(2);
  const list = Storage.get('list');
  list.push(3);
  assert.deepEqual(Storage.get('obj'), { v: 1, list: [1] });
  assert.deepEqual(Storage.get('list'), [1, 2]);
});

test('set に渡したオブジェクトを後から書き換えても、get の値は変わらない', async (t) => {
  const { Storage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: { obj: {} } });
  const value = { v: 1, list: [1] };
  Storage.set('obj', value);
  value.v = 99;
  value.list.push(2);
  assert.deepEqual(Storage.get('obj'), { v: 1, list: [1] });
});

test('set のたびに setItem が呼ばれ、{ version, data } の JSON が key に保存される', async (t) => {
  const { Storage, localStorage } = await loadFreshStorage(t);
  Storage.open({ key: KEY, version: 3, defaults: { a: 1, b: { c: [1] } } });
  Storage.set('a', 2);
  assert.equal(localStorage.setCount, 1);
  assert.deepEqual(JSON.parse(localStorage.store.get(KEY)), { version: 3, data: { a: 2, b: { c: [1] } } });
  Storage.set('b', 'x');
  assert.equal(localStorage.setCount, 2);
  assert.deepEqual(JSON.parse(localStorage.store.get(KEY)), { version: 3, data: { a: 2, b: 'x' } });
});
