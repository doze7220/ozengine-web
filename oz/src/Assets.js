/**
 * @fileoverview 責務: 一覧に基づく画像と音声のロード、名前での画像の取得、読み込みに失敗したときの代替（透明な画像、警告）。
 * 音声のデコードと保持は Sound に任せ、音の再生はしない。
 */
import { decodeSound, storeSound } from './Sound.js';

/**
 * ロードする一覧。どちらも省略できる。
 * @typedef {Object} AssetList
 * @property {Object<string, string>} [images] 名前からパスへの対応（画像）
 * @property {Object<string, string>} [sounds] 名前からパスへの対応（音声）
 */

/**
 * 名前ごとに、最後に開始したロードの印を持つ。
 * @typedef {Map<string, Object>} LoadTokens
 */

/** 完了した画像と、失敗の代わりの透明な画像。 @type {Map<string, HTMLImageElement | HTMLCanvasElement>} */
const images = new Map();

/** 画像の名前ごとの、最後に開始したロードの印。 @type {LoadTokens} */
const latestImageLoad = new Map();

/** 音声の名前ごとの、最後に開始したロードの印。 @type {LoadTokens} */
const latestSoundLoad = new Map();

/** 失敗の代わりに共有する透明な1x1の canvas。最初の失敗のときに作る。 @type {HTMLCanvasElement | null} */
let blankImage = null;

/**
 * 値が配列でも null でもないオブジェクトか調べる。
 * @param {*} value 調べる値
 * @returns {boolean} 該当すれば true
 */
function isPlainContainer(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 名前とパスの対応を検証する。不正なら Error を投げる。
 * @param {*} map 検証する対応
 * @param {string} field 項目名（`images` または `sounds`）
 * @returns {void}
 * @throws {Error} 対応がオブジェクトでない、名前が空、パスが空でない文字列でない場合
 */
function validateMap(map, field) {
  if (map === undefined) return;
  if (!isPlainContainer(map)) {
    throw new Error(`[oz] Assets.load: ${field} はオブジェクトで指定してください`);
  }
  for (const [name, path] of Object.entries(map)) {
    if (name === '') {
      throw new Error(`[oz] Assets.load: ${field} の名前は空文字列にできません`);
    }
    if (typeof path !== 'string' || path === '') {
      throw new Error(`[oz] Assets.load: ${field}["${name}"] のパスは空でない文字列で指定してください`);
    }
  }
}

/**
 * ロード一覧全体を検証する。不正なら Error を投げる。
 * @param {*} list 検証する一覧
 * @returns {void}
 * @throws {Error} 一覧が不正な場合
 */
function validateList(list) {
  if (!isPlainContainer(list)) {
    throw new Error('[oz] Assets.load: 引数はオブジェクトで指定してください');
  }
  for (const key of Object.keys(list)) {
    if (key !== 'images' && key !== 'sounds') {
      throw new Error(`[oz] Assets.load: 未知の項目 "${key}" があります（images と sounds だけ指定できます）`);
    }
  }
  validateMap(list.images, 'images');
  validateMap(list.sounds, 'sounds');
}

/**
 * 失敗したファイルの警告を出す。
 * @param {string} name 名前
 * @param {string} path パス
 * @param {*} [reason] 理由（分かれば）
 * @returns {void}
 */
function warnFailure(name, path, reason) {
  const detail = reason === undefined || reason === '' ? '' : ` (${reason instanceof Error ? reason.message : String(reason)})`;
  console.warn(`[oz] Assets.load: "${name}" (${path}) を読み込めませんでした${detail}`);
}

/**
 * 透明な1x1の canvas を返す。なければ1回だけ作る（ページには追加しない）。
 * @returns {HTMLCanvasElement} 共有の透明な画像
 */
function getBlankImage() {
  if (blankImage === null) {
    blankImage = document.createElement('canvas');
    blankImage.width = 1;
    blankImage.height = 1;
  }
  return blankImage;
}

/**
 * 画像を1つロードする。失敗しない Promise を返す。
 * @param {string} name 名前
 * @param {string} path パス
 * @param {Object} token このロードの印
 * @returns {Promise<void>} 成功でも失敗でも解決する Promise
 */
function loadImage(name, path, token) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (latestImageLoad.get(name) === token) images.set(name, image);
      resolve();
    };
    image.onerror = () => {
      warnFailure(name, path);
      if (latestImageLoad.get(name) === token) images.set(name, getBlankImage());
      resolve();
    };
    image.src = path;
  });
}

/**
 * 音声を1つロードしてデコードし、Sound に預ける。失敗しない Promise を返す。
 * @param {string} name 名前
 * @param {string} path パス
 * @param {Object} token このロードの印
 * @returns {Promise<void>} 成功でも失敗でも解決する Promise
 */
async function loadSound(name, path, token) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await decodeSound(arrayBuffer);
    if (latestSoundLoad.get(name) === token) storeSound(name, buffer);
  } catch (error) {
    warnFailure(name, path, error);
    if (latestSoundLoad.get(name) === token) storeSound(name, null);
  }
}

/**
 * アセット（画像と音声）のロードと、画像の取得を担う。
 */
export const Assets = {
  /**
   * 一覧の画像と音声をロードする。失敗したファイルは警告を出して続行する。
   * @param {AssetList} list ロードする一覧
   * @returns {Promise<undefined>} すべての処理が終わると解決する Promise
   * @throws {Error} 一覧が不正な場合（Promise の reject として）
   */
  async load(list) {
    validateList(list);
    const tasks = [];
    for (const [name, path] of Object.entries(list.images ?? {})) {
      const token = {};
      latestImageLoad.set(name, token);
      tasks.push(loadImage(name, path, token));
    }
    for (const [name, path] of Object.entries(list.sounds ?? {})) {
      const token = {};
      latestSoundLoad.set(name, token);
      tasks.push(loadSound(name, path, token));
    }
    await Promise.all(tasks);
  },

  /**
   * ロード済みの画像を返す。
   * @param {string} name `Assets.load` の `images` に書いた名前
   * @returns {HTMLImageElement | HTMLCanvasElement} `ctx.drawImage` に渡せる画像
   * @throws {Error} ロードされていない名前の場合
   */
  image(name) {
    const image = images.get(name);
    if (image === undefined) {
      throw new Error(`[oz] Assets.image: "${name}" はロードされていません（一覧にない名前か、ロードが終わっていません）`);
    }
    return image;
  },
};
