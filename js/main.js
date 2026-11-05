/**
 * 責務: Engine.start の呼び出しとレイヤーの定義を行う利用側のエントリポイント。
 * 確認用コード（目印の中）に限り、図形の更新と描画処理を例外的に含む。
 */
import { Engine, Scene } from 'oz';

const config = {
  canvas: document.querySelector('canvas'),
  width: 1280,
  height: 720,
  layers: ['main'],
  scene: new Scene(),
};

/* ozengine sample: begin */
/** 図形の一辺の長さ（ピクセル） */
const SIZE = 200;
/** 端から端まで動くのにかかる時間（ミリ秒） */
const TRAVEL_MS = 4000;
/** 図形の速さ（ピクセル毎ミリ秒）。全図形で共通 */
const SPEED = (config.width - SIZE) / TRAVEL_MS;

/**
 * レイヤーごとに図形を動かして描く確認用シーン。
 * 手前から青、緑、赤の順に見えれば、レイヤーの定義どおりである。
 */
class SampleScene extends Scene {
  /**
   * 図形の配列。意図的に front, middle, back の順（レイヤー定義と逆）に並べている。
   * 配列の順に描いても、エンジンのレイヤー順で重なることを確認するため。
   * @type {{layer: string, color: string, x: number, y: number, dir: number}[]}
   */
  shapes = [
    { layer: 'front', color: '#3498db', x: 160, y: 320, dir: 1 },
    { layer: 'middle', color: '#2ecc71', x: 80, y: 260, dir: 1 },
    { layer: 'back', color: '#e74c3c', x: 0, y: 200, dir: 1 },
  ];

  /**
   * 各図形を動かし、範囲外に出たら範囲内に戻して向きを反転する。
   * @param {number} dt 1ティックの長さ（ミリ秒）
   * @returns {void}
   */
  update(dt) {
    const max = config.width - SIZE;
    for (const s of this.shapes) {
      s.x += s.dir * SPEED * dt;
      if (s.x > max) {
        s.x = max;
        s.dir = -1;
      } else if (s.x < 0) {
        s.x = 0;
        s.dir = 1;
      }
    }
  }

  /**
   * 指定されたレイヤーの図形だけを描く。
   * @param {CanvasRenderingContext2D} ctx 描画先のコンテキスト
   * @param {string} layer 描画中のレイヤー名
   * @param {{realDelta: number, gameTime: number, timeScale: number}} time 読み取り専用の時間情報
   * @returns {void}
   */
  draw(ctx, layer, time) {
    for (const s of this.shapes) {
      if (s.layer !== layer) continue;
      ctx.save();
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, SIZE, SIZE);
      ctx.restore();
    }
  }
}

config.layers = ['back', 'middle', 'front'];
config.scene = new SampleScene();
config.debug = new URLSearchParams(location.search).has('debug');
/* ozengine sample: end */

Engine.start(config);
