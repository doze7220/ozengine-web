# RES: 作業レポート Interrupt : Phase 02-03 スプライトの規約の改訂
* 参照元REQ: `./_log/req/261109_1717_Interrupt_Phase02-03_スプライトの規約の改訂.md`

## 1. 作業目的
Phase 02-01・02-02 のエディタとの往復の結果を受け、スプライトJSの規約（開発資料 2.1章ほか）をエンジン側の約束だけを書いた形に改訂し、エディタとの連絡に使った一時ファイルを片付ける。ソースコード（`.js`）の変更はない。

## 2. 実装内容
旧形式（名前付きの `format`、`draw(ctx, t, opts)`、`source`）の記述が実態（既定の export の `draw(ctx)`）と食い違っていたため、2.1章を書き直した。形式の定義はエディタ側 `PROJECT_ARCHITECTURE.md` 2章への参照とし、書き写していない。事前の確認で、【関連する責務】の記述と `ship.js`・`FlightScene.js`・`_doc/bridge_samples/ship.js`・エディタ側の項・`PROJECT_MILESTONE.md` に矛盾はなかった。

## 3. 対象ファイル
* `./PROJECT_ARCHITECTURE.md` : 更新（2.1章、4章の `assets/sprites/*.js` の行）
* `./PROJECT_CONSTITUTION.md` : 更新（3章「生成物の手編集禁止」の1項目）
* `./_doc/PROJECT_MILESTONE.md` : 更新（完了5項目の削除、「アニメーション」項の1文の置き換え）
* `./_doc/BRIDGE_FROM_VECTOREDITOR.md` : 削除（`git rm`）
* `./_doc/bridge_samples/ship.js`・`ship.json` : 削除（`git rm`）

## 4. 詳細作業内容
* **作業内容**:
  * 要件1: 2.1章の export の表を削除し、エディタ側の参照、エンジン側の約束（箇条書き6点）、つなぎのスプライト、組み立て用のJS（`_`）の扱いを書いた。
  * 要件2: 4章の `assets/sprites/*.js` の行の2列を指示の趣旨に書き換えた。
  * 要件3: 憲法3章の該当項目を、指定の文面に置き換えた。
  * 要件4: `PROJECT_ARCHITECTURE.md` を `format`・予約・`opts`・`draw(ctx, t` で検索し、2.1章・4章以外に旧形式を前提とした記述は見つからなかった。
  * 要件5: `_doc/BRIDGE_FROM_VECTOREDITOR.md` と `_doc/bridge_samples/` を `git rm` で削除した（コミットなし）。
  * 要件6: 「P2：OZ Vector Editor との結合」節から完了の5項目を削除し（見出しと「土台の機体は…」の項は残した）、「アニメーション」項の指定の1文を置き換えた。

## 5. 開発資料の更新予定
* **スプライトJSの規約（`PROJECT_ARCHITECTURE.md` 2.1章）**： 本作業で反映済み。形式はエディタ側の定義を参照し、エンジン側の約束と組み立て用のJSの扱いだけを記載した。
* **`assets/sprites/*.js`（同4章の行）**： 本作業で反映済み。つなぎのスプライトとしての現状と、組み立て用のJSの `import` の例外を記載した。

## 6. 懸念事項・要確認ポイント
* 特になし（2.1章・4章以外に旧形式を前提とした記述は残っていない）。
