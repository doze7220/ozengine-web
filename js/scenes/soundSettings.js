/**
 * 責務: 土台の音の設定（ミュート・BGM の音量・効果音の音量）の保存と、Sound への反映。
 */
/* ozengine sample */
import { Sound, Storage } from 'oz';

/** localStorage のキー */
const STORAGE_KEY = 'ozengine-sample';
/** セーブの版番号 */
const STORAGE_VERSION = 1;
/** 音量の既定値（BGM・効果音とも） */
const DEFAULT_VOLUME = 1;
/** セーブの既定値 */
const STORAGE_DEFAULTS = { muted: false, bgmVolume: DEFAULT_VOLUME, seVolume: DEFAULT_VOLUME };
/** 保存の名前: ミュート */
const KEY_MUTED = 'muted';
/** 保存の名前: BGM の音量 */
const KEY_BGM_VOLUME = 'bgmVolume';
/** 保存の名前: 効果音の音量 */
const KEY_SE_VOLUME = 'seVolume';
/** ミュートしていないときの全体の音量 */
const VOLUME_ON = 1;
/** ミュートしているときの全体の音量 */
const VOLUME_MUTED = 0;

/**
 * 保存された音量を確かめ、0〜1 の有限の数でなければ既定値を返す（保存値は書き換えない）。
 * @param {unknown} value 保存されていた値
 * @returns {number} 反映してよい音量
 */
function validVolume(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : DEFAULT_VOLUME;
}

/**
 * 保存されたミュート設定を全体の音量に反映する。
 * @returns {void}
 */
function applyMute() {
  Sound.masterVolume = isMuted() ? VOLUME_MUTED : VOLUME_ON;
}

/**
 * セーブを開き、保存された音の設定を Sound に反映する。Storage.open は2回呼べないので1回だけ呼ぶこと。
 * @returns {void}
 */
export function openSoundSettings() {
  Storage.open({ key: STORAGE_KEY, version: STORAGE_VERSION, defaults: STORAGE_DEFAULTS });
  applyMute();
  Sound.bgmVolume = validVolume(Storage.get(KEY_BGM_VOLUME));
  Sound.seVolume = validVolume(Storage.get(KEY_SE_VOLUME));
}

/**
 * ミュート中かどうかを返す（読み取りのみ。draw から呼んでよい）。
 * @returns {boolean} ミュート中なら true
 */
export function isMuted() {
  return Storage.get(KEY_MUTED);
}

/**
 * ミュートの状態を切り替えて保存し、音量に反映する。
 * @returns {void}
 */
export function toggleMute() {
  Storage.set(KEY_MUTED, !isMuted());
  applyMute();
}

/**
 * ミュートの状態を指定して保存し、音量に反映する（チェックボックスの write 用）。
 * @param {boolean} muted 真ならミュートする
 * @returns {void}
 */
export function setMuted(muted) {
  Storage.set(KEY_MUTED, Boolean(muted));
  applyMute();
}

/**
 * BGM の音量を設定して保存する（スライダーの write 用）。
 * @param {number} volume 音量（0〜1）
 * @returns {void}
 */
export function setBgmVolume(volume) {
  Sound.bgmVolume = volume;
  Storage.set(KEY_BGM_VOLUME, volume);
}

/**
 * 効果音の音量を設定して保存する（スライダーの write 用）。
 * @param {number} volume 音量（0〜1）
 * @returns {void}
 */
export function setSeVolume(volume) {
  Sound.seVolume = volume;
  Storage.set(KEY_SE_VOLUME, volume);
}

/**
 * BGM・効果音の音量を 1、ミュートを切った状態に戻して、保存し、反映する。
 * @returns {void}
 */
export function resetSoundSettings() {
  setBgmVolume(DEFAULT_VOLUME);
  setSeVolume(DEFAULT_VOLUME);
  setMuted(false);
}
