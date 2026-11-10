/**
 * @fileoverview 責務: 音声バッファの保持、SE と BGM の再生、音量の管理、
 * AudioContext の再開（最初の入力と、ブラウザが止めたあとの入力での再開）。
 * Assets 専用の decodeSound / storeSound も本ファイルで公開する（oz/index.js からは公開しない）。
 */

/**
 * 流れている BGM の情報。時刻は context.currentTime の秒。
 * 後ろの4つは最後に予定したフェードの内容。
 * @typedef {Object} BgmVoice
 * @property {string} name 曲の名前
 * @property {AudioBufferSourceNode} source 再生中のソース
 * @property {GainNode} gainNode その曲専用のフェード用 gain
 * @property {number} fromLevel フェードの開始レベル
 * @property {number} toLevel フェードの終了レベル
 * @property {number} startTime フェードの開始時刻
 * @property {number} endTime フェードの終了時刻
 */

/** @type {AudioContext | null} 最初のデコードで作る */
let context = null;
/** @type {GainNode | null} */
let masterGain = null;
/** @type {GainNode | null} */
let bgmGain = null;
/** @type {GainNode | null} */
let seGain = null;
/** 最初の入力を受け取ったか */
let inputSeen = false;
/** AudioContext が一度でも running になったか（いったん true になったら戻さない） */
let wasRunning = false;
/** @type {Map<string, AudioBuffer | null>} null はロードの失敗 */
const buffers = new Map();
/** 音量の値（gain.value は32bit 浮動小数なので、読み取りにはこちらを使う） */
const volumes = { master: 1, bgm: 1, se: 1 };
/** @type {BgmVoice | null} */
let currentBgm = null;

/** 再開用に登録するイベントの種類 */
const GESTURE_TYPES = ['pointerdown', 'pointerup', 'keydown'];

/**
 * 最初の入力の記録と AudioContext の再開を行うイベントハンドラ。
 * @param {Event} e 入力イベント
 * @returns {void}
 */
function onGesture(e) {
  if (e.type === 'keydown' && /** @type {KeyboardEvent} */ (e).code === 'Escape') return;
  inputSeen = true;
  if (context) resumeContext();
}

/**
 * AudioContext の resume を呼び、完了後に解除の条件を確認する。
 * @returns {void}
 */
function resumeContext() {
  context.resume().then(removeGestureListenersIfDone, () => {});
}

/**
 * 入力を受け取り、かつ running なら再開用のイベントを解除する。
 * running になったことは wasRunning にも記録する。
 * @returns {void}
 */
function removeGestureListenersIfDone() {
  if (context.state === 'running') wasRunning = true;
  if (inputSeen && context.state === 'running') removeGestureListeners();
}

/**
 * 再開用のイベントを window に capture で登録する。登録済みなら二重にはならない。
 * @returns {void}
 */
function addGestureListeners() {
  for (const type of GESTURE_TYPES) {
    window.addEventListener(type, onGesture, { capture: true });
  }
}

/**
 * 再開用のイベントを window から解除する。
 * @returns {void}
 */
function removeGestureListeners() {
  for (const type of GESTURE_TYPES) {
    window.removeEventListener(type, onGesture, { capture: true });
  }
}

/**
 * AudioContext の statechange のハンドラ。running なら解除の条件を確認し、
 * running でも closed でもなければ（suspended・interrupted など）再開用のイベントを登録し直す。
 * 入力のイベントの外では resume() を呼ばない。
 * @returns {void}
 */
function onStateChange() {
  if (context.state === 'running') {
    removeGestureListenersIfDone();
  } else if (context.state !== 'closed') {
    addGestureListeners();
  }
}

addGestureListeners();

/**
 * AudioContext と音量用の GainNode を作る。作れなければ例外を投げる。
 * @returns {void}
 */
function createContext() {
  if (typeof window.AudioContext !== 'function') {
    throw new Error('AudioContext が使えません');
  }
  const ctx = new window.AudioContext();
  const master = ctx.createGain();
  const bgm = ctx.createGain();
  const se = ctx.createGain();
  master.gain.value = volumes.master;
  bgm.gain.value = volumes.bgm;
  se.gain.value = volumes.se;
  bgm.connect(master);
  se.connect(master);
  master.connect(ctx.destination);
  context = ctx;
  ctx.addEventListener('statechange', onStateChange);
  if (ctx.state === 'running') wasRunning = true;
  masterGain = master;
  bgmGain = bgm;
  seGain = se;
  if (inputSeen) resumeContext();
}

/**
 * 音声ファイルのデータをデコードする（Assets 専用）。
 * @param {ArrayBuffer} arrayBuffer 音声ファイルの中身
 * @returns {Promise<AudioBuffer>} デコード結果。AudioContext が使えなければ reject する
 */
export function decodeSound(arrayBuffer) {
  try {
    if (!context) createContext();
    return Promise.resolve(context.decodeAudioData(arrayBuffer));
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * デコード結果（またはロード失敗を表す null）を名前で保存する（Assets 専用）。
 * @param {string} name 音の名前
 * @param {AudioBuffer | null} buffer デコード結果。失敗なら null
 * @returns {void}
 */
export function storeSound(name, buffer) {
  buffers.set(name, buffer);
}

/**
 * 名前がロード済み（失敗を含む）か確認し、バッファを返す。
 * @param {string} name 音の名前
 * @param {string} apiName エラー文面に使うAPI名
 * @returns {AudioBuffer | null} バッファ。ロード失敗なら null
 */
function requireSound(name, apiName) {
  if (!buffers.has(name)) {
    throw new Error(
      `[oz] ${apiName}: "${name}" はロードされていません（一覧にない名前か、ロードが終わっていません）`,
    );
  }
  return buffers.get(name);
}

/**
 * options から fadeMs を検証して秒に変換する。
 * @param {{ fadeMs?: number } | undefined} options 指定オプション
 * @param {string} apiName エラー文面に使うAPI名
 * @returns {number} フェードの秒数
 */
function readFadeSeconds(options, apiName) {
  const fadeMs = options?.fadeMs;
  if (fadeMs === undefined) return 0;
  if (typeof fadeMs !== 'number' || !Number.isFinite(fadeMs) || fadeMs < 0) {
    throw new RangeError(`[oz] ${apiName}: fadeMs は0以上の有限数で指定してください: ${String(fadeMs)}`);
  }
  return fadeMs / 1000;
}

/**
 * 記録から曲の現在のレベル（0〜1）を直線の式で計算する。
 * @param {BgmVoice} voice 曲の情報
 * @param {number} now context.currentTime
 * @returns {number} 現在のレベル
 */
function currentLevel(voice, now) {
  if (voice.endTime <= voice.startTime) return voice.toLevel;
  const t = Math.min(1, Math.max(0, (now - voice.startTime) / (voice.endTime - voice.startTime)));
  return voice.fromLevel + (voice.toLevel - voice.fromLevel) * t;
}

/**
 * 曲をフェードアウトして停止を予定する。
 * @param {BgmVoice} voice 曲の情報
 * @param {number} seconds フェードの秒数
 * @returns {void}
 */
function fadeOutAndStop(voice, seconds) {
  const now = context.currentTime;
  const level = currentLevel(voice, now);
  const gain = voice.gainNode.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(level, now);
  if (seconds > 0) gain.linearRampToValueAtTime(0, now + seconds);
  voice.source.stop(now + seconds);
}

/**
 * 新しい曲を始める。
 * @param {string} name 曲の名前
 * @param {AudioBuffer} buffer 曲のバッファ
 * @param {number} seconds フェードインの秒数
 * @returns {BgmVoice} 始めた曲の情報
 */
function startBgm(name, buffer, seconds) {
  const now = context.currentTime;
  const source = context.createBufferSource();
  const gainNode = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gainNode);
  gainNode.connect(bgmGain);
  source.onended = () => {
    source.disconnect();
    gainNode.disconnect();
  };
  const voice = { name, source, gainNode, fromLevel: 1, toLevel: 1, startTime: now, endTime: now };
  if (seconds > 0) {
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + seconds);
    voice.fromLevel = 0;
    voice.endTime = now + seconds;
  }
  source.start();
  return voice;
}

/**
 * 音量の値を検証する。
 * @param {*} value 設定する値
 * @param {string} apiName エラー文面に使うプロパティ名
 * @returns {void}
 */
function assertVolume(value, apiName) {
  if (typeof value !== 'number' || !(value >= 0 && value <= 1)) {
    throw new RangeError(`[oz] ${apiName}: 0以上1以下の数値で指定してください: ${String(value)}`);
  }
}

/**
 * 音の再生と音量を担う公開オブジェクト。インスタンスは作らずに使う。
 */
export const Sound = {
  /**
   * SE を1回鳴らす。同じ SE を重ねて鳴らせる。最初の入力より前と、
   * ブラウザが音を止めている間は何もしない。
   * @param {string} name Assets.load の sounds に書いた名前
   * @returns {void}
   */
  playSe(name) {
    const buffer = requireSound(name, 'Sound.playSe');
    if (buffer === null) return;
    if (!inputSeen) return;
    if (wasRunning && context.state !== 'running') return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(seGain);
    source.onended = () => source.disconnect();
    source.start();
  },

  /**
   * BGM をループ再生する。同じ曲が流れていれば何もしない。別の曲が流れていればクロスフェードする。
   * @param {string} name Assets.load の sounds に書いた名前
   * @param {{ fadeMs?: number }} [options] fadeMs: フェードインの長さ（ミリ秒、既定値 0）
   * @returns {void}
   */
  playBgm(name, options) {
    const seconds = readFadeSeconds(options, 'Sound.playBgm');
    const buffer = requireSound(name, 'Sound.playBgm');
    if (buffer === null) return;
    if (!inputSeen) return;
    if (currentBgm && currentBgm.name === name) return;
    if (currentBgm) fadeOutAndStop(currentBgm, seconds);
    currentBgm = startBgm(name, buffer, seconds);
  },

  /**
   * BGM を止める。BGM が流れていなければ何もしない。
   * @param {{ fadeMs?: number }} [options] fadeMs: フェードアウトの長さ（ミリ秒、既定値 0）
   * @returns {void}
   */
  stopBgm(options) {
    const seconds = readFadeSeconds(options, 'Sound.stopBgm');
    if (!currentBgm) return;
    fadeOutAndStop(currentBgm, seconds);
    currentBgm = null;
  },

  /**
   * 全体の音量（0〜1、既定値 1）。
   * @type {number}
   */
  get masterVolume() {
    return volumes.master;
  },
  /**
   * 全体の音量を設定する。
   * @param {number} value 0〜1 の数値
   * @throws {RangeError} 0〜1 の数値でない場合
   */
  set masterVolume(value) {
    assertVolume(value, 'Sound.masterVolume');
    volumes.master = value;
    if (masterGain) masterGain.gain.value = value;
  },

  /**
   * BGM の音量（0〜1、既定値 1）。
   * @type {number}
   */
  get bgmVolume() {
    return volumes.bgm;
  },
  /**
   * BGMの音量を設定する。
   * @param {number} value 0〜1 の数値
   * @throws {RangeError} 0〜1 の数値でない場合
   */
  set bgmVolume(value) {
    assertVolume(value, 'Sound.bgmVolume');
    volumes.bgm = value;
    if (bgmGain) bgmGain.gain.value = value;
  },

  /**
   * SE の音量（0〜1、既定値 1）。
   * @type {number}
   */
  get seVolume() {
    return volumes.se;
  },
  /**
   * SEの音量を設定する。
   * @param {number} value 0〜1 の数値
   * @throws {RangeError} 0〜1 の数値でない場合
   */
  set seVolume(value) {
    assertVolume(value, 'Sound.seVolume');
    volumes.se = value;
    if (seGain) seGain.gain.value = value;
  },
};
