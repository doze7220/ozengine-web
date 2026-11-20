# RES: 作業レポート Interrupt : エディタの版3の曲線のスプライトの表示の確認
* 参照元REQ: `./_log/req/261120_1545_Interrupt_エディタの版3の曲線のスプライトの表示の確認.md`

## 1. 作業目的
OZ Vector Editor の書き出し形式 版3（曲線の区間を持つ `bezierPath`）の確かめ用スプライトを、タイトル画面に (a) `draw(ctx)` 直接、(b) `CanvasCache` の2通りで並べて表示し、目視確認できるようにする。

## 2. 実装内容
* `TitleScene.js` に確かめ用スプライト（`_doc/BRIDGE_FROM_VECTOREDITOR_curve_check.js`）を import し、`init` で `CanvasCache.create(sprite, { bounds: sprite.bounds })` を作成、`destroy`（新設、`super.destroy()` 後に `dispose()`）で手放す。
* `draw` の `ui` レイヤーで、ボタンのあとに (a) 中心 (320, 400)・(b) 中心 (960, 400) へ `ctx.translate` のみで描き、各ラベル（`(a) draw` / `(b) CanvasCache`、24px、y = 288）を `drawText` で描く。
* **この変更は確認用の一時的なものであり、コミットしない。確認後に設計AIが `git restore js/scenes/TitleScene.js` で元に戻す。**

## 3. 対象ファイル
* `./js/scenes/TitleScene.js` : 更新（一時的）

## 4. 詳細作業内容
* **作業内容**: 
  * import 追加（`CanvasCache`、確かめ用スプライト）、定数追加、`init` への焼き付け作成、`destroy` 追加、`drawCurveCheck` メソッド追加と `draw` からの呼び出し。
  * 検証: 構文チェック問題なし、`node --test` は 159 pass / fail 0。

## 5. 開発資料の更新予定
* **該当なし**： 一時的な変更のため。

## 6. 懸念事項・要確認ポイント
* 目視確認は未実施（発注者が (a)・(b) の形の違い、上辺・左辺の曲線、線の端・角の欠け、コンソールの警告・エラーを確認する）。
* ラベルの y = 288 は画像の下端（280）に近く、描画の上端（約 295.5）と文字が近接する可能性がある。
* 【関連する責務】と実コードの相違は特になし。
