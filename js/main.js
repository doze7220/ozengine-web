/**
 * 責務: Engine.start の呼び出しと、開発モードの指定（URL の ?debug）、レイヤーの並び（名前は names.js）と最初の画面の流れ（boot 画面と次の画面）の定義を行う利用側のエントリポイント。
 */
import { Engine, Scene } from 'oz';
import { LAYER } from './names.js';
import { BootScene } from './scenes/BootScene.js';

/** 解像度 */
const screen = { width: 1280, height: 720 };

/**
 * 開発モードで起動するか。真なら Engine.debug が true になり、FPS を表示した状態で始まる。
 * URL に ?debug を付けて開くと真になる（?debug=1 など、0 以外の値も真）。付けないときと ?debug=0 のときは偽。大文字の ?DEBUG は指定とみなさない。
 * 偽に固定するなら、右辺を false に書き換える。
 * @type {boolean}
 */
const debug = ![null, '0'].includes(new URLSearchParams(location.search).get('debug'));

/**
 * Engine.start に渡す設定。tickRate は書かない（既定の 60）。
 * scene: 最初の画面は boot 画面。next が次に進む画面を作る関数なので、新規プロジェクトでは自分の最初のシーンを作る関数に書き換える。
 * debug: 開発モードで起動するか（上の debug の値）。
 * virtualPad: バーチャルパッドを使うなら true。false にすると表示も画像の読み込みもしない。
 * @type {{canvas: HTMLCanvasElement, width: number, height: number, layers: string[], scene: Scene, debug?: boolean, virtualPad?: boolean}}
 */
const config = {
  canvas: document.querySelector('canvas'),
  width: screen.width,
  height: screen.height,
  layers: [LAYER.main],
  scene: new BootScene({ screen, layer: LAYER.main, next: () => new Scene() }),
  debug,
  virtualPad: true,
};

/* ozengine sample: begin */
import { LoadScene } from './scenes/LoadScene.js';
import { TitleScene } from './scenes/TitleScene.js';

config.layers = [LAYER.stars, LAYER.trail, LAYER.ship, LAYER.wind, LAYER.ui];
config.scene = new LoadScene(screen, () => new BootScene({ screen, layer: LAYER.ui, next: () => new TitleScene(screen) }));
/* ozengine sample: end */

Engine.start(config);
