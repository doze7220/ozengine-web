/**
 * @fileoverview 責務: oz/src/Storage.js の自動テスト（保存データの読み込み、localStorage が使えないとき、保存に失敗したとき）。
 * テストごとにクエリ付きの動的 import で Storage を読み込み直し、偽の localStorage を持つ偽の window を使う。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/** 動的 import に付ける連番（テストごとに別のモジュールにするため）。 */
let importCounter = 0;

/**
 * 偽の localStorage を作る。値は Map に文字列で持ち、setItem の呼び出し回数を setCount に記録する。
 * @param {Object<string, string>} [initial] open の前に入れておく保存データ（キーから文字列への対応）
 * @param {boolean} [failOnSet] true なら setItem が例外を投げる（呼び出し回数は数える）
 * @returns {{store: Map<string, string>, setCount: number, getItem: (key: string) => (string | null), setItem: (key: string, value: *) => void}} 偽の localStorage
 */
function createFakeLocalStorage(initial = {}, failOnSet = false) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    setCount: 0,
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      this.setCount++;
      if (failOnSet) throw new Error('quota exceeded');
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
 * 未 open の新しい Storage を読み込む（クエリ付きの動的 import）。偽の window は呼び出し側が先に置く。
 * @returns {Promise<object>} 読み込んだ Storage
 */
async function importFreshStorage() {
  const module = await import(`../oz/src/Storage.js?load=${++importCounter}`);
  return module.Storage;
}

/**
 * 偽の localStorage を持つ偽の window を置き、未 open の新しい Storage を読み込む。
 * @param {import('node:test').TestContext} t テストのコンテキスト
 * @param {Object<string, string>} [initial] open の前に入れておく保存データ
 * @param {boolean} [failOnSet] true なら setItem が例外を投げる
 * @returns {Promise<{Storage: object, localStorage: ReturnType<typeof createFakeLocalStorage>}>} 読み込んだ Storage と偽の localStorage
 */
async function loadFreshStorage(t, initial = {}, failOnSet = false) {
  const localStorage = createFakeLocalStorage(initial, failOnSet);
  installWindow(t, { localStorage });
  return { Storage: await importFreshStorage(), localStorage };
}

/**
 * localStorage の getter が例外を投げる偽の window を置き、未 open の新しい Storage を読み込む。
 * @param {import('node:test').TestContext} t テストのコンテキスト
 * @returns {Promise<object>} 読み込んだ Storage
 */
async function loadFreshStorageWithoutLocalStorage(t) {
  const fakeWindow = {};
  Object.defineProperty(fakeWindow, 'localStorage', {
    get() {
      throw new Error('SecurityError');
    },
  });
  installWindow(t, fakeWindow);
  return importFreshStorage();
}

/** テストで使う保存キー。 @type {string} */
const KEY = 'test-save';

/** テストで使う既定値。 @type {{volume: number, name: string, nested: {v: number}}} */
const DEFAULTS = { volume: 5, name: 'a', nested: { v: 1 } };

test('版番号が同じなら、保存データの値が get で返り、保存データにない名前は既定値になる', async (t) => {
  const { Storage } = await loadFreshStorage(t, {
    [KEY]: JSON.stringify({ version: 1, data: { volume: 9, nested: { v: 7 } } }),
  });
  Storage.open({ key: KEY, version: 1, defaults: DEFAULTS });
  assert.equal(Storage.get('volume'), 9);
  assert.deepEqual(Storage.get('nested'), { v: 7 });
  assert.equal(Storage.get('name'), 'a');
});

test('保存データにあって defaults にない名前は捨てられ、get はエラー、次の保存にも入らない', async (t) => {
  const { Storage, localStorage } = await loadFreshStorage(t, {
    [KEY]: JSON.stringify({ version: 1, data: { volume: 9, old: 1 } }),
  });
  Storage.open({ key: KEY, version: 1, defaults: { volume: 5 } });
  assert.throws(() => Storage.get('old'), /^Error: \[oz\] Storage\.get:/);
  Storage.set('volume', 3);
  const saved = JSON.parse(localStorage.store.get(KEY));
  assert.deepEqual(saved, { version: 1, data: { volume: 3 } });
});

test('保存データが既定値で始まる条件（版番号が違う・JSON として読めない・形が違う）でもエラーにならず、全部の名前が既定値になる', async (t) => {
  const cases = [
    JSON.stringify({ version: 2, data: { volume: 9 } }),
    '{broken',
    '',
    'null',
    '[1]',
    '"text"',
    '1',
    JSON.stringify({ version: 1 }),
    JSON.stringify({ version: 1, data: [1] }),
    JSON.stringify({ version: 1, data: null }),
    JSON.stringify({ data: { volume: 9 } }),
  ];
  for (const text of cases) {
    await t.test(JSON.stringify(text), async (t) => {
      const { Storage } = await loadFreshStorage(t, { [KEY]: text });
      Storage.open({ key: KEY, version: 1, defaults: DEFAULTS });
      assert.equal(Storage.get('volume'), 5);
      assert.equal(Storage.get('name'), 'a');
      assert.deepEqual(Storage.get('nested'), { v: 1 });
    });
  }
});

test('版番号が違うとき、移行せず、open の後も古い保存データが残り、最初の set で新しい版番号と形に置き換わる', async (t) => {
  const old = JSON.stringify({ version: 1, data: { volume: 9, old: 1 } });
  const { Storage, localStorage } = await loadFreshStorage(t, { [KEY]: old });
  Storage.open({ key: KEY, version: 2, defaults: { volume: 5, name: 'a' } });
  assert.equal(localStorage.setCount, 0);
  assert.equal(localStorage.store.get(KEY), old);
  assert.equal(Storage.get('volume'), 5);
  Storage.set('name', 'b');
  assert.equal(localStorage.setCount, 1);
  assert.deepEqual(JSON.parse(localStorage.store.get(KEY)), { version: 2, data: { volume: 5, name: 'b' } });
});

test('localStorage が使えないとき、open は例外を投げず警告を1回出し、既定値で始まる', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const Storage = await loadFreshStorageWithoutLocalStorage(t);
  assert.doesNotThrow(() => Storage.open({ key: KEY, version: 1, defaults: DEFAULTS }));
  assert.equal(warn.mock.callCount(), 1);
  assert.ok(String(warn.mock.calls[0].arguments[0]).startsWith('[oz] Storage.open:'));
  assert.equal(Storage.get('volume'), 5);
  assert.equal(Storage.get('name'), 'a');
  assert.deepEqual(Storage.get('nested'), { v: 1 });
});

test('localStorage が使えないとき、get・set はメモリの上で動き、set のたびに警告が出る', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const Storage = await loadFreshStorageWithoutLocalStorage(t);
  Storage.open({ key: KEY, version: 1, defaults: DEFAULTS });
  assert.equal(warn.mock.callCount(), 1);
  assert.doesNotThrow(() => Storage.set('volume', 8));
  assert.equal(Storage.get('volume'), 8);
  assert.equal(warn.mock.callCount(), 2);
  assert.ok(String(warn.mock.calls[1].arguments[0]).startsWith('[oz] Storage.set:'));
  assert.doesNotThrow(() => Storage.set('volume', 9));
  assert.equal(Storage.get('volume'), 9);
  assert.equal(warn.mock.callCount(), 3);
  assert.ok(String(warn.mock.calls[2].arguments[0]).startsWith('[oz] Storage.set:'));
});

test('保存に失敗しても set は例外を投げず、警告を出し、値はメモリの上で更新される', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const { Storage, localStorage } = await loadFreshStorage(t, {}, true);
  Storage.open({ key: KEY, version: 1, defaults: DEFAULTS });
  assert.equal(warn.mock.callCount(), 0);
  assert.doesNotThrow(() => Storage.set('volume', 8));
  assert.equal(Storage.get('volume'), 8);
  assert.equal(warn.mock.callCount(), 1);
  assert.ok(String(warn.mock.calls[0].arguments[0]).startsWith('[oz] Storage.set:'));
  assert.equal(localStorage.setCount, 1);
});

test('保存に失敗した set のたびに警告が出て、次の set で再び setItem が呼ばれる', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const { Storage, localStorage } = await loadFreshStorage(t, {}, true);
  Storage.open({ key: KEY, version: 1, defaults: DEFAULTS });
  Storage.set('volume', 1);
  Storage.set('volume', 2);
  Storage.set('name', 'z');
  assert.equal(localStorage.setCount, 3);
  assert.equal(warn.mock.callCount(), 3);
  for (const call of warn.mock.calls) {
    assert.ok(String(call.arguments[0]).startsWith('[oz] Storage.set:'));
  }
  assert.equal(Storage.get('volume'), 2);
  assert.equal(Storage.get('name'), 'z');
});
