/**
 * 責務: バーチャルパッドの定義（配置、キーの割り当て、画像のファイル名、つまみの描画の大きさ）。
 * 新規プロジェクトではここを書き換える。
 */

/**
 * パッドの配置とキーの割り当て（論理解像度 1280x720）。Engine.addVirtualPad の第2引数にそのまま渡す。
 * @type {{
 *   stick: {x: number, y: number, radius: number, deadZone: number, keys: {left?: string, right?: string, up?: string, down?: string}},
 *   buttons: {x: number, y: number, radius: number, key: string}[]
 * }}
 */
export const VIRTUAL_PAD_LAYOUT = {
  /** スティック（1つ）。 */
  stick: {
    /** 中心の x（論理座標の px）。 */
    x: 200,
    /** 中心の y（論理座標の px）。 */
    y: 530,
    /** 反応する円の半径（論理座標の px）。つまみはこの円の中で動く。 */
    radius: 130,
    /** 反応しない中心付近の範囲。radius に対する割合（0〜1）。 */
    deadZone: 0.25,
    /** 倒した向きに押すキー。書いた向きだけ有効（KeyboardEvent.code の値）。 */
    keys: {
      /** 左へ倒したときに押すキー。 */
      left: 'ArrowLeft',
      /** 右へ倒したときに押すキー。 */
      right: 'ArrowRight',
    },
  },
  /** ボタンの並び。 */
  buttons: [
    {
      /** 中心の x（論理座標の px）。 */
      x: 1090,
      /** 中心の y（論理座標の px）。 */
      y: 550,
      /** 反応する円の半径（論理座標の px）。 */
      radius: 100,
      /** 押している間に押すキー（KeyboardEvent.code の値）。 */
      key: 'Space',
    },
  ],
};

/**
 * パッドの見た目（画像のファイル名とつまみの描画の半径）。画像のパスはページからの相対パス。
 * buttons は VIRTUAL_PAD_LAYOUT.buttons と同じ順に書く。
 * @type {{
 *   stickBase: string, stickKnob: string, knobRadius: number,
 *   buttons: {image: string, pressedImage: string}[]
 * }}
 */
export const VIRTUAL_PAD_LOOK = {
  /** スティックの土台の画像のパス（ページからの相対パス）。 */
  stickBase: './assets/images/vpad/stick_base.svg',
  /** スティックのつまみの画像のパス（ページからの相対パス）。 */
  stickKnob: './assets/images/vpad/stick_knob.svg',
  /** つまみを描く半径（論理座標の px）。つまみは半径 stick.radius - knobRadius の円の中で動く。 */
  knobRadius: 56,
  /** ボタンの画像。VIRTUAL_PAD_LAYOUT.buttons と同じ順。 */
  buttons: [
    {
      /** 押していないときの画像のパス（ページからの相対パス）。 */
      image: './assets/images/vpad/button_boost.svg',
      /** 押している間の画像のパス（ページからの相対パス）。 */
      pressedImage: './assets/images/vpad/button_boost_pressed.svg',
    },
  ],
};
