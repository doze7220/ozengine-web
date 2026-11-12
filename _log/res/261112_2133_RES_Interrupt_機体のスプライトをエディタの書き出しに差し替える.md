# RES: 作業レポート Interrupt : 機体のスプライトをエディタの書き出しに差し替える
* 参照元REQ: `./_log/req/261112_2133_Interrupt_機体のスプライトをエディタの書き出しに差し替える.md`

## 1. 作業目的
手書きのつなぎのスプライト `assets/sprites/ship.js` を、OZ Vector Editor の書き出しファイルに差し替える。

## 2. 実装内容
* 原因: エディタが塗りと線なしに対応し、手書きと同じ絵を書き出せるようになったため。
* 修正方針: `_doc/BRIDGE_FROM_VECTOREDITOR_ship.js` を複写コマンドで CRLF に変換して `ship.js` に置き換える。中身は手で編集しない。

## 3. 対象ファイル
* `./assets/sprites/ship.js` : 更新（中身の全体を置き換え）

## 4. 詳細作業内容
* **作業内容**:
  * 着手前に、手書き `ship.js` が【関連する責務】の記述（手書きのつなぎ、既定exportの `draw(ctx)`）と矛盾しないことを確認した。
  * 差し替えコマンド: `sed 's/$/\r/' _doc/BRIDGE_FROM_VECTOREDITOR_ship.js > assets/sprites/ship.js`
    （書き出しファイルは LF、末尾は改行で終わることを `tail -c 20 | od -c` で確認済み。BOM なし：先頭は `/ * *`）
  * 確認1（CR除去後のバイト一致）: `tr -d '\r' < assets/sprites/ship.js | cmp - _doc/BRIDGE_FROM_VECTOREDITOR_ship.js && echo MATCH` → `MATCH`
  * 確認2（改行コード）: `tr -cd '\r' < ship.js | wc -c` = 267、`tr -cd '\n' < ship.js | wc -c` = 267。
    `node -e` で `/(?<!\r)\n/g`（CRなしのLF）と `/\r(?!\n)/g`（単独CR）を数え、`bareLF 0 bareCR 0`。CRLFのみ。
    （Git Bash の `grep -c $'\r$'` は CR を無視して数えが不正確だったため、上記の方法を採用した）
  * 確認3（構文）: `node --input-type=module --check < assets/sprites/ship.js && echo SYNTAX_OK` → `SYNTAX_OK`
  * `node --test` と表示確認は REQ により設計AI側の作業のため実行していない。

## 5. 開発資料の更新予定
* **`assets/sprites/*.js` の責務（PROJECT_ARCHITECTURE.md 4章の表）**： 「現在の `ship.js` は手書きのつなぎ…差し替える」の記述を、差し替え済みの内容に直す（設計AIが実施）。

## 6. 懸念事項・要確認ポイント
* 特になし（機体の見た目は設計AI・発注者が確認する）。
