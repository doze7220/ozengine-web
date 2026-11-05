/**
 * 責務: ブースト時に出る白い風の線（スピード線）の発生、更新、描画。
 * ゲーム進行に影響する処理は持たない。
 */
/* ozengine sample */

/** 1回の発生で足す本数の最小 */
const SPAWN_MIN = 30;
/** 1回の発生で足す本数の幅（最小に加える乱数の範囲） */
const SPAWN_RANGE = 20;
/** 線が1ティックごとに伸びる長さ（1ティックあたりの値、tickRate 60 前提） */
const LENGTH_GROWTH = 10;
/** 出現の fade-in にかけるティック数 */
const FADE_IN_TICKS = 5;
/** 消える前の fade-out にかけるティック数 */
const FADE_OUT_TICKS = 10;
/** 線の長さの最小 */
const LENGTH_MIN = 100;
/** 線の長さの幅（最小に加える乱数の範囲） */
const LENGTH_RANGE = 150;
/** 線の速さの最小（1ティックあたりの値、tickRate 60 前提） */
const SPEED_MIN = 10;
/** 線の速さの幅（最小に加える乱数の範囲） */
const SPEED_RANGE = 20;
/** 線の太さの最小 */
const THICKNESS_MIN = 2;
/** 線の太さの幅（最小に加える乱数の範囲） */
const THICKNESS_RANGE = 6;
/** 線の寿命の最小（ティック数） */
const MAX_LIFE_MIN = 15;
/** 線の寿命の幅（最小に加える乱数の範囲、ティック数） */
const MAX_LIFE_RANGE = 20;
/** 発生位置の前方の範囲（画面の幅に対する割合） */
const SPAWN_FORWARD_RATIO = 0.8;
/** 発生位置の左右の広がり（画面の高さに対する割合） */
const SPAWN_SIDE_RATIO = 1.5;
/** 線の不透明度の最小 */
const OPACITY_MIN = 0.4;
/** 線の不透明度の幅（最小に加える乱数の範囲） */
const OPACITY_RANGE = 0.6;
/** ベジェの尾側の制御点の位置（尾の座標に対する割合） */
const CURVE_TAIL_SIDE_RATIO = 0.66;
/** ベジェの先端側の制御点の位置（尾の座標に対する割合） */
const CURVE_HEAD_SIDE_RATIO = 0.33;
/** グラデーションの中間の色の位置（尾を0、先端を1とする） */
const GRADIENT_MID_STOP = 0.5;
/** グラデーションの最も明るい色の位置（尾を0、先端を1とする） */
const GRADIENT_PEAK_STOP = 0.9;
/** グラデーションの中間の不透明度の係数（最も明るい色の不透明度に掛ける） */
const GRADIENT_MID_OPACITY_RATIO = 0.5;

/**
 * @typedef {Object} Screen
 * @property {number} width 画面の幅
 * @property {number} height 画面の高さ
 */

/**
 * @typedef {Object} Camera
 * @property {number} x ワールド座標に足すと画面の座標になる値（x）
 * @property {number} y ワールド座標に足すと画面の座標になる値（y）
 */

/**
 * @typedef {Object} WindOrigin
 * @property {number} x 発生の基準のワールドx
 * @property {number} y 発生の基準のワールドy
 * @property {number} angle 基準の向き（ラジアン）
 */

/** 風の線1本。ファイルの外へは公開しない。 */
class WindLine {
  /**
   * 乱数で値を決め、基準の前方に発生させる。
   * @param {Screen} screen 画面の大きさ
   * @param {WindOrigin} origin 発生の基準（機体の位置と向き）
   */
  constructor(screen, origin) {
    /** @type {number} */
    this.length = Math.random() * LENGTH_RANGE + LENGTH_MIN;
    /** ワールド空間内で進行方向と真逆に飛ぶ速さ @type {number} */
    this.speed = Math.random() * SPEED_RANGE + SPEED_MIN;
    /** @type {number} */
    this.thickness = Math.random() * THICKNESS_RANGE + THICKNESS_MIN;
    /** @type {number} */
    this.angle = origin.angle + Math.PI;
    /** @type {number} */
    this.life = 0;
    /** @type {number} */
    this.maxLife = Math.random() * MAX_LIFE_RANGE + MAX_LIFE_MIN;

    const cos = Math.cos(origin.angle);
    const sin = Math.sin(origin.angle);
    const localX = Math.random() * screen.width * SPAWN_FORWARD_RATIO; // 前方の広い範囲
    const localY = (Math.random() - 0.5) * screen.height * SPAWN_SIDE_RATIO; // 左右への広がり

    /** @type {number} */
    this.x = origin.x + localX * cos - localY * sin;
    /** @type {number} */
    this.y = origin.y + localX * sin + localY * cos;
    /** @type {number} */
    this.opacity = Math.random() * OPACITY_RANGE + OPACITY_MIN;
  }

  /**
   * 1ティック進める。
   * @returns {void}
   */
  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.length += LENGTH_GROWTH;
    this.life++;
  }

  /**
   * 線を描く。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {Camera} camera カメラ
   * @returns {void}
   */
  draw(ctx, camera) {
    if (this.life > this.maxLife) return;

    let fade = 1;
    if (this.life < FADE_IN_TICKS) fade = this.life / FADE_IN_TICKS;
    else if (this.maxLife - this.life < FADE_OUT_TICKS) fade = (this.maxLife - this.life) / FADE_OUT_TICKS;
    if (fade <= 0) return;

    ctx.save();
    ctx.translate(this.x + camera.x, this.y + camera.y);
    ctx.rotate(this.angle);

    const tailX = -this.length;

    ctx.beginPath();
    ctx.moveTo(tailX, 0);
    ctx.bezierCurveTo(tailX * CURVE_TAIL_SIDE_RATIO, this.thickness, tailX * CURVE_HEAD_SIDE_RATIO, this.thickness, 0, 0);
    ctx.bezierCurveTo(tailX * CURVE_HEAD_SIDE_RATIO, -this.thickness, tailX * CURVE_TAIL_SIDE_RATIO, -this.thickness, tailX, 0);
    ctx.closePath();

    const grad = ctx.createLinearGradient(tailX, 0, 0, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(GRADIENT_MID_STOP, `rgba(255, 255, 255, ${this.opacity * fade * GRADIENT_MID_OPACITY_RATIO})`);
    grad.addColorStop(GRADIENT_PEAK_STOP, `rgba(255, 255, 255, ${this.opacity * fade})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'screen';
    ctx.fill();

    ctx.restore();
  }
}

/** 風の線の集まり。発生、更新、描画を行う。 */
export class Wind {
  /**
   * 線を持たない状態で作る。
   * @param {Screen} screen 画面の大きさ
   */
  constructor(screen) {
    /** @type {Screen} */
    this.screen = screen;
    /** @type {WindLine[]} */
    this.lines = [];
  }

  /**
   * 基準の前方に線を30〜49本足す。
   * @param {WindOrigin} ship 発生の基準（位置と向きを持つオブジェクト）
   * @returns {void}
   */
  spawn(ship) {
    const count = Math.floor(Math.random() * SPAWN_RANGE + SPAWN_MIN);
    for (let i = 0; i < count; i++) {
      this.lines.push(new WindLine(this.screen, ship));
    }
  }

  /**
   * 全線を1ティック進め、寿命を超えた線を外す。
   * @returns {void}
   */
  update() {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const line = this.lines[i];
      line.update();
      if (line.life > line.maxLife) this.lines.splice(i, 1);
    }
  }

  /**
   * 全線を描く。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {Camera} camera カメラ
   * @returns {void}
   */
  draw(ctx, camera) {
    for (const line of this.lines) line.draw(ctx, camera);
  }
}
