# RES: 作業レポート Interrupt : エディタの復元用データを外したスプライトの表示の確認
* 参照元REQ: `./_log/req/261125_2354_Interrupt_エディタの復元用データを外したスプライトの表示の確認.md`

## 1. 作業目的
OZ Vector Editor が復元用データ（`source`、`elements` の `id`）を外して書き出した確かめ用スプライトを、タイトル画面に (a) `draw(ctx)` 直接と (b) `CanvasCache` 焼き付けの2通りで並べて表示し、見た目に問題がないかを発注者が確認できるようにする。

## 2. 実装内容
* **この変更は確認用の一時的なものである。コミットせず、確認後に設計AIが `git restore js/scenes/TitleScene.js` で元に戻す。**
* `TitleScene.js` に確認用スプライトを import し、`init` で焼き付けを作り、新設の `destroy` で手放す。`draw` の ui レイヤーで、ボタンの後に `drawCheck` で (a) 原点 (320, 410)、(b) 原点 (960, 410) に、ラベル（y = 310、`24px sans-serif`）とともに描く。`translate` のみ使用（`scale`・`rotate` なし）。

## 3. 対象ファイル
* `./js/scenes/TitleScene.js` : 更新（一時的。コミットしない）

## 4. 詳細作業内容
* **作業内容**:
  * `CanvasCache` を `oz` から、確認用スプライトを `../../_doc/BRIDGE_FROM_VECTOREDITOR_no_source_check.js`（既定の export）から import。
  * 定数 `CHECK_*` を追加。`init` で `super.init()` の後に `CanvasCache.create(checkSprite, { bounds: checkSprite.bounds })`。
  * `destroy()` を追加（`super.destroy()` の後に `dispose()`）。`drawCheck(ctx)` を追加し `draw` から呼ぶ。
  * 検証: 構文チェック問題なし、`node --test` は 514 件 pass、`fail 0`。
  * 責務の記述と実コードの相違なし。ブラウザでの目視は未実施（発注者の確認待ち）。

## 5. 開発資料の更新予定
* 該当なし

## 6. 懸念事項・要確認ポイント
* テストプレイで見てもらう6点（結果は未確認。発注者の確認後に記入）:
  1. (a)・(b) とも図形10個そろって表示されるか：未確認
  2. (a) と (b) で形に違いがないか：未確認
  3. (b) の端の欠け（左上の直線の端、右下の五角形の右の角と下の辺）：未確認
  4. 赤い図形が出ていないか：未確認
  5. 機体がタイトル・プレイ画面とも従来どおり出るか：未確認
  6. コンソールの警告・エラー：未確認
* 設計への申し送り: 上記6点の結果を発注者から聞いて追記する。
