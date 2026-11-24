/**
 * 責務: 複数の場所で使う名前（レイヤー、画像、音、キー）の値だけを持つ置き場所。
 * 1か所でしか使わない名前、パス、色、大きさ、文言、レイヤーの順は持たない。
 */

/**
 * レイヤーの名前を書く場所（要素の名前: 値）。Engine.start の layers と、シーンの draw が受け取る layer の判定に使う。
 * 奥から手前への順は、main.js の layers が決める。
 */
export const LAYER = {
  /** 最小の起動（boot 画面だけ）で使うレイヤー。 */
  main: 'main',
  /* ozengine sample: begin */
  /** 星と背景。 */
  stars: 'stars',
  /** トレイル。 */
  trail: 'trail',
  /** 機体。 */
  ship: 'ship',
  /** 風。 */
  wind: 'wind',
  /** 文字、画像、ボタン、メニュー、窓。 */
  ui: 'ui',
  /* ozengine sample: end */
};

/**
 * 画像の名前を書く場所（要素の名前: 値）。Assets.load の images のキーと、Assets.image に使う。
 * 画像のパスは、ロードする側が持つ。
 */
export const IMAGE = {
  /* ozengine sample: begin */
  /** タイトルの画像。 */
  sample: 'sample',
  /* ozengine sample: end */
};

/**
 * 音の名前を書く場所（要素の名前: 値）。Assets.load の sounds のキーと、Sound.playSe・Sound.playBgm に使う。
 * 音のパスは、ロードする側が持つ。
 */
export const SOUND = {
  /* ozengine sample: begin */
  /** 効果音。 */
  se: 'se',
  /** BGM。 */
  bgm: 'bgm',
  /* ozengine sample: end */
};

/**
 * キーの値（KeyboardEvent.code の値）を書く場所（要素の名前: 値）。
 * Engine.isKeyDown、シーンの onKeyDown、バーチャルパッドの割り当てに使う。
 */
export const KEY = {
  /** 左へ動かすキー。 */
  left: 'ArrowLeft',
  /** 右へ動かすキー。 */
  right: 'ArrowRight',
  /** ブーストのキー。 */
  boost: 'Space',
  /* ozengine sample: begin */
  /** メニューを開く・閉じるキー。 */
  menu: 'KeyP',
  /* ozengine sample: end */
};
