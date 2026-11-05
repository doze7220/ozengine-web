/**
 * 責務: Engine.start の呼び出しとレイヤーの定義を行う利用側のエントリポイント。
 */
import { Engine, Scene } from 'oz';

/**
 * Engine.start に渡す設定。tickRate は書かない（既定の 60）。
 * @type {{canvas: HTMLCanvasElement, width: number, height: number, layers: string[], scene: Scene, debug?: boolean}}
 */
const config = {
  canvas: document.querySelector('canvas'),
  width: 1280,
  height: 720,
  layers: ['main'],
  scene: new Scene(),
};

/* ozengine sample: begin */
import { LoadScene } from './scenes/LoadScene.js';

config.layers = ['stars', 'trail', 'ship', 'wind', 'ui'];
config.scene = new LoadScene({ width: config.width, height: config.height });
config.debug = new URLSearchParams(location.search).has('debug');
/* ozengine sample: end */

Engine.start(config);
