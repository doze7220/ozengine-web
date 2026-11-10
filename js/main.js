/**
 * 責務: Engine.start の呼び出しと、レイヤーと最初の画面の流れ（boot 画面と次の画面）の定義を行う利用側のエントリポイント。
 */
import { Engine, Scene } from 'oz';
import { BootScene } from './scenes/BootScene.js';

/** 解像度 */
const screen = { width: 1280, height: 720 };

/**
 * Engine.start に渡す設定。tickRate は書かない（既定の 60）。
 * scene: 最初の画面は boot 画面。next が次に進む画面を作る関数なので、新規プロジェクトでは自分の最初のシーンを作る関数に書き換える。
 * virtualPad: バーチャルパッドを使うなら true。false にすると表示も画像の読み込みもしない。
 * @type {{canvas: HTMLCanvasElement, width: number, height: number, layers: string[], scene: Scene, debug?: boolean, virtualPad?: boolean}}
 */
const config = {
  canvas: document.querySelector('canvas'),
  width: screen.width,
  height: screen.height,
  layers: ['main'],
  scene: new BootScene({ screen, layer: 'main', next: () => new Scene() }),
  virtualPad: true,
};

/* ozengine sample: begin */
import { LoadScene } from './scenes/LoadScene.js';
import { TitleScene } from './scenes/TitleScene.js';

config.layers = ['stars', 'trail', 'ship', 'wind', 'ui'];
config.scene = new LoadScene(screen, () => new BootScene({ screen, layer: 'ui', next: () => new TitleScene(screen) }));
config.debug = new URLSearchParams(location.search).has('debug');
/* ozengine sample: end */

Engine.start(config);
