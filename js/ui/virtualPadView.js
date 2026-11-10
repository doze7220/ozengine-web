/**
 * 責務: バーチャルパッドの画像の読み込みと描画。
 * 表示の条件と押下状態はエンジン（Engine.virtualPadState）から読む。
 */
import { Assets, Engine } from 'oz';
import { VIRTUAL_PAD_LOOK } from './virtualPadConfig.js';

/** スティックの土台の画像の名前（ゲームの名前とぶつからないよう vpad: で始める）。 */
const NAME_STICK_BASE = 'vpad:stickBase';
/** スティックのつまみの画像の名前（ゲームの名前とぶつからないよう vpad: で始める）。 */
const NAME_STICK_KNOB = 'vpad:stickKnob';

/**
 * ボタンの画像の名前を作る。
 * @param {number} index ボタンの番号
 * @param {boolean} pressed 押している間の画像か
 * @returns {string} 画像の名前
 */
function buttonName(index, pressed) {
  return pressed ? `vpad:button${index}:pressed` : `vpad:button${index}`;
}

/**
 * バーチャルパッドの画像を読み込む。バーチャルパッドが無効なら何も読み込まない。
 * @returns {Promise<void>} 読み込みが終わると解決する Promise
 */
export function loadVirtualPadImages() {
  if (!Engine.virtualPadEnabled) return Promise.resolve();
  const images = {
    [NAME_STICK_BASE]: VIRTUAL_PAD_LOOK.stickBase,
    [NAME_STICK_KNOB]: VIRTUAL_PAD_LOOK.stickKnob,
  };
  VIRTUAL_PAD_LOOK.buttons.forEach((button, i) => {
    images[buttonName(i, false)] = button.image;
    images[buttonName(i, true)] = button.pressedImage;
  });
  return Assets.load({ images });
}

/**
 * シーンのバーチャルパッドを描く。表示してよくないとき、登録していないときは何も描かない。
 * ctx の状態は変えない（drawImage だけを使う）。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {import('oz').Scene} scene パッドを登録したシーン
 * @returns {void}
 */
export function drawVirtualPad(ctx, scene) {
  const pad = Engine.virtualPadState(scene);
  if (pad === null || !pad.visible) return;

  if (pad.stick) {
    const { x, y, radius, knobX, knobY } = pad.stick;
    const knobRadius = VIRTUAL_PAD_LOOK.knobRadius;
    ctx.drawImage(Assets.image(NAME_STICK_BASE), x - radius, y - radius, radius * 2, radius * 2);

    // つまみは、中心から radius - knobRadius の円の中に収めて描く
    const limit = radius - knobRadius;
    let ox = knobX - x;
    let oy = knobY - y;
    const len = Math.hypot(ox, oy);
    if (limit <= 0) {
      ox = 0;
      oy = 0;
    } else if (len > limit) {
      ox *= limit / len;
      oy *= limit / len;
    }
    ctx.drawImage(
      Assets.image(NAME_STICK_KNOB),
      x + ox - knobRadius,
      y + oy - knobRadius,
      knobRadius * 2,
      knobRadius * 2,
    );
  }

  pad.buttons.forEach((b, i) => {
    const image = Assets.image(buttonName(i, b.pressed));
    ctx.drawImage(image, b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2);
  });
}
