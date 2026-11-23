# RES: 作業レポート Interrupt : エディタの版4の変形したスプライトの表示の確認
* 参照元REQ: `./_log/req/261122_2134_Interrupt_エディタの版4の変形したスプライトの表示の確認.md`

## 1. 作業目的
エディタの書き出し形式 版4の確かめ用スプライトを、タイトル画面に (a) `draw(ctx)` 直接と (b) `CanvasCache` 焼き付けの2通りで並べて表示し、目視確認できるようにする。

## 2. 実装内容
* `TitleScene.js` に確かめ用スプライトの import、`init` での焼き付け作成、`ui` レイヤーでの (a)・(b) の描画、`destroy` での `dispose()` を追加した。
* **この変更は確認用の一時的なものである。コミットせず、確認後に設計AIが `git restore` で元に戻す。**

## 3. 対象ファイル
* `./js/scenes/TitleScene.js` : 更新（一時的。コミットしない）

## 4. 詳細作業内容
* **作業内容**:
  * `CanvasCache` を `oz` から、確かめ用スプライトを `../../_doc/BRIDGE_FROM_VECTOREDITOR_transform_check.js` から import。
  * `init` で `super.init()` の後に `CanvasCache.create(sprite, { bounds: sprite.bounds })`（倍率は既定の 1）を作成。
  * `draw` の末尾で `drawCheck` を呼ぶ。(a) は (320, 400)、(b) は (960, 400) へ `ctx.translate` だけで置いて描く（scale・rotate なし）。各位置の上 (y = 290) に `drawText` で `(a) draw`・`(b) CanvasCache` を 24px で描く。
  * `destroy` を追加し、`super.destroy()` のあと焼き付けを `dispose()`。
  * 検証: 構文チェック OK、`node --test` は pass 514 / fail 0。ブラウザでの目視は未実施。

## 5. 開発資料の更新予定
* 該当なし

## 6. 懸念事項・要確認ポイント
* 実コードと【関連する責務】の相違はなし。
* ラベルの y = 290 は、スプライトの上端（約 y = 298）に近い。重なって見える場合は目視で確認してほしい。
* (a)・(b) の形の違い、(b) の欠け（傾いた楕円の上・左の辺、線の端、鋭い角の先）、コンソールの警告・エラーは、発注者の目視確認待ち。
