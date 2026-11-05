/**
 * 責務: ミュート設定の保存と、全体の音量への反映。
 */
/* ozengine sample */
import { Sound, Storage } from 'oz';

/** localStorage のキー */
const STORAGE_KEY = 'ozengine-sample';
/** セーブの版番号 */
const STORAGE_VERSION = 1;
/** ミュートしていないときの全体の音量 */
const VOLUME_ON = 1;
/** ミュートしているときの全体の音量 */
const VOLUME_MUTED = 0;

/**
 * 保存されたミュート設定を全体の音量に反映する。
 * @returns {void}
 */
function applyMute() {
  Sound.masterVolume = isMuted() ? VOLUME_MUTED : VOLUME_ON;
}

/**
 * セーブを開き、ミュート設定を音量に反映する。Storage.open は2回呼べないので1回だけ呼ぶこと。
 * @returns {void}
 */
export function openMute() {
  Storage.open({ key: STORAGE_KEY, version: STORAGE_VERSION, defaults: { muted: false } });
  applyMute();
}

/**
 * ミュート中かどうかを返す（読み取りのみ。draw から呼んでよい）。
 * @returns {boolean} ミュート中なら true
 */
export function isMuted() {
  return Storage.get('muted');
}

/**
 * ミュートの状態を切り替えて保存し、音量に反映する。
 * @returns {void}
 */
export function toggleMute() {
  Storage.set('muted', !isMuted());
  applyMute();
}
