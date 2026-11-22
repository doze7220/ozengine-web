/**
 * 責務: 窓と部品の設定の検証の共通処理（項目名を含むエラー、知らない項目の検出）、
 * 固定の値または描くたびに呼ぶ関数で渡された文字の読み出し、描く関数の種類の名前の一覧（LOOK_KINDS）。
 * 部品ごとの処理と Canvas の操作は行わず、何も import しない。
 */

/**
 * 描く関数の種類の名前の一覧（描く順。唯一の定義）。
 * @type {ReadonlyArray<string>}
 */
export const LOOK_KINDS = Object.freeze([
  'backdrop',
  'window',
  'titleBar',
  'closeButton',
  'button',
  'value',
  'checkbox',
  'slider',
  'choices',
  'tabs',
  'scroll',
  'scrollBar',
]);

/**
 * 値が、null でも配列でもないオブジェクトか。
 * @param {*} v 調べる値
 * @returns {boolean} オブジェクトなら true
 */
export function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * オブジェクトに、許可された以外の項目があればエラーにする（最初に見つかったものを報告する）。
 * @param {Object} obj 調べるオブジェクト
 * @param {ReadonlyArray<string>} allowed 許可する項目名
 * @param {string} where エラー文での呼び名（例: 'options'）
 * @param {string} prefix エラー文の先頭（例: '[oz] Ui.createWindow:'）
 * @returns {void}
 * @throws {Error} 知らない項目があるとき
 */
export function checkNoExtra(obj, allowed, where, prefix) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw new Error(`${prefix} ${where} に使えない項目 ${key} があります`);
    }
  }
}

/**
 * 有限の数値であることを確かめる。
 * @param {*} v 調べる値
 * @param {string} name エラー文での項目名
 * @param {string} prefix エラー文の先頭
 * @returns {void}
 * @throws {Error} 有限の数値でないとき
 */
export function checkFinite(v, name, prefix) {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`${prefix} ${name} は有限の数値で指定してください`);
  }
}

/**
 * 正の有限数であることを確かめる。
 * @param {*} v 調べる値
 * @param {string} name エラー文での項目名
 * @param {string} prefix エラー文の先頭
 * @returns {void}
 * @throws {Error} 正の有限数でないとき
 */
export function checkPositive(v, name, prefix) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
    throw new Error(`${prefix} ${name} は正の有限数で指定してください`);
  }
}

/**
 * 関数であることを確かめる。
 * @param {*} v 調べる値
 * @param {string} name エラー文での項目名
 * @param {string} prefix エラー文の先頭
 * @returns {void}
 * @throws {Error} 関数でないとき
 */
export function checkFunction(v, name, prefix) {
  if (typeof v !== 'function') {
    throw new Error(`${prefix} ${name} は関数で指定してください`);
  }
}

/**
 * 文字列であることを確かめる。
 * @param {*} v 調べる値
 * @param {string} name エラー文での項目名
 * @param {string} prefix エラー文の先頭
 * @returns {void}
 * @throws {Error} 文字列でないとき
 */
export function checkString(v, name, prefix) {
  if (typeof v !== 'string') {
    throw new Error(`${prefix} ${name} は文字列で指定してください`);
  }
}

/**
 * 文字列か、文字列を返す関数であることを確かめる。
 * @param {*} v 調べる値
 * @param {string} name エラー文での項目名
 * @param {string} prefix エラー文の先頭
 * @returns {void}
 * @throws {Error} 文字列でも関数でもないとき
 */
export function checkText(v, name, prefix) {
  if (typeof v !== 'string' && typeof v !== 'function') {
    throw new Error(`${prefix} ${name} は文字列か、文字列を返す関数で指定してください`);
  }
}

/**
 * true か false であることを確かめる。
 * @param {*} v 調べる値
 * @param {string} name エラー文での項目名
 * @param {string} prefix エラー文の先頭
 * @returns {void}
 * @throws {Error} 真偽値でないとき
 */
export function checkBoolean(v, name, prefix) {
  if (typeof v !== 'boolean') {
    throw new Error(`${prefix} ${name} は true か false で指定してください`);
  }
}

/**
 * 固定の文字、または描くたびに呼ぶ関数で渡された文字を読み出す。
 * @param {string | (() => *)} text 文字列、または文字列を返す関数
 * @returns {string} 読み出した文字（関数なら呼んだ結果を String で文字にしたもの）
 */
export function readText(text) {
  return typeof text === 'function' ? String(text()) : text;
}
