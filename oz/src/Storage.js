/**
 * @fileoverview 責務: 単一JSONの保存と読み込み、版番号が違うときの既定値への初期化、localStorage が使えないときのメモリ上での継続。
 * セーブ内容の定義と移行処理はしない。
 */

/**
 * `Storage.open` の引数。
 * @typedef {Object} StorageOptions
 * @property {string} key localStorage のキー（空でない文字列）
 * @property {number} version 版番号（有限の数値）。保存データと違えば既定値で始める
 * @property {Object} defaults 名前から既定値への対応（値は JSON にできるもの）。空のオブジェクトも可
 */

/** 保存先のキー。`null` なら `open` の前。 @type {string | null} */
let storageKey = null;

/** 版番号。 @type {number} */
let version = 0;

/** 現在の値。`defaults` の名前だけを持つ。 @type {Map<string, *>} */
const values = new Map();

/**
 * 値が JSON にできるものか再帰で確認する。できなければ Error を投げる。
 * @param {*} value 確認する値
 * @param {string} apiName エラー文面に入れるAPI名（例: `Storage.set`）
 * @param {string} label エラー文面に入れる項目名
 * @param {Set<Object>} [ancestors] 循環参照の検出に使う、確認中の親の集合
 * @returns {void}
 * @throws {Error} JSON にできない値のとき
 */
function assertJson(value, apiName, label, ancestors = new Set()) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`[oz] ${apiName}: ${label} は有限の数値にしてください（${value}）。`);
    return;
  }
  if (typeof value !== 'object') {
    throw new Error(`[oz] ${apiName}: ${label} に JSON にできない値（${typeof value}）が含まれています。`);
  }
  if (ancestors.has(value)) throw new Error(`[oz] ${apiName}: ${label} に循環参照が含まれています。`);
  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) assertJson(value[i], apiName, `${label}[${i}]`, ancestors);
  } else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error(`[oz] ${apiName}: ${label} にプレーンなオブジェクトでない値が含まれています。`);
    }
    for (const name of Object.keys(value)) assertJson(value[name], apiName, `${label}.${name}`, ancestors);
  }
  ancestors.delete(value);
}

/**
 * 値のコピーを作る。JSON にできる値だけを渡すこと。
 * @param {*} value JSON にできる値
 * @returns {*} 独立したコピー
 */
function copyJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 値が配列でも null でもないオブジェクトか（プロトタイプは確認しない）。
 * @param {*} value 確認する値
 * @returns {boolean}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 保存データを読み、`values` の初期値を決める。`localStorage` へは書き込まない。
 * @param {string} key localStorage のキー
 * @param {number} ver 版番号
 * @param {Map<string, *>} defaultMap 既定値（コピー済み）
 * @returns {Map<string, *>} 初期値
 */
function load(key, ver, defaultMap) {
  let text;
  try {
    text = window.localStorage.getItem(key);
  } catch (error) {
    console.warn('[oz] Storage.open: localStorage が使えないため、既定値で始めます。', error);
    return defaultMap;
  }
  if (text === null || text === undefined) return defaultMap;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return defaultMap;
  }
  if (!isObject(parsed) || !isObject(parsed.data) || parsed.version !== ver) return defaultMap;
  const result = new Map();
  for (const [name, fallback] of defaultMap) {
    result.set(name, Object.hasOwn(parsed.data, name) ? parsed.data[name] : fallback);
  }
  return result;
}

/**
 * 現在の値全体を保存する。失敗しても例外を投げず、警告を出してメモリの上で続ける。
 * @returns {void}
 */
function save() {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ version, data: Object.fromEntries(values) }));
  } catch (error) {
    console.warn('[oz] Storage.set: 保存できませんでした。メモリの上で続けます。', error);
  }
}

/**
 * 設定の保存。インスタンスを作らずに使う。`Engine.start` の前から使える。
 */
export const Storage = {
  /**
   * セーブを開く。保存データを読み、`defaults` の名前だけを持つ状態にする。2回目はエラー。
   * @param {StorageOptions} options 設定
   * @returns {void}
   * @throws {Error} 2回目、または引数が不正なとき（開いていない状態のまま残る）
   */
  open(options) {
    if (storageKey !== null) throw new Error('[oz] Storage.open: すでに開いています。');
    if (!isObject(options)) throw new Error('[oz] Storage.open: 引数はオブジェクトにしてください。');
    const { key, version: ver, defaults } = options;
    if (typeof key !== 'string' || key === '') throw new Error('[oz] Storage.open: key は空でない文字列にしてください。');
    if (typeof ver !== 'number' || !Number.isFinite(ver)) {
      throw new Error('[oz] Storage.open: version は有限の数値にしてください。');
    }
    if (!isObject(defaults)) throw new Error('[oz] Storage.open: defaults はオブジェクトにしてください。');
    const defaultMap = new Map();
    for (const name of Object.keys(defaults)) {
      assertJson(defaults[name], 'Storage.open', `defaults.${name}`);
      defaultMap.set(name, copyJson(defaults[name]));
    }
    const initial = load(key, ver, defaultMap);
    values.clear();
    for (const [name, value] of initial) values.set(name, value);
    version = ver;
    storageKey = key;
  },

  /**
   * 値を取り出す。
   * @param {string} name `defaults` にある名前
   * @returns {*} 値のコピー（書き換えても影響しない）
   * @throws {Error} `open` の前、または `defaults` にない名前のとき
   */
  get(name) {
    if (storageKey === null) throw new Error('[oz] Storage.get: Storage.open の前には使えません。');
    if (!values.has(name)) throw new Error(`[oz] Storage.get: 未知の名前です（${String(name)}）。`);
    return copyJson(values.get(name));
  },

  /**
   * 値を設定し、その場で保存する。保存に失敗したら警告を出してメモリの上で続ける。
   * @param {string} name `defaults` にある名前
   * @param {*} value JSON にできる値
   * @returns {void}
   * @throws {Error} `open` の前、`defaults` にない名前、JSON にできない値のとき（状態は変わらない）
   */
  set(name, value) {
    if (storageKey === null) throw new Error('[oz] Storage.set: Storage.open の前には使えません。');
    if (!values.has(name)) throw new Error(`[oz] Storage.set: 未知の名前です（${String(name)}）。`);
    assertJson(value, 'Storage.set', 'value');
    values.set(name, copyJson(value));
    save();
  },
};
