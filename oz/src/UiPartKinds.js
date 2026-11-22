/**
 * 責務: 5種類の部品の足す操作の名前と、設定の検証・部品を作る処理の対応表（窓とスクロールする領域で共有する）。
 * Canvas の操作と位置の計算は行わず、5つの部品のファイルだけを import する。
 */

import { UiButton, validateButtonSpec } from './UiButton.js';
import { UiValue, validateValueSpec } from './UiValue.js';
import { UiCheckbox, validateCheckboxSpec } from './UiCheckbox.js';
import { UiSlider, validateSliderSpec } from './UiSlider.js';
import { UiChoices, validateChoicesSpec } from './UiChoices.js';

/**
 * 論理座標の矩形。
 * @typedef {import('./UiRect.js').UiRectangle} UiRectangle
 */

/**
 * 対応表の1つ分。部品1種類の、設定の検証と部品の作り方。
 * @typedef {Object} UiPartKind
 * @property {(spec: *, prefix: string) => Object} validate 設定を検証して、検証済みの設定を返す（正しくないとき prefix 付きの Error を投げる）
 * @property {(s: Object, rect: UiRectangle, hitRect: UiRectangle) => Object} create 検証済みの設定と、画面の矩形・当たりの矩形から部品を作る
 */

/**
 * 足す操作の名前から、設定の検証と部品の作り方への対応表（凍結）。
 * @type {Readonly<Object<string, Readonly<UiPartKind>>>}
 */
export const PART_KINDS = Object.freeze({
  addButton: Object.freeze({
    validate: (spec, prefix) => validateButtonSpec(spec, prefix),
    create: (s, rect, hitRect) =>
      new UiButton({ rect, hitRect, label: s.label, onPress: s.onPress, enabled: s.enabled }),
  }),
  addValue: Object.freeze({
    validate: (spec, prefix) => validateValueSpec(spec, prefix),
    create: (s, rect, hitRect) =>
      new UiValue({ rect, hitRect, label: s.label, read: s.read, format: s.format }),
  }),
  addCheckbox: Object.freeze({
    validate: (spec, prefix) => validateCheckboxSpec(spec, prefix),
    create: (s, rect, hitRect) =>
      new UiCheckbox({ rect, hitRect, label: s.label, read: s.read, write: s.write }),
  }),
  addSlider: Object.freeze({
    validate: (spec, prefix) => validateSliderSpec(spec, prefix),
    create: (s, rect, hitRect) =>
      new UiSlider({
        rect,
        hitRect,
        label: s.label,
        min: s.min,
        max: s.max,
        step: s.step,
        read: s.read,
        write: s.write,
        format: s.format,
      }),
  }),
  addChoices: Object.freeze({
    validate: (spec, prefix) => validateChoicesSpec(spec, prefix),
    create: (s, rect, hitRect) =>
      new UiChoices({
        rect,
        hitRect,
        choices: s.choices,
        direction: s.direction,
        read: s.read,
        write: s.write,
      }),
  }),
});
