/**
 * 責務: Engine.start の呼び出しとレイヤーの定義を行う利用側のエントリポイント。
 * 確認用コード（目印の中）に限り、図形の更新、入力（ポインタ、キー、ボタン）の確認、描画処理、
 * アセット・サウンド・セーブの確認を例外的に含む。
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
import { Assets, Sound, Storage } from 'oz';

/** 確認用にロードする画像と音声の一覧 */
const SAMPLE_ASSETS = {
  images: { sample: './assets/images/sample.png' },
  sounds: { se: './assets/sounds/sample_se.mp3', bgm: './assets/sounds/sample_bgm.mp3' },
};
/** BGM のフェードの長さ（ミリ秒） */
const BGM_FADE_MS = 1000;
/** bgmVolume を順に切り替える値 */
const BGM_VOLUME_STEPS = [1, 0.5, 0.1];
/** seVolume を順に切り替える値 */
const SE_VOLUME_STEPS = [1, 0.5, 0.1];
/** masterVolume を順に切り替える値 */
const MASTER_VOLUME_STEPS = [1, 0];
/** 確認用の画像を描く高さ */
const SAMPLE_IMAGE_HEIGHT = 200;
/** 確認用の画像の右端からの余白 */
const SAMPLE_IMAGE_MARGIN = 20;
/**
 * BGM を流す状態か。シーンを切り替えても残すので、モジュール内に置く。
 * @type {boolean}
 */
let sampleBgmOn = true;

/**
 * セーブデータの版。URL に `?savever=2` があれば 2、なければ 1（版違いの動作の確認用）。
 * @type {number}
 */
const saveVersion = new URLSearchParams(location.search).get('savever') === '2' ? 2 : 1;
Storage.open({ key: 'ozengine-sample', version: saveVersion, defaults: { count: 0 } });

/** 図形の一辺の長さ（ピクセル） */
const SIZE = 200;
/** 端から端まで動くのにかかる時間（ミリ秒） */
const TRAVEL_MS = 4000;
/** 図形の速さ（ピクセル毎ミリ秒）。全図形で共通 */
const SPEED = (config.width - SIZE) / TRAVEL_MS;
/** timeScale を順に切り替える値 */
const SPEED_STEPS = [1, 0.25, 0];
/** ボタンの y 座標 */
const BUTTON_Y = 600;
/** ボタンの幅 */
const BUTTON_W = 180;
/** ボタンの高さ */
const BUTTON_H = 80;
/** ボタンの横の間隔（左端どうしの距離） */
const BUTTON_PITCH = BUTTON_W + 20;
/** 跡として残すポインタ位置の最大数 */
const TRAIL_MAX = 40;
/** 色違いごとの背景色と、ボタンの先頭の x */
const VARIANTS = [
  { background: '#16213e', buttonX: 40 },
  { background: '#3b1f2b', buttonX: 660 },
];

/**
 * 確認用の図形の配列を作る。
 * 意図的に front, middle, back の順（レイヤー定義と逆）に並べている。
 * 配列の順に描いても、エンジンのレイヤー順で重なることを確認するため。
 * pressedColor は Space を押している間の色。
 * @returns {{layer: string, color: string, pressedColor: string, x: number, y: number, dir: number}[]} 図形の配列
 */
function createSampleShapes() {
  return [
    { layer: 'front', color: '#3498db', pressedColor: '#aed6f1', x: 160, y: 320, dir: 1 },
    { layer: 'middle', color: '#2ecc71', pressedColor: '#abebc6', x: 80, y: 260, dir: 1 },
    { layer: 'back', color: '#e74c3c', pressedColor: '#f5b7b1', x: 0, y: 200, dir: 1 },
  ];
}

/**
 * BGM を流す状態のときだけ、BGM を流す（同じ曲なら何も起きない）。
 * @returns {void}
 */
function startSampleBgm() {
  if (sampleBgmOn) Sound.playBgm('bgm', { fadeMs: BGM_FADE_MS });
}

/**
 * BGM を流す状態を反転し、流す／止めるを行う。
 * @returns {void}
 */
function toggleSampleBgm() {
  sampleBgmOn = !sampleBgmOn;
  if (sampleBgmOn) Sound.playBgm('bgm', { fadeMs: BGM_FADE_MS });
  else Sound.stopBgm({ fadeMs: BGM_FADE_MS });
}

/**
 * steps の中で value の次の値を返す（末尾の次は先頭）。
 * @param {number[]} steps 値の並び
 * @param {number} value 現在の値
 * @returns {number} 次の値
 */
function nextStep(steps, value) {
  const i = steps.indexOf(value);
  return steps[(i + 1) % steps.length];
}

/**
 * ボタンの矩形と文字を描く。
 * @param {CanvasRenderingContext2D} ctx 描画先のコンテキスト
 * @param {{x: number, y: number, width: number, height: number}} button ボタンの矩形
 * @param {string} label ボタンの文字
 * @returns {void}
 */
function drawSampleButton(ctx, button, label) {
  ctx.save();
  ctx.fillStyle = '#34495e';
  ctx.fillRect(button.x, button.y, button.width, button.height);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(button.x, button.y, button.width, button.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, button.x + button.width / 2, button.y + button.height / 2);
  ctx.restore();
}

/**
 * レイヤーごとに図形を動かして描き、画像を表示して、入力（ポインタ、キー、ボタン）と
 * サウンドとセーブの操作を確認するシーン。
 * 手前から青、緑、赤の順に見えれば、レイヤーの定義どおりである。
 */
class SampleScene extends Scene {
  /**
   * 色違いの番号（0 か 1）
   * @type {number}
   */
  variant;

  /**
   * 図形の配列（切り替え時に同じ配列を引き継ぐ）
   * @type {{layer: string, color: string, pressedColor: string, x: number, y: number, dir: number}[]}
   */
  shapes;

  /**
   * ボタンの矩形（init で作る）
   * @type {{x: number, y: number, width: number, height: number}[]}
   */
  buttons = [];

  /** @type {number} ボタンの外を押した回数 */
  outsideCount = 0;

  /** @type {number} キーを押した回数 */
  keyCount = 0;

  /** @type {{x: number, y: number}|null} 押した位置 */
  pressPos = null;

  /** @type {{x: number, y: number}[]} 押している間の跡 */
  trail = [];

  /** @type {{x: number, y: number}|null} 離した位置 */
  releasePos = null;

  /**
   * @param {number} variant 色違いの番号（0 か 1）
   * @param {{layer: string, color: string, pressedColor: string, x: number, y: number, dir: number}[]} shapes 図形の配列
   */
  constructor(variant, shapes) {
    super();
    this.variant = variant;
    this.shapes = shapes;
  }

  /**
   * 3つのボタンを登録し、描画のために矩形を保持する。
   * @returns {void}
   */
  init() {
    const actions = [() => this.cycleSpeed(), () => this.switchScene(), () => this.pushOverlay()];
    const x0 = VARIANTS[this.variant].buttonX;
    actions.forEach((onPress, i) => {
      const rect = { x: x0 + i * BUTTON_PITCH, y: BUTTON_Y, width: BUTTON_W, height: BUTTON_H };
      this.buttons.push(rect);
      Engine.addButton(this, { ...rect, onPress });
    });
  }

  /**
   * timeScale を SPEED_STEPS の次の値にする。
   * @returns {void}
   */
  cycleSpeed() {
    const i = SPEED_STEPS.indexOf(Engine.timeScale);
    Engine.timeScale = SPEED_STEPS[(i + 1) % SPEED_STEPS.length];
  }

  /**
   * 色違いのシーンへ切り替える。図形は引き継ぐ。
   * @returns {void}
   */
  switchScene() {
    Engine.changeScene(new SampleScene(1 - this.variant, this.shapes));
  }

  /**
   * 積んだ画面を積む。
   * @returns {void}
   */
  pushOverlay() {
    Engine.pushScene(new SampleOverlayScene());
  }

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
   * ボタンの外のポインタ入力を記録する。押下では BGM の再生要求も行う。
   * @param {{type: string, x: number, y: number}} pointer ポインタ入力
   * @returns {void}
   */
  onPointer(pointer) {
    const pos = { x: pointer.x, y: pointer.y };
    if (pointer.type === 'down') {
      startSampleBgm();
      this.outsideCount += 1;
      this.pressPos = pos;
      this.trail = [];
      this.releasePos = null;
    } else if (pointer.type === 'move') {
      this.trail.push(pos);
      if (this.trail.length > TRAIL_MAX) this.trail.shift();
    } else if (pointer.type === 'up') {
      this.releasePos = pos;
    }
  }

  /**
   * キーを押した回数を増やし、BGM を流し（5 は切り替え）、1・2・3 でボタンと同じ操作を、
   * 4〜9 でサウンドとセーブの操作を行う。
   * @param {string} code KeyboardEvent.code
   * @returns {void}
   */
  onKeyDown(code) {
    this.keyCount += 1;
    if (code === 'Digit5') toggleSampleBgm();
    else startSampleBgm();
    if (code === 'Digit1') this.cycleSpeed();
    else if (code === 'Digit2') this.switchScene();
    else if (code === 'Digit3') this.pushOverlay();
    else if (code === 'Digit4') Sound.playSe('se');
    else if (code === 'Digit6') Sound.bgmVolume = nextStep(BGM_VOLUME_STEPS, Sound.bgmVolume);
    else if (code === 'Digit7') Sound.seVolume = nextStep(SE_VOLUME_STEPS, Sound.seVolume);
    else if (code === 'Digit8') Sound.masterVolume = nextStep(MASTER_VOLUME_STEPS, Sound.masterVolume);
    else if (code === 'Digit9') Storage.set('count', Storage.get('count') + 1);
  }

  /**
   * 指定されたレイヤーの図形を描く。back は背景と右上の画像、front はボタン、説明、ポインタの印も描く。
   * 状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先のコンテキスト
   * @param {string} layer 描画中のレイヤー名
   * @param {{realDelta: number, gameTime: number, timeScale: number}} time 読み取り専用の時間情報
   * @returns {void}
   */
  draw(ctx, layer, time) {
    if (layer === 'back') {
      ctx.save();
      ctx.fillStyle = VARIANTS[this.variant].background;
      ctx.fillRect(0, 0, config.width, config.height);
      const image = Assets.image('sample');
      const imageWidth = (image.width / image.height) * SAMPLE_IMAGE_HEIGHT;
      ctx.drawImage(
        image,
        config.width - imageWidth - SAMPLE_IMAGE_MARGIN,
        0,
        imageWidth,
        SAMPLE_IMAGE_HEIGHT,
      );
      ctx.restore();
    }
    const pressed = Engine.isKeyDown('Space');
    for (const s of this.shapes) {
      if (s.layer !== layer) continue;
      ctx.save();
      ctx.fillStyle = pressed ? s.pressedColor : s.color;
      ctx.fillRect(s.x, s.y, SIZE, SIZE);
      ctx.restore();
    }
    if (layer !== 'front') return;
    const labels = [`速さ ×${time.timeScale} [1]`, '切替 [2]', '積む [3]'];
    this.buttons.forEach((b, i) => drawSampleButton(ctx, b, labels[i]));
    this.drawGuide(ctx);
    this.drawSoundGuide(ctx);
    this.drawMarks(ctx);
  }

  /**
   * サウンドとセーブの操作の説明と現在の値を描く。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先のコンテキスト
   * @returns {void}
   */
  drawSoundGuide(ctx) {
    const lines = [
      '[4] SE を鳴らす',
      `[5] BGM: ${sampleBgmOn ? '流す' : '止める'}`,
      `[6] bgmVolume: ${Sound.bgmVolume}`,
      `[7] seVolume: ${Sound.seVolume}`,
      `[8] masterVolume: ${Sound.masterVolume}`,
      `[9] count: ${Storage.get('count')}`,
    ];
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, 850, 10 + i * 30));
    ctx.restore();
  }

  /**
   * 説明の文字を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先のコンテキスト
   * @returns {void}
   */
  drawGuide(ctx) {
    const pos = this.pressPos
      ? `(${Math.round(this.pressPos.x)}, ${Math.round(this.pressPos.y)})`
      : '-';
    const lines = [
      `押した位置: ${pos}`,
      `ボタンの外を押した回数: ${this.outsideCount}`,
      `キーを押した回数: ${this.keyCount}`,
      'Space を押している間は図形の色が変わる',
    ];
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, 20, 40 + i * 30));
    ctx.restore();
  }

  /**
   * ポインタの印（押した位置の十字、跡の丸、離した位置の輪）を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先のコンテキスト
   * @returns {void}
   */
  drawMarks(ctx) {
    ctx.save();
    if (this.pressPos) {
      const { x, y } = this.pressPos;
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.lineTo(x + 12, y);
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x, y + 12);
      ctx.stroke();
    }
    ctx.fillStyle = '#f1c40f';
    for (const p of this.trail) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.releasePos) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.releasePos.x, this.releasePos.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * SampleScene の上に積む確認用の画面。戻すボタンと Esc キーで戻る。
 */
class SampleOverlayScene extends Scene {
  /**
   * 戻すボタンの矩形
   * @type {{x: number, y: number, width: number, height: number}}
   */
  button = { x: 540, y: 40, width: 200, height: 80 };

  /** @type {number} この画面でボタンの外を押した回数 */
  outsideCount = 0;

  /**
   * 戻すボタンを登録する。
   * @returns {void}
   */
  init() {
    Engine.addButton(this, { ...this.button, onPress: () => Engine.popScene() });
  }

  /**
   * 'down' のときだけ、ボタンの外を押した回数を増やす。
   * @param {{type: string, x: number, y: number}} pointer ポインタ入力
   * @returns {void}
   */
  onPointer(pointer) {
    if (pointer.type === 'down') this.outsideCount += 1;
  }

  /**
   * Escape のときだけ前の画面へ戻る。
   * @param {string} code KeyboardEvent.code
   * @returns {void}
   */
  onKeyDown(code) {
    if (code === 'Escape') Engine.popScene();
  }

  /**
   * front レイヤーに、半透明の覆い、戻すボタン、文字を描く。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先のコンテキスト
   * @param {string} layer 描画中のレイヤー名
   * @param {{realDelta: number, gameTime: number, timeScale: number}} time 読み取り専用の時間情報
   * @returns {void}
   */
  draw(ctx, layer, time) {
    if (layer !== 'front') return;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, config.width, config.height);
    ctx.restore();
    drawSampleButton(ctx, this.button, '戻す [Esc]');
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('積んだ画面', 640, 130);
    ctx.fillText(`この画面でボタンの外を押した回数: ${this.outsideCount}`, 640, 160);
    ctx.restore();
  }
}

/**
 * 画像と音声をロードし、完了したら SampleScene へ切り替えるシーン。
 */
class SampleLoadScene extends Scene {
  /**
   * ロードを始め、完了したら BGM と SE を鳴らして SampleScene へ切り替える。
   * @returns {void}
   */
  init() {
    Assets.load(SAMPLE_ASSETS).then(() => {
      Sound.playBgm('bgm', { fadeMs: BGM_FADE_MS });
      Sound.playSe('se');
      Engine.changeScene(new SampleScene(0, createSampleShapes()));
    });
  }

  /**
   * front レイヤーに「ロード中」を画面中央に描く。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先のコンテキスト
   * @param {string} layer 描画中のレイヤー名
   * @param {{realDelta: number, gameTime: number, timeScale: number}} time 読み取り専用の時間情報
   * @returns {void}
   */
  draw(ctx, layer, time) {
    if (layer !== 'front') return;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ロード中', config.width / 2, config.height / 2);
    ctx.restore();
  }
}

config.layers = ['back', 'middle', 'front'];
config.scene = new SampleLoadScene();
config.debug = new URLSearchParams(location.search).has('debug');
/* ozengine sample: end */

Engine.start(config);
