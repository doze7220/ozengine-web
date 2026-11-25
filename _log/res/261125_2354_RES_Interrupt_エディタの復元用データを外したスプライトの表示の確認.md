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
  * 責務の記述と実コードの相違なし。ブラウザでの目視は発注者がテストプレイで行った（結果は6章）。

## 5. 開発資料の更新予定
* 該当なし

## 6. 懸念事項・要確認ポイント
* テストプレイの結果（2026-11-25、発注者が1点ずつ確認。6点とも問題なし）:
  1. (a)・(b) とも図形10個そろって表示されるか：そろっている
  2. (a) と (b) で形に違いがないか：違いなし
  3. (b) の端の欠け（左上の直線の端、右下の五角形の右の角と下の辺）：欠けなし
  4. 赤い図形が出ていないか：出ていない
  5. 機体がタイトル・プレイ画面とも従来どおり出るか：今までどおり
  6. コンソールの警告・エラー：出ていない
* 設計への申し送り: 上記6点の結果をエディタへの返信に使う。REQの前提と食い違った点はない。
