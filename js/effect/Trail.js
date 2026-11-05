/**
 * 責務: 機体の左右の噴射口の軌跡（トレイル）の履歴の更新と描画。
 * ゲーム進行に影響する処理は持たない。
 */
/* ozengine sample */

/** 履歴の最大の点の数 */
const MAX_HISTORY = 60;
/** 噴射口の機体座標のx（機体の後方） */
const NOZZLE_LOCAL_X = -43;
/** 噴射口の機体座標のy（絶対値。左は負、右は正） */
const NOZZLE_LOCAL_Y = 12;
/** 帯の色（rgba の r, g, b） */
const TRAIL_COLOR = '0, 220, 255';
/** 帯の不透明度 */
const TRAIL_ALPHA = 1.0;
/** 根元の太さ（半幅） */
const BASE_THICKNESS = 3.75;
/** 太さが尻尾へ向かって細くなる曲線の指数 */
const THICKNESS_EXPONENT = 1.2;
/** 根元の円の半径 */
const CAP_RADIUS = BASE_THICKNESS;
/** 根元の円の不透明度 */
const CAP_ALPHA = 1;
/** 根元の発光の強さ */
const CAP_GLOW = 15;
/** 発光させる四角形の数（根元から数える） */
const GLOW_SEGMENTS = 15;
/** 発光の強さの最大（根元の四角形）。1つ進むごとに1ずつ弱くなる */
const GLOW_MAX = 15;
/** 隙間を防ぐ微小ストロークの太さ */
const SEAM_LINE_WIDTH = 1;
/** この点の数より少ない履歴は描かない */
const MIN_POINTS = 2;

/**
 * @typedef {Object} Point
 * @property {number} x ワールド座標のx
 * @property {number} y ワールド座標のy
 */

/**
 * @typedef {Object} Camera
 * @property {number} x ワールド座標に足すと画面の座標になる値（x）
 * @property {number} y ワールド座標に足すと画面の座標になる値（y）
 */

/**
 * @typedef {Object} TrailSource
 * @property {number} x ワールド座標のx
 * @property {number} y ワールド座標のy
 * @property {number} angle 向き（ラジアン）
 */

/**
 * 2点を結ぶ線分の単位法線を求める。
 * @param {Point} from 始点
 * @param {Point} to 終点
 * @returns {{ x: number, y: number }} 単位法線のベクトル（座標ではない。長さ0のときは割る数を1にする）
 */
function segmentNormal(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

/**
 * 履歴の各点での左右の輪郭の頂点を求める。
 * @param {Point[]} history 履歴（先頭が最新）
 * @returns {{ left: Point[], right: Point[] }} 左右の輪郭
 */
function buildOutline(history) {
  const left = [];
  const right = [];
  for (let i = 0; i < history.length; i++) {
    const p = history[i];
    let nx;
    let ny;

    if (i === 0) {
      const n = segmentNormal(p, history[1]);
      nx = n.x;
      ny = n.y;
    } else if (i === history.length - 1) {
      const n = segmentNormal(history[i - 1], p);
      nx = n.x;
      ny = n.y;
    } else {
      // 前後の法線の平均（マイター）でカーブを滑らかに繋ぐ
      const n1 = segmentNormal(history[i - 1], p);
      const n2 = segmentNormal(p, history[i + 1]);
      nx = (n1.x + n2.x) / 2;
      ny = (n1.y + n2.y) / 2;
      const nlen = Math.hypot(nx, ny) || 1;
      nx /= nlen;
      ny /= nlen;
    }

    // 先端が 1、尻尾が 0
    const t = 1 - i / history.length;
    const thickness = BASE_THICKNESS * Math.pow(t, THICKNESS_EXPONENT);

    left.push({ x: p.x + nx * thickness, y: p.y + ny * thickness });
    right.push({ x: p.x - nx * thickness, y: p.y - ny * thickness });
  }
  return { left, right };
}

/**
 * 1本の帯を塗る。ctx の状態は変更したままなので、呼び出し側で save / restore すること。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {Point[]} history 履歴（先頭が最新）
 * @returns {void}
 */
function fillBand(ctx, history) {
  if (history.length < MIN_POINTS) return;

  const { left, right } = buildOutline(history);
  const fillStyle = `rgba(${TRAIL_COLOR}, ${TRAIL_ALPHA})`;

  // 根元を丸くする円
  const head = history[0];
  ctx.beginPath();
  ctx.arc(head.x, head.y, CAP_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${TRAIL_COLOR}, ${CAP_ALPHA})`;
  ctx.shadowBlur = CAP_GLOW;
  ctx.shadowColor = `rgba(${TRAIL_COLOR}, ${CAP_ALPHA})`;
  ctx.fill();

  // セグメントごとに四角形を敷き詰める
  for (let i = 0; i < history.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(left[i].x, left[i].y);
    ctx.lineTo(left[i + 1].x, left[i + 1].y);
    ctx.lineTo(right[i + 1].x, right[i + 1].y);
    ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();

    ctx.fillStyle = fillStyle;
    // 隙間（クラック）を防ぐ微小ストローク
    ctx.strokeStyle = fillStyle;
    ctx.lineWidth = SEAM_LINE_WIDTH;

    // 噴射口の根元付近だけ発光させる
    if (i < GLOW_SEGMENTS) {
      ctx.shadowBlur = GLOW_MAX - i;
      ctx.shadowColor = fillStyle;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fill();
    ctx.stroke();
  }
}

/** 機体の左右の噴射口の軌跡を保持して描く。 */
export class Trail {
  /** 履歴を空で作る。 */
  constructor() {
    /** @type {Point[]} 左の履歴（先頭が最新） */
    this.historyL = [];
    /** @type {Point[]} 右の履歴（先頭が最新） */
    this.historyR = [];
  }

  /**
   * 機体の位置から左右の噴射口のワールド座標を求めて履歴の先頭へ足す。
   * @param {TrailSource} ship 機体（x, y, angle を持つ）
   * @returns {void}
   */
  update(ship) {
    const cos = Math.cos(ship.angle);
    const sin = Math.sin(ship.angle);

    this.historyL.unshift({
      x: ship.x + NOZZLE_LOCAL_X * cos + NOZZLE_LOCAL_Y * sin,
      y: ship.y + NOZZLE_LOCAL_X * sin - NOZZLE_LOCAL_Y * cos,
    });
    this.historyR.unshift({
      x: ship.x + NOZZLE_LOCAL_X * cos - NOZZLE_LOCAL_Y * sin,
      y: ship.y + NOZZLE_LOCAL_X * sin + NOZZLE_LOCAL_Y * cos,
    });

    if (this.historyL.length > MAX_HISTORY) this.historyL.pop();
    if (this.historyR.length > MAX_HISTORY) this.historyR.pop();
  }

  /**
   * 左右の帯を描く。状態は変更しない。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {Camera} camera カメラ
   * @returns {void}
   */
  draw(ctx, camera) {
    ctx.save();
    ctx.translate(camera.x, camera.y);
    fillBand(ctx, this.historyL);
    fillBand(ctx, this.historyR);
    ctx.restore();
  }
}
