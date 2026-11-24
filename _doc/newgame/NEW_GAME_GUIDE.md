# 新規プロジェクトの手順書（NEW_GAME_GUIDE）

## 1. この手順書について

### 目的
OZ Engine のリポジトリ（GitHub `doze7220/ozengine-web`、ローカル `D:\ozlab\ozengine-web`）から、新しいゲームのプロジェクトを作る手順を書いた資料である。ゲームのプロジェクトは、テンプレートリポジトリ `doze7220/template-app` から作り、OZ Engine のリポジトリの `index.html`・`oz/`・`js/`・`assets/` をコピーして土台にする。

### 読む人
*   発注者（コードを読まない人）。エクスプローラーでのコピーや、Git Bash でのコマンドの実行を行う。
*   Claude Code（ゲームのプロジェクトで立ち上げを先導する AI）。設定ファイルの配置や、ファイルの削除などを行う。

各手順は「誰が（発注者／Claude Code）」「何をする」「期待する結果」の形で書く。

### この手順書と付属ファイル
この手順書は `_doc/newgame/` にある次の3ファイルの1つである。

| ファイル | 役割 | 使い方 |
| --- | --- | --- |
| `NEW_GAME_GUIDE.md`（この手順書） | 新規プロジェクトの作り方、Claude Code の設定の説明、`oz/` の確かめ方、エンジンの更新、すでに作ったゲームへの土台の仕組みの取り込み、連絡票 | 上から順に読んで進める |
| `GAME_RULES.md` | ゲームの憲法（`PROJECT_CONSTITUTION.md`）に貼り付けるルールの文面 | 立ち上げの Step 2 で、囲みの中だけを貼る（8章） |
| `settings.example.json` | ゲームのプロジェクトの `.claude/settings.json` に入れる設定例 | 中身を `.claude/settings.json` に入れる（4章） |

3ファイルを、フォルダごとゲームのプロジェクトにコピーしてはならない。ルールの文面は憲法に貼り付け、設定例は中身を `.claude/settings.json` に入れる。手順書はゲームのプロジェクトに置かず、OZ Engine のリポジトリのものを読む。

### 用語と書き方
*   **OZ Engine のリポジトリ:** GitHub `doze7220/ozengine-web`、ローカル `D:\ozlab\ozengine-web`。エンジン（`oz/`）と土台のコード（`index.html`・`js/`・`assets/`）の元である。
*   **ゲームのプロジェクト:** これから作る新しいゲームのリポジトリ。
*   **`<ゲーム名>`:** ゲームの表示用の名前（例 画面のタイトルに出す名前）。
*   **`<ゲームのフォルダ>`:** ゲームのプロジェクトのフォルダ（クローンしたフォルダ）。
*   **`<GAMENAME>`:** 連絡票のファイル名に使う英大文字の名前（例 `VANGUARDRIFTER`）。10章で使う。
*   **Git Bash:** Git for Windows に入っているコマンド入力の画面。この手順書のコマンドは、すべて Git Bash で実行する（PowerShell ではない）。開き方は、エクスプローラーで対象のフォルダを右クリック →「その他のオプションを確認」→「Open Git Bash here」。開いたフォルダがコマンドの実行場所になる。
*   コマンドの文字列は、そのまま貼り付けて動く形で書いてある。1文字も変えずに貼り付けること。

## 2. 全体の流れ（立ち上げ手順との対応）

`template-app` の `_doc/INITIAL_PROJECT_STARTUP.md` は、Step 0（人間の準備）から Step 5 以降（立ち上げの後の開発）までの立ち上げ手順である。この手順書は、その Step 0 を OZ Engine 用に具体化し、Step 2〜4 で行うことと、Step 5 以降で行うことを足す。

### 章と立ち上げ手順の対応

| 章 | 内容 | `template-app` の立ち上げ手順との対応 |
| --- | --- | --- |
| 1 | この手順書について | - |
| 2 | 全体の流れ（立ち上げ手順との対応） | 全体 |
| 3 | 準備とコピー | Step 0（準備） |
| 4 | Claude Code の設定（`.claude/settings.json`） | Step 0 |
| 5 | `oz/` の確かめ方（版と指紋の照合） | Step 0、エンジンの更新のたび |
| 6 | 目印の付いたコードと見本の素材を消す | Step 0 |
| 7 | ゲームごとに変える箇所と起動の確認 | Step 0 |
| 8 | 憲法と開発資料にエンジンについて書く | Step 2・Step 3・Step 4 |
| 9 | エンジンの更新（`oz/` の置き換え）と土台の仕組みの取り込み | Step 5 以降 |
| 10 | エンジンの不足を伝える（連絡票） | Step 5 以降 |

### Step 0 の進め方
`template-app` の Step 0 は人間の準備である。OZ Engine では、次の順で進める。

| 順 | 誰が | 何をする | 章 |
| --- | --- | --- | --- |
| 1 | 発注者 | リポジトリの作成とクローン | 3章 |
| 2 | 発注者 | OZ Engine のリポジトリの4つ（`index.html`・`oz/`・`js/`・`assets/`）のコピー（エクスプローラー） | 3章 |
| 3 | 発注者 | Claude Code をゲームのフォルダ（リポジトリのルート）で開き、この手順書で Step 0 の残りを進めるよう伝える | 3章 |
| 4 | Claude Code | `.claude/settings.json` の設定（最初に行い、以後の作業で `oz/src/` を読まないようにする） | 4章 |
| 5 | 発注者 | 版と指紋の照合 | 5章 |
| 6 | Claude Code | 目印の付いたコードと見本の素材の削除 | 6章 |
| 7 | Claude Code と発注者 | Claude Code: ゲームごとに変える箇所を変える。発注者: 起動の確認と、設定が効くことの確認 | 7章・4章 |
| 8 | 発注者 | 「新プロジェクト立ち上げの対話を開始して」と伝え、`template-app` の手順どおり Step 1 から進める。Step 2〜4 では8章を行う | 8章 |

## 3. 準備とコピー

### 3-1. 用意するもの（発注者）
*   GitHub のアカウント。
*   Git for Windows（Git Bash が入っている）。
*   Claude Code。
*   静的サーバ（ふだん使っているもの。ゲームの起動の確認に使う）。`file://` で `index.html` を開いても動かない。

### 3-2. リポジトリの作成とクローン（発注者）
1.  ブラウザで GitHub の `doze7220/template-app` を開き、「Use this template」→「Create a new repository」を選ぶ。
2.  リポジトリの名前を決めて作成する。
3.  作成したリポジトリを、`<ゲームのフォルダ>` にクローンする（Git Bash で `git clone <作成したリポジトリの URL> <ゲームのフォルダ>`）。

期待する結果: `<ゲームのフォルダ>` ができ、`template-app` のファイルが入っている。

### 3-3. OZ Engine のリポジトリの4つのコピー（発注者）
エクスプローラーで、`D:\ozlab\ozengine-web` から次の4つを `<ゲームのフォルダ>` の直下へコピーする。

| コピーするもの | 種類 |
| --- | --- |
| `index.html` | ファイル |
| `oz` | フォルダ（エンジン本体） |
| `js` | フォルダ（土台のコード） |
| `assets` | フォルダ（土台の素材） |

次のものは**コピーしない**。

*   `test/`（OZ Engine のリポジトリの自動テスト）
*   `_doc/`、`_log/`（OZ Engine のリポジトリの資料と記録）
*   `.claude/`（OZ Engine のリポジトリの Claude Code の設定）
*   OZ Engine のリポジトリの `CLAUDE.md`、`PROJECT_CONSTITUTION.md`、`PROJECT_ARCHITECTURE.md`、`README.md`（ゲームのプロジェクトのものは、立ち上げの Step 2〜3 で `template-app` の手順どおり作る）
*   `.git/`（隠しフォルダ。ゲームのプロジェクトのものを使う）

`template-app` には `index.html`・`oz/`・`js/`・`assets/` のどれも無いので、コピーのときに「同じ名前がある」という確認は出ないのが正しい（期待する結果）。確認が出たら、コピー先を間違えている疑いがある。そこで止めて、コピー先が `<ゲームのフォルダ>` であることを確かめる。

### 3-4. コピーの後のフォルダの形（期待する結果）
`<ゲームのフォルダ>` の直下に、次のものがある。

```
<ゲームのフォルダ>/
├── index.html
├── oz/
│   ├── ENGINE_API.md
│   ├── FINGERPRINTS.txt
│   ├── VERSION
│   ├── index.js
│   └── src/
├── js/
│   ├── main.js
│   ├── names.js
│   ├── effect/
│   ├── entities/
│   ├── scenes/
│   └── ui/
├── assets/
│   ├── images/
│   ├── sounds/
│   └── sprites/
└── （template-app のファイル）
```

`template-app` 由来の `_doc/`・`_log/`・`.claude/`（agents・skills のみ）・`CLAUDE.md` などがあるのは正しい。次の場合は、OZ Engine のリポジトリのものまでコピーしている、または必要なものが足りない。`test/` や `_doc/newgame/` が見つかる場合と、`oz/` の中に `FINGERPRINTS.txt` が無い場合である。やり直すこと。

### 3-5. Claude Code にゲームのフォルダで Step 0 の残りを頼む（発注者）
1.  Claude Code を、`<ゲームのフォルダ>`（リポジトリのルート）で開く。ルート以外で開くと、4章の設定が効かない。
2.  Claude Code に、次のように伝える。

    > `D:\ozlab\ozengine-web\_doc\newgame\NEW_GAME_GUIDE.md` の手順で Step 0 の残りを進めて。

3.  この手順書はゲームのフォルダの外にあるため、Claude Code が読むときに許可を求める。許可してよい。

期待する結果: Claude Code が手順書を読み、4章の `.claude/settings.json` の設定から始める。

## 4. Claude Code の設定（`.claude/settings.json`）

### この設定の目的
ゲームのプロジェクトで、Claude Code が `oz/src/`（エンジンの内部のコード）を読まないようにし、`oz/` を書き換えないようにする。エンジンについて知るための資料は `oz/ENGINE_API.md` だけにして、内部の作りに頼ったゲームのコードが書かれないようにする。

### 設定の内容（Claude Code が配置する）
`D:\ozlab\ozengine-web\_doc\newgame\settings.example.json` の中身を、ゲームのプロジェクトの `.claude/settings.json` に入れる。中身は次のとおりである。

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "deny": [
      "Read(/oz/src/**)",
      "Edit(/oz/**)"
    ]
  }
}
```

*   `Read(/oz/src/**)`: ルートの `oz/src/` 以下のファイルを読むことを拒否する。同じパスへの書き込みも止まる。
*   `Edit(/oz/**)`: ルートの `oz/` 以下のファイルの編集と作成を拒否する（`ENGINE_API.md`・`FINGERPRINTS.txt`・`VERSION` を含む）。Write など、ファイルを編集する Claude Code の組み込みのツールにも効く。
*   `oz/ENGINE_API.md` は読める必要があるので、`Read(/oz/**)` にはしない。
*   先頭の `/` は、Claude Code を起動したフォルダ（リポジトリのルート）からのパスの意味で、ルートの `oz/` だけに効く。`oz/src/**` のように `/` を付けないと、どの深さの `oz/src/` にも一致してしまう。
*   `$schema` の行は、エディタでの補完と確認のためのもので、無くても動く。
*   JSON にコメントは書けないので、説明はこの手順書に書く。

### 配置の手順
1.  Claude Code が、`.claude/settings.json` が無いことを確かめ、無ければ `settings.example.json` の中身をそのまま `.claude/settings.json` にする（フォルダ `.claude/` が無ければ作る）。
2.  既に `.claude/settings.json` がある場合は、上書きせず、`permissions.deny` の配列に2つの規則（`Read(/oz/src/**)`・`Edit(/oz/**)`）を足す。`permissions` や `deny` が無ければ作る。ほかの設定は消さない。
3.  `.claude/settings.json` を書くときに Claude Code が確認を求めたら、許可してよい。

期待する結果: `.claude/settings.json` に2つの規則が入っている。Claude Code のコマンド `/permissions` で、2つの deny の規則が見られる。

### 設定が効くまで
*   設定ファイルの変更は、実行中のセッションにも、再起動なしですぐ反映される。`deny` の規則は、フォルダの信頼の確認を待たずに効く。
*   `.claude/settings.json` は、Claude Code を起動したフォルダから読まれる。必ずゲームのフォルダのルートで Claude Code を起動すること。

### この設定で防げない経路と対策
この設定は、ファイルを読む・編集する Claude Code の組み込みのツールと、ファイル名を書いた `cat`・`head`・`tail`・`sed`・`tee` のようなコマンドやリダイレクトに効く。次のような経路には効かない場合がある。

*   ファイル名を書かずに読むシェルのコマンド（例 `oz/src/` の中から実行する `grep -r pattern .`）。
*   中でファイルを開くスクリプト（Python、Node.js など）。
*   PowerShell のコマンド。
*   `rm`・`mv`・`cp` など、シェルのコマンドによる `oz/` の書き換え。

対策は次の2つとする。

1.  **ルールの文面での禁止:** `GAME_RULES.md` の必須の規則で、シェルのコマンドやスクリプトでも `oz/src/` を読むこと・`oz/` を書き換えることを禁止している（8章で憲法に貼り付ける）。
2.  **事後の発見:** `oz/` が書き換えられたら、5章の指紋の照合と、`git status` に `oz/` の変更が出ることで見つける。

シェルのコマンドを個別に拒否する規則（`Bash(...)` の deny）は、書き方を変えれば通ってしまうので、足さない。OS の段階で防げる sandbox（Claude Code の機能）もあるが、設定が大きくなるので本手順では使わない。強く防ぎたい場合の選択肢として挙げておく。

### 設定が効いていることの確かめ方（発注者のテストプレイ）
設定を置いた後の Claude Code のセッションで、次の3つを頼む。7章の起動の確認と同じ機会に行ってよい。

| 順 | Claude Code に伝えること | 期待する結果 |
| --- | --- | --- |
| 1 | 「`oz/src/Engine.js` を Read ツールで開いてみて（確認のため。中身は表示しなくてよい）」 | 拒否される |
| 2 | 「`oz/ENGINE_API.md` の1行目を読んで」 | 読める |
| 3 | 「`oz/VERSION` の末尾に空行を1行足してみて（確認のため）」 | 拒否される |

確認が終わったら、5章の照合を行い、`OK` になることを確かめる（3で拒否されていれば、`oz/` は変わっていない）。期待どおりにならないとき（1や3が通ってしまう、2が読めない）は、`.claude/settings.json` の内容と、Claude Code を起動したフォルダがルートであることを確かめる。

## 5. `oz/` の確かめ方（版と指紋の照合）

### 5-1. 何を確かめるか
ゲームのプロジェクトの `oz/` が、OZ Engine のリポジトリの `oz/` と同じで、書き換えられていないことを確かめる。確かめ方は2つある。

*   **版:** `oz/VERSION`（1行の版番号）を読む。
*   **指紋:** `oz/FINGERPRINTS.txt` は、`oz/` の各ファイルの指紋（SHA-256）の一覧である。この一覧と、実際の `oz/` の中身を比べる。

### 5-2. 版の確かめ方（発注者）
1.  ゲームのプロジェクトの `oz/VERSION` を、メモ帳などで開いて読む（現在は `0.1.0`）。
2.  OZ Engine のリポジトリの `D:\ozlab\ozengine-web\oz\VERSION` と同じであることを確かめる。
3.  初回コミットと、エンジンの更新のコミットのメッセージに、版を書く（例 `OZ Engine 0.1.0 を取り込む`）。

版番号は `oz/` を変えるたびに上がるとは限らない。そのため、中身が OZ Engine のリポジトリの最新と同じかどうかは、版ではなく指紋の一覧どうしの比較で確かめる（9章）。

### 5-3. 指紋の照合のコマンド（発注者が実行する）
ゲームのフォルダのルートで Git Bash を開き（開き方は1章）、次の1行を貼り付けて実行する。

```bash
(cd oz && find . -type f ! -path ./FINGERPRINTS.txt | sed 's|^\./||' | LC_ALL=C sort | while IFS= read -r f; do printf '%s  %s\n' "$(tr -d '\r' < "$f" | sha256sum | cut -c1-64)" "$f"; done | diff <(tr -d '\r' < FINGERPRINTS.txt) -) && echo "OK: oz/ matches FINGERPRINTS.txt" || echo "NG: oz/ does not match FINGERPRINTS.txt"
```

*   `OK: oz/ matches FINGERPRINTS.txt` と出れば、`oz/` は一覧のとおりで、改変されていない。
*   `NG: oz/ does not match FINGERPRINTS.txt` と出れば、一致していない。その上に差分の行が出る。
*   使う道具は `find`・`sed`・`sort`・`tr`・`sha256sum`・`cut`・`diff` で、すべて Git Bash に入っている。Node.js は要らない。メッセージは文字化けを避けるため英語にしている。

### 5-4. 結果の読み方
`NG` のとき、差分の行の行頭を見る。

*   `<` の行は、一覧（`FINGERPRINTS.txt`）に書かれた内容である。
*   `>` の行は、実際の `oz/` の内容である。

| 差分の出方 | 意味 |
| --- | --- |
| 同じパスが `<` と `>` の両方に出る | そのファイルが改変された |
| `<` だけに出る | そのファイルが削除された |
| `>` だけに出る | 一覧に無いファイルが追加された |

### 5-5. 照合が失敗したときの意味と対処
意味は次のどちらかである。

*   `oz/` が改変された。
*   `oz/` の中身と一覧の版が合っていない（一部のファイルだけが古い、または新しい）。

対処は、OZ Engine のリポジトリの `oz/` で置き換え直すことである（9章の置き換えの手順）。ゲームのプロジェクトで、`oz/` の中身や一覧を直してはならない。

*   心当たりのない追加のファイル（エクスプローラーが作る `desktop.ini`・`Thumbs.db` など）が `>` に出たら、そのファイルを消せば一致する。
*   BOM を付ける、文字コードを変換する、といった保存をするエディタで `oz/` のファイルを開いて保存すると失敗する。そのときは置き換え直す。

### 5-6. 改行コードの扱い
指紋を求めるとき、ファイルの中身から CR（改行コードの一部、`\r`）をすべて取り除いてから計算する。一覧を読むときも、CR を取り除いてから比べる。

*   Windows の Git は、ファイルの改行を LF と CRLF の間で自動で変えることがある（`core.autocrlf`）。コピーやクローンで改行が変わっても、同じ指紋になるので、改変していないのに照合が失敗することはない。
*   見逃すのは、CR だけを足した・消した変更だけである。改行コードの違いはブラウザでの動作に影響しないので、許容している。
*   CR 以外の変更（1文字の書き換え、BOM の付加、文字コードの変換など）は、すべて検出する。

### 5-7. ゲームのリポジトリでの補助の目印
ふだんは `git status` に `oz/` の変更が出ないことも、改変されていない目印になる。エンジンの更新（9章）のとき以外に `oz/` の変更が出たら、照合を行う。

### 5-8. 照合を行う時期
*   Step 0 の、`oz/` のコピーの後（手順の順5）。
*   エンジンの更新のたび（9章）。
*   `git status` に `oz/` の変更が出たとき。
*   4章の設定が効いていることの確認の後。

### 5-9. 照合を発注者が行う理由
照合のコマンドは、`oz/src/` のファイルの中身を（指紋を求めるために）開く。ゲームのプロジェクトでは、4章の設定で Claude Code が `oz/src/` を読むことを拒否し、`GAME_RULES.md` の規則で、AI が `oz/src/` を開くコマンドを実行することを禁止している。そのため、照合は Claude Code ではなく、発注者が Git Bash で実行する。Claude Code は、結果を発注者から聞く。

## 6. 目印の付いたコードと見本の素材を消す

担当は Claude Code である（手順の順6）。土台の `js/` と `assets/` には、新規プロジェクトで消す前提の見本のコードと素材が入っている。これを消して、見本の無い最小の状態（boot 画面のあと、空のシーンに進むだけ）にする。

### 6-1. 目印の書き方
消す前提のコードには、次の目印が付いている。

*   **ファイル全体が見本:** ファイルの先頭の責務定義の直後に `/* ozengine sample */` と書いてある。このファイルは丸ごと消す。
*   **ファイルの一部が見本:** `/* ozengine sample: begin */` と `/* ozengine sample: end */` で囲んである。囲んだ範囲（目印の行を含む）を消す。

目印の付いた部分をすべて消しても、エラーなく起動できるように作ってある。

### 6-2. 目印を消すコマンド（Claude Code が実行する）
`<ゲームのフォルダ>`（ルート）で、Git Bash のコマンドとして、次の順に実行する。`grep`・`xargs`・`sed` は Git for Windows に入っているので、追加の道具は要らない。1文字も変えずに実行すること。

**1. 確認:** 目印の一覧を見る。

```bash
grep -rn "ozengine sample" index.html js assets
```

期待する結果: 目印の付いた行が一覧で出る。

**2. ファイル全体の目印のファイルを削除する。**

```bash
grep -rlZF '/* ozengine sample */' js assets | xargs -0 -r rm --
```

期待する結果: 何も表示されない。ファイル全体の目印のファイルが消える。

**3. 範囲の目印を、目印の行ごと削除する。**

```bash
grep -rlZF 'ozengine sample: begin' js assets | xargs -0 -r sed -i '/ozengine sample: begin/,/ozengine sample: end/d'
```

期待する結果: 何も表示されない。範囲の目印のあるファイル（現在の土台では `js/main.js`・`js/names.js`・`js/scenes/BootScene.js` の3つ）から、目印で囲んだ範囲が消える。

**4. 確認:** 目印が残っていないことを確かめる。

```bash
grep -rn "ozengine sample" index.html js assets
```

期待する結果: 何も表示されない（Git Bash で直後に `echo $?` を実行すると `1`）。何か表示されたら、目印が残っている。その行を見て、原因を調べる（手順2・3を飛ばしていないか、目印の書き方が違わないか）。

補足:
*   手順2・3の `-r`（`xargs` の入力が空なら実行しない）は、目印がすでに無いときに、`rm`・`sed` が空の引数でエラーにならないようにするためである。
*   手順2の `/* ozengine sample */` は固定の文字列で、範囲の目印（`/* ozengine sample: begin */`）には一致しない。
*   空になったフォルダ（`js/effect/`・`js/entities/`）は残してよい。git は空のフォルダを記録しない。
*   現在の土台では、手順を終えると `js/` には次の8ファイルが残る。期待する結果: `js/main.js`、`js/names.js`、`js/scenes/BootScene.js`、`js/scenes/MenuScene.js`、`js/scenes/WindowScene.js`、`js/scenes/devPanel.js`、`js/ui/virtualPadConfig.js`、`js/ui/virtualPadView.js`（`find js -type f` で8つだけ出る）。これらは起動（`main.js`）、名前の置き場所（`names.js`）、boot 画面（最初の入力を受ける画面）、バーチャルパッド（画面のスティックとボタン）、メニューの仕組み、窓を置くシーン、開発用パネルの雛形で、ファイル全体の目印が付いていない（`main.js` の見本の画面、`names.js` の見本の名前、`BootScene.js` の押した瞬間の SE の部分は、範囲の目印が付いていたので消える。`names.js` には `LAYER` の `main` と、`KEY` の `left`・`right`・`boost` が残り、`IMAGE`・`SOUND` は空になる）。`js/main.js` の `import` は `'oz'`・`./names.js`・`./scenes/BootScene.js` だけになり、起動に使われるのは `main.js`・`names.js`・`BootScene.js` の3つである。`names.js` は `main.js` が読み込むので、消すと起動しない。残りの5つ（`MenuScene.js`・`WindowScene.js`・`devPanel.js`・`virtualPadConfig.js`・`virtualPadView.js`）は、ゲームが使うまで読み込まれないので、起動には影響しない（`devPanel.js` は `WindowScene.js` を、`WindowScene.js` と `virtualPadView.js` は `virtualPadConfig.js` を、`virtualPadConfig.js` は `names.js` を読み込むが、`MenuScene.js`・`devPanel.js`・`virtualPadView.js` がどこからも読み込まれない）。7章の7-4 に使い方を書いてある。

### 6-3. 見本の素材を消す（Claude Code が行う）
目印を消すと、見本のコードが使っていた素材（画像、音、スプライト）が参照されなくなる。参照されていない素材を、次の順に消す。

1.  参照を調べる:

    ```bash
    grep -rn "assets/" index.html js
    ```

    `index.html` の import map の行（`"assets/": "./assets/"`）は、素材のファイルを指すものではなく、`assets/` で始まる指定を `./assets/` に置き換える設定なので、参照には数えない。それ以外の行が、素材のファイルへの参照である。
2.  素材の一覧を出す:

    ```bash
    find assets -type f
    ```

3.  一覧のうち、手順1で参照されていないファイルを削除する（`rm -- <ファイル>`）。
4.  もう一度、手順1と2を実行して、参照が切れたファイルや、参照されないまま残ったファイルがないことを確かめる。

期待する結果（バーチャルパッドの既定の画像）: `assets/images/vpad/` の画像は、目印の付いていない `js/ui/virtualPadConfig.js` に書かれたパスから参照されている。そのため、手順1の結果にこの画像のパスが出て、「参照されているファイル」と判定され、消されない。この手順そのものは変えなくてよい。

現時点の土台での例:
*   消える4ファイル（目印を消した後に参照が残らない）: `assets/images/sample.png`・`assets/sounds/sample_bgm.mp3`・`assets/sounds/sample_se.mp3`・`assets/sprites/ship.js`。
*   残る4ファイル（`js/ui/virtualPadConfig.js` から参照されている）: `assets/images/vpad/` の `stick_base.svg`・`stick_knob.svg`・`button_boost.svg`・`button_boost_pressed.svg`。

このファイル名は例である。ファイル名には頼らず、いつも「参照されていないファイル」で判断すること。

ゲームの素材の置き場所は、土台と同じ `assets/images/`・`assets/sounds/`・`assets/sprites/` である（空になったフォルダは残してよい）。

### 6-4. 発注者への報告（Claude Code が行う）
削除したファイルの一覧（目印のファイル、範囲を消したファイル、見本の素材）と、手順4の確認の結果を、発注者に見せる。

期待する結果: 発注者が、消えたものを確かめられる。

## 7. ゲームごとに変える箇所と起動の確認

### 7-1. ゲームごとに変える箇所（Claude Code が行う）
立ち上げのときに変えるのは、1か所だけである。

*   `index.html` の `<title>`: `OZ Engine` を `<ゲーム名>` に変える。

`index.html` のそのほか（import map、CSS、canvas）は変えない。エンジンの使い方は `oz/ENGINE_API.md` 2章に書かれたとおりである。

次の箇所も、ゲームごとに変わる。立ち上げでは変えず、ゲームの Phase の REQ で変える。

*   `js/names.js` の名前（レイヤー・画像・音・キー。7-4）。
*   `js/main.js` の解像度（`width`・`height`）。
*   `js/main.js` の `layers`（レイヤーの並び。名前は `js/names.js` の `LAYER` に書く。7-4）。
*   `js/main.js` の boot 画面の次に進む画面（`next`）。
*   boot 画面の表示の内容（`js/scenes/BootScene.js` の文字など）。
*   `js/main.js` の `debug`（開発モードで起動する条件。7-5）。
*   `js/main.js` の `virtualPad`（画面のスティックとボタンを使うか。7-4）。
*   `js/ui/virtualPadConfig.js` のパッドの定義（配置、どのキーを割り当てるか、画像のファイル名、つまみの描画の大きさ。キーの値は `js/names.js` の `KEY` に書く。7-4）。
*   メニューの項目（`js/scenes/MenuScene.js` に渡す項目。7-4）。
*   窓の中身（`js/scenes/WindowScene.js` に渡す、窓を作る関数。7-4）。
*   開発用パネルを開く入口と、パネルに足す部品・タブ（`js/scenes/devPanel.js` を使う。7-4）。

### 7-2. 起動の確認（発注者）
1.  ふだん使っている静的サーバで、`<ゲームのフォルダ>` をルートにして `index.html` を開く。`file://` で開いても動かない（`oz/ENGINE_API.md` 1章）。
2.  ブラウザの開発者ツールのコンソールを開き、エラーが出ていないことを確かめる。
3.  アドレスの末尾に `?debug` を付けて開き直す（例 `http://localhost:8000/?debug`。`?` より前は、使っている静的サーバのアドレス）。

期待する結果: 黒い画面の中央に「TAP SCREEN」と表示される。画面をクリック（スマートフォンではタップ）するか、キー（`Escape` 以外）を押すと、次の画面（6章で目印を消した直後は空のシーンなので、黒い画面）に変わる。コンソールにエラーが出ない。`?debug` を付けて開くと、左上に FPS が出る（最初の約1秒は `FPS: --`）。付けないで開くと、FPS は出ない（7-5）。

### 7-3. 設定が効いていることの確認（発注者）
起動の確認と同じ機会に、4章の「設定が効いていることの確かめ方」の3項目を、Claude Code に頼んで行う。その後、5章の照合を行い、`OK` を確かめる。

エラーが出る、または設定が効かないときは、そこで止めて、原因を調べる（立ち上げの Step 1 に進まない）。

### 7-4. 目印を消した後に残る仕組み（名前の置き場所、boot 画面、バーチャルパッドとメニュー、窓を置くシーン、開発用パネルの雛形）
6章で目印を消した後も、次の仕組みは `js/` に残る。ゲームの Phase の REQ で使い方を指示する（コードを書くのは Claude Code である）。

**名前の置き場所（`js/names.js`）**
*   複数の場所で使う名前を、1か所にまとめて書くファイルである。レイヤーの名前（`LAYER`）、画像の名前（`IMAGE`）、音の名前（`SOUND`）、キーの値（`KEY`）の4つに分かれている。1か所でしか使わない名前と、パス・色・大きさ・文言は書かない（使う側のファイルに書く）。
*   6章で見本を消した後は、`LAYER` に `main`、`KEY` に `left`・`right`・`boost` が残り、`IMAGE` と `SOUND` は空である。`main` は boot 画面が、`left`・`right`・`boost` は `js/ui/virtualPadConfig.js` が使っているので、消さずに残し、ゲームの名前を足していく。
*   ゲームの REQ で「ブーストのキーを〇〇に変える」のように、名前の値を変えるよう指示する → 値は `js/names.js` の1か所だけが直り、その名前を使うすべての場所が変わる。
*   レイヤーを足すときは、名前を `LAYER` に書き、奥から手前への順を `js/main.js` の `layers` に書く（`layers` に無いレイヤーには何も描かれない）。
*   画像と音を足すときは、名前を `IMAGE`・`SOUND` に書き、ファイルのパスは、素材を読み込む（ロードする）側のファイルに書く。
*   注意: 綴りを間違えて、無い名前を書く（例 `LAYER.mian`）と、書いた所ではエラーにならず、`undefined`（値が無い）になる。描かれない、鳴らない、キーが効かない、名前を渡した先で別のエラーが出る、といった形で表れる。そうなったときは、名前の綴りを確かめるよう Claude Code に伝える。

**boot 画面（`js/scenes/BootScene.js`）**
*   最初の入力（画面に触れる、クリック、キー）を受けて、音を鳴らせる状態にするための画面である。起動すると、黒い画面に「TAP SCREEN」が出て、押す（離す）かキー（`Escape` 以外）を押すと次の画面へ進む。
*   表示の内容（文字、色、フォント）は `BootScene.js` の先頭の値を、次に進む画面は `js/main.js` の `next` を、ゲームの Phase の REQ で「文字を〇〇にする」「次の画面は〇〇にする」と指示して書き換える → 起動したときの画面と、押したあとの画面が変わる。
*   ロードの画面を作るなら、ロード → boot → 本編、または boot → ロード → 本編のどちらの順にもできる。boot 画面で音を鳴らすなら、ロードを先にする。
*   boot 画面を離れたあとは、入力を待たずに BGM を流せる（次の画面の開始で流してよい）。

**バーチャルパッドの ON / OFF（`js/main.js`）**
*   `virtualPad: true`（既定）のまま、スマートフォンなど指で触れる端末で開く → 画面を指で触れたあとに、パッドが定義されたシーンでスティックとボタンが出る。パッドが定義されていないシーン（空のシーンなど）では何も出ない。マウスとキーボードだけの PC では出ない。
*   `virtualPad: true` を `false` に変える → スマートフォンで触れても、スティックとボタンが出ない。既定の画像も読み込まれない。PC の操作は変わらない。
*   パッドを使わないゲームは `false` にしてよい。このときも、下の「使わないゲームでは」に挙げた5つの `.js` と画像は消さずに残してよい。

**パッドの定義と描画を使う（`js/ui/virtualPadConfig.js` と `js/ui/virtualPadView.js`）**
*   `virtualPadConfig.js` には、スティックとボタンの配置、どのキーを割り当てるか、画像のファイル名、つまみの描画の大きさが書かれている（割り当てるキーの値は `js/names.js` の `KEY` に書かれている）。ゲームの REQ で「プレイのシーンでこの定義を使ってパッドを出す」と指示する → そのシーンでパッドが動き、押すとキーボードを押したときと同じ動きになる。
*   `virtualPadView.js` は、画像の読み込みと描画を担う。ロード画面で画像を読み込み、プレイのシーンの描画で呼ぶ、という使い方を REQ で指示する。
*   配置を変えたいとき → REQ に「スティックを右へ寄せる」などと書く。`virtualPadConfig.js` の値が直り、見た目と位置が変わる。
*   キーを変えたいとき → REQ に「ブーストのキーを〇〇に変える」などと書く。`js/names.js` の `KEY` の値が直り、その名前を使うキーボードの操作とパッドの両方が変わる。割り当てるキーを増やすときは、`KEY` に名前を足し、`virtualPadConfig.js` からその名前を使う。

**既定の画像を差し替える**
*   方法A: `assets/images/vpad/` の同じファイル名（`stick_base.svg`・`stick_knob.svg`・`button_boost.svg`・`button_boost_pressed.svg`）で、自分の画像を上書きする → 再読み込みすると、スティックとボタンの見た目が変わる。
*   方法B: `js/ui/virtualPadConfig.js` に書かれたファイル名を、自分の画像のファイル名に書き換える（PNG も使える。画像は `assets/` の下に置き、パスは `./assets/` から始める） → 再読み込みすると、見た目が変わる。画像のパスが `js/ui/virtualPadConfig.js` に書かれていて、そこから参照されるので、6-3 で消されない。
*   どちらの場合も、画像が見つからないとコンソールに警告（`[oz] Assets.load:` で始まる）が出て、エラーにはならず動き続ける。このときスティックやボタンは透明になり、画面に何も見えなくなる。警告が出たら、ファイル名とパスを見直す。

**メニューの仕組み（`js/scenes/MenuScene.js`）**
*   プレイ中に開く、項目が縦に並んだメニューの仕組みである。ゲームの REQ で「このゲームのメニューの項目は〇〇」と指示すると、その項目が並ぶ。
*   土台のメニューの項目（閉じる・開発用パネル・設定・タイトルに戻る。「開発用パネル」は開発モードのときだけ出る）は見本なので、6章で消える。ゲームでは自分の項目を渡して使う。
*   メニューが開いている間は、下のシーンは止まる。項目の外を押しても何も起きない。

**窓を置くシーン（`js/scenes/WindowScene.js`）**
*   窓（`oz/ENGINE_API.md` 26章の UI 部品の窓）を1つ置いて、今の画面の上に積むシーンである。ゲームの REQ で「この窓を開く」と指示すると、その窓が開く。
*   使い方は `openWindow({ layer, createWindow })` である。`layer` には窓を描くレイヤー名を（`js/names.js` の `LAYER` の名前で渡す。例 `LAYER.main`）、`createWindow` には窓を作って返す関数（`Ui.createWindow` で窓を作り、部品を足して返す）を渡す → シーンが積まれて窓が開く。
*   窓の `onClose` で `Engine.popScene()` する → 窓が閉じて、下の画面に戻る。閉じるための関数は別に無い。
*   窓が開いている間は、下のシーンは止まる。
*   背面と同じ配置のパッド（`js/ui/virtualPadConfig.js` の `VIRTUAL_PAD_LAYOUT`）を、このシーンも登録している。登録しないと、背面のパッドの位置を押した指が窓の外の押下になり、外を押すと閉じる窓が閉じてしまうためである（26章「注意」）。背面の配置が違う画面の上に置くときは、REQ でこのシーンを直すよう指示する。`virtualPad: false` のときも、そのまま使える。
*   土台の設定画面と、土台が開発用パネルに足した項目は見本なので、6章で消える。開発用パネルの雛形（`js/scenes/devPanel.js`）は残る。ゲームでは自分の窓を作る関数を渡して使う。
*   UI 部品の既定の大きさは、横長のゲームを縦に持ったスマートフォンでは小さい。26章「既定の大きさ」を見る。

**開発用パネルの雛形（`js/scenes/devPanel.js`）**
*   開発モード（7-5）のときだけ開く、開発用の窓である。開発モードでないときは、開く指示をしても何も起きない。
*   はじめからあるタブ「基本」では、次のことができる。
    *   FPS: 今の値を見る。画面の隅への表示を出す・消す。表示の位置（左上・右上・右下・左下）を変える。
    *   速度: 今の速度を見る。停止・×0.25・×0.5・×1・×2 から選ぶ。
*   「基本」の部品の下に、ゲームの部品（ボタン、数値の表示など。`oz/ENGINE_API.md` 26章のもの）を足せる。「基本」の右に、自分のタブを足せる。ゲームの REQ で「開発用パネルの『基本』に、『敵を消す』のボタンを足す」「タブ『音』を足して、音量を表示する」のように指示する → パネルにその部品とタブが出る。`devPanel.js` は書き換えず、パネルを開く側のコードに書く。
*   6章で見本を消すと、パネルを開く入口（キー、メニューの項目、画面のボタン）は残らない。ゲームの REQ で「プレイの画面で `D` キーか画面のボタンを押すと、開発用パネルが開く。入口は、開発モード（`Engine.debug`）のときだけ働き、表示される」のように、入口と足す項目を指示する → 開発モードで開いたときだけ、入口が使える。
*   注意:
    *   窓を開いている間は、後ろの画面が止まる。変えた速度が動きに表れるのは、窓を閉じた後である。
    *   ヒットストップなどで、速度（`Engine.timeScale`）をゲームが自分で変えるときは、パネルで選んだ速度がゲームの書き込みで上書きされる。
    *   選んだ状態は保存されない。ページを読み込み直すと、はじめの状態に戻る。
    *   後ろの画面のパッドの配置が `VIRTUAL_PAD_LAYOUT` と違うときは、上の「窓を置くシーン」と同じく、REQ で `WindowScene.js` を直すよう指示する。
    *   詳しいことは `js/scenes/devPanel.js` の先頭のコメントに書いてある。REQ を作るときに、Claude Code に読ませる。

**開発用パネルを使うコード例**
*   7-1 まで終えたプロジェクトに、そのまま置いて動く例である。四角が右へ動き続ける画面を1つ作り、`D` キーと画面のボタンの両方から開発用パネルを開く。「基本」に「四角を左端に戻す」のボタンを、自分のタブ「状態」に四角の位置の表示を足す。
*   発注者が、REQ で「手順書 7-4 のコード例のとおりに入れる」と指示し、Claude Code が書く。期待する結果: `?debug` を付けて開き、「TAP SCREEN」の画面を押すと、四角が動き、上の中央に「開発用パネル」のボタンが出て、ボタンか `D` キーでパネルが開く。`?debug` を付けないで開き、同じように画面を押すと、四角だけが動き、ボタンは出ず、`D` キーを押しても何も起きない。
*   シーンの名前（`FirstScene`）、キー（`KeyD`）、ボタンの位置と大きさは例である（画面の大きさは土台の 1280 × 720）。自分のゲームでは、入口と足す部品だけを、ゲームのシーンに同じ形で書く。

1つめ: `js/scenes/FirstScene.js` を新しく作る。

```js
/**
 * 責務: 四角が右へ動き続けるだけの最小の画面と、開発用パネルを開く入口（キーと画面のボタン。開発モードのときだけ）。
 */
import { Engine, Scene } from 'oz';
import { LAYER } from '../names.js';
import { openDevPanel } from './devPanel.js';
import { drawMenuButton } from './MenuScene.js';

/** この画面と、開発用パネルの窓を描くレイヤー名 */
const SCENE_LAYER = LAYER.main;
/** 開発用パネルを開くキー（このファイルだけで使うので names.js に書かない） */
const DEV_PANEL_KEY = 'KeyD';
/** 開発用パネルを開く画面のボタンの矩形（論理座標。上の中央） */
const DEV_PANEL_BUTTON = { x: 500, y: 20, width: 280, height: 88 };
/** 開発用パネルを開く画面のボタンの表示文字 */
const DEV_PANEL_BUTTON_TEXT = '開発用パネル';

/** 四角の一辺の長さ（論理座標） */
const BOX_SIZE = 100;
/** 四角が1ミリ秒に進む距離（論理座標） */
const BOX_SPEED = 0.3;
/** 四角の色 */
const BOX_COLOR = '#3498db';

/** 「基本」に足すボタンの文字 */
const LABEL_RESET = '四角を左端に戻す';
/** 足すタブの名前 */
const LABEL_TAB = '状態';
/** 足すタブの表示の項目名 */
const LABEL_BOX_X = '四角の位置';

/** 四角が右へ動き続ける画面。開発モードのときだけ、キーと画面のボタンから開発用パネルを開ける */
export class FirstScene extends Scene {
  /**
   * @param {{ width: number, height: number }} screen 解像度
   */
  constructor(screen) {
    super();
    /** @type {{ width: number, height: number }} 解像度 */
    this.screen = screen;
    /** @type {number} 四角の左端の x（論理座標） */
    this.boxX = 0;
  }

  /**
   * 開発モードのときだけ、開発用パネルを開く画面のボタンを登録する。
   * @returns {void}
   */
  init() {
    if (Engine.debug) Engine.addButton(this, { ...DEV_PANEL_BUTTON, onPress: () => this.openPanel() });
  }

  /**
   * 四角を右へ進める。右端まで行ったら左端に戻す。
   * @param {number} dt 1ティックの長さ（ミリ秒）
   * @returns {void}
   */
  update(dt) {
    this.boxX = (this.boxX + BOX_SPEED * dt) % this.screen.width;
  }

  /**
   * 開発モードのときだけ、キーで開発用パネルを開く。
   * @param {string} code 押されたキーのコード
   * @returns {void}
   */
  onKeyDown(code) {
    if (Engine.debug && code === DEV_PANEL_KEY) this.openPanel();
  }

  /**
   * 四角と、開発モードのときだけ開発用パネルを開くボタンを描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {string} layer レイヤー名
   * @returns {void}
   */
  draw(ctx, layer) {
    if (layer !== SCENE_LAYER) return;
    ctx.save();
    ctx.fillStyle = BOX_COLOR;
    ctx.fillRect(this.boxX, (this.screen.height - BOX_SIZE) / 2, BOX_SIZE, BOX_SIZE);
    ctx.restore();
    if (Engine.debug) drawMenuButton(ctx, DEV_PANEL_BUTTON, DEV_PANEL_BUTTON_TEXT);
  }

  /**
   * 開発用パネルを開く。「基本」にボタンを1つ、自分のタブに数値の表示を1つ足す。
   * @returns {void}
   */
  openPanel() {
    openDevPanel({
      layer: SCENE_LAYER,
      addParts: (area, start) => {
        area.addButton({ ...start, label: LABEL_RESET, onPress: () => this.resetBox() });
      },
      tabs: [
        {
          label: LABEL_TAB,
          build: (tab, rect) => {
            tab.addValue({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              label: LABEL_BOX_X,
              read: () => Math.round(this.boxX),
            });
          },
        },
      ],
    });
  }

  /**
   * 四角を左端に戻す。
   * @returns {void}
   */
  resetBox() {
    this.boxX = 0;
  }
}
```

2つめ: `js/main.js` の `import { BootScene } from './scenes/BootScene.js';` の次に、次の1行を足す。

```js
import { FirstScene } from './scenes/FirstScene.js';
```

3つめ: `js/main.js` の `config` の `scene:` の行を、次の1行に書き換える（`next` の中だけが変わる）。`js/main.js` のほかの行は変えない。

```js
  scene: new BootScene({ screen, layer: LAYER.main, next: () => new FirstScene(screen) }),
```

**使わないゲームでは**
*   `virtualPad` を `false` にし、メニューも窓も開発用パネルも使わないなら、5つの `.js`（`MenuScene.js`・`WindowScene.js`・`devPanel.js`・`virtualPadConfig.js`・`virtualPadView.js`）と画像はそのまま残してよい。ゲームのコードから読み込まれないので、起動に影響しない。
*   `js/names.js` は `js/main.js` が読み込むので、この5つに入らない。消すと起動しない。

### 7-5. 開発モードと公開
開発モードは、開発中だけ使う入口（開発用パネルを開くキーやボタンなど）を出すための、起動のしかたである。ページを開くときのアドレスで決まる。

| アドレスの末尾 | 開発モード |
| --- | --- |
| 付けない、`?debug=0` | ならない（偽） |
| `?debug`、`?debug=1` など（`0` 以外の値） | なる（真） |
| `?DEBUG`（大文字） | ならない（指定とみなさない） |

*   開発モードで開くと、左上に FPS が出た状態で始まる。開発用パネルなどの入口は、ゲームが開発モードのときだけ出すように作る（7-4）。
*   ゲームのコードが開発モードかどうかを読むのは、`Engine.debug` だけにする。アドレス（URL）をゲームのコードが自分で読まない。読めるのは `Engine.start` の後（最初のシーンの `init` の中か、それより後）で、`Engine.start` の前に作るシーンの `constructor` では読めない。詳しくは `oz/ENGINE_API.md` 3章「開発モード」を見る。

**公開するとき**
*   開発モードになるかどうかは、`js/main.js` の `const debug = …` の1か所で決まる。

    ```js
    const debug = ![null, '0'].includes(new URLSearchParams(location.search).get('debug'));
    ```

*   このまま公開すると、アドレスを知っている人は誰でも、末尾に `?debug` を付けて開発モードで開ける。
*   公開するときに開発モードを使えなくするなら、REQ で「`js/main.js` の `const debug = …` の右辺を `false` に書き換える」と指示する → `const debug = false;` になり、`?debug` を付けて開いても開発モードにならない。また使うときは、右辺を上の形に戻す。
*   どちらの場合も、開発用のコード（`devPanel.js` や入口のコード）は取り除かれず、公開したファイルの中に残る。開発モードでなければ、入口は出ず、開発用パネルも開かない。

## 8. 憲法と開発資料にエンジンについて書く

`template-app` の立ち上げ手順の Step 1 以降は、Claude Code が発注者との対話で進める。そのうち、エンジンに関わる Step 2〜4 では、次のことを行う。Step 1 の中身と、ここに書いていない部分は、`_doc/INITIAL_PROJECT_STARTUP.md` に従う。

### 8-1. Step 2（憲法・`CLAUDE.md`・`README.md`）

**憲法 1章（プロジェクト基本定義）:**
*   実行環境: ブラウザ / HTML5 Canvas 2D / Vanilla JS（ES Modules + import map）。ビルド工程はなく、静的サーバで実行する。エンジンは `oz/` の OZ Engine である。OZ Engine がビルドなしの ES Modules と import map を前提にしているので、フレームワークやビルドツールは使わない。
*   検証コマンドの例: Node.js が入っていれば、変更した `.js` ファイルの構文チェック `node --input-type=module --check < <変更した .js ファイル>`。Node.js が入っていなければ「なし」とする。

**憲法 3章（絶対禁止事項）:**
*   `GAME_RULES.md` の「ここから貼り付け」と「ここまで」の間の囲みの中だけを、3章の末尾に貼る。囲みの外は貼らない。
*   貼った後、3章の既存の規則と重なる・食い違う箇所があれば、既存の規則の側を直す。貼った文面は変えない。

**`CLAUDE.md`・`README.md`:** プロジェクトの概要に、次のことを書く。
*   `oz/` は OZ Engine（外から届いたエンジン本体）で、編集しない。
*   エンジンの使い方を知るには、`oz/ENGINE_API.md` だけを見る。

### 8-2. Step 3（開発資料 `PROJECT_ARCHITECTURE.md`）
開発資料に、次のことを書く。
*   **フォルダ構造:** `index.html`・`oz/`・`js/`・`assets/` を書く。`oz/` は「エンジン本体。外から届き、編集しない」とし、`ENGINE_API.md`・`VERSION`・`FINGERPRINTS.txt`・`index.js`・`src/` までを書く。`src/` の中は書かない。
*   **import map:** `index.html` の import map（`oz` は `./oz/index.js`、`assets/` は `./assets/`）を書く。
*   **責務の表:** `oz/` を「編集しない。使い方は `oz/ENGINE_API.md`」として載せる。
*   **書き写さない:** `oz/ENGINE_API.md` の中身を、開発資料に書き写さない（二重管理になり、食い違うため）。
*   **ゲームの REQ:** 参照してよい資料として、`oz/ENGINE_API.md` を挙げる。

### 8-3. Step 4（初回コミット）
初回コミットに、コピーしたもの（`index.html`・`oz/`・`js/`・`assets/`）と `.claude/settings.json` を含める。コミットのメッセージに、エンジンの版を書く（例 `OZ Engine 0.1.0 を取り込む`。版の確かめ方は5章）。

## 9. エンジンの更新（`oz/` の置き換え）と土台の仕組みの取り込み

OZ Engine のリポジトリで `oz/` が直されたときに、ゲームのプロジェクトの `oz/` を新しくする手順である（立ち上げの Step 5 以降）。更新は、`oz/` を OZ Engine のリポジトリの `oz/` で丸ごと置き換えるだけで行う。`oz/` の外（`index.html`・`js/`・`assets/`・`.claude/` など）は、置き換えでは触らない。

置き換えは、発注者が行う。4章の設定と `GAME_RULES.md` の規則で、Claude Code は `oz/` の編集（追加・削除を含む）を禁止されているためである。

### 9-1. 手順

| 順 | 誰が | 何をする | 期待する結果 |
| --- | --- | --- | --- |
| 1 | 発注者 | 更新が必要かを確かめる（9-2） | `SAME` なら更新は不要。ここで終わる |
| 2 | 発注者 | 置き換えの前の版を、`oz/VERSION` で確かめてメモする | 前の版が分かる |
| 3 | 発注者 | エクスプローラーで `oz` を置き換える（9-3） | `oz` が OZ Engine のリポジトリのものになる |
| 4 | 発注者 | 置き換えの後の版を、`oz/VERSION` で確かめる | 後の版が分かる |
| 5 | 発注者 | 5章の指紋の照合を行う | `OK` と出る |
| 6 | 発注者と Claude Code | Claude Code に伝える（9-4） | `js/` を直す REQ ができる |
| 7 | 発注者 | 起動の確認（7章の7-2）をしてからコミットする | コンソールにエラーが出ない。メッセージに前後の版を書く（例 `OZ Engine を 0.1.0 から 0.2.0 に更新`） |

### 9-2. 更新が必要かの確かめ方（発注者）
ゲームのフォルダのルートで Git Bash を開き、次の1行を貼り付けて実行する。

```bash
diff <(tr -d '\r' < oz/FINGERPRINTS.txt) <(tr -d '\r' < /d/ozlab/ozengine-web/oz/FINGERPRINTS.txt) && echo SAME
```

*   `SAME` と出れば、ゲームの `oz/` は OZ Engine のリポジトリの最新と同じで、更新は不要である。
*   `SAME` が出ずに差分の行が出れば、更新が必要である。
*   版番号（`oz/VERSION`）は `oz/` を変えるたびに上がるとは限らないので、更新の要否は版ではなくこのコマンドで確かめる。

### 9-3. `oz` の置き換え方（発注者）
エクスプローラーで、次の順に行う。

1.  ゲームのフォルダの `oz` フォルダを**削除**する。
2.  `D:\ozlab\ozengine-web\oz` フォルダを、ゲームのフォルダの直下にコピーする。

上書きコピーにしてはならない。OZ Engine のリポジトリで消したファイルが、ゲーム側に残ってしまうためである。必ず削除してからコピーする。

### 9-4. `oz/ENGINE_API.md` の変わった点に合わせる（Claude Code）
発注者が Claude Code に、次のように伝える。

> `oz/ENGINE_API.md` を読み直し、変わった点に合わせて `js/` を直す REQ を作って。

*   変わった点は、`git diff -- oz/ENGINE_API.md` で確かめられる。
*   `js/` を直す作業は、ゲームの通常の REQ/RES の流れで行う。
*   `oz/src/` は、更新の後も読まない。

### 9-5. 開発用パネルの雛形と名前の置き場所を取り込む
`js/` はゲームのものなので、`oz/` を置き換えても、土台の `js/` に後から加わった仕組みは届かない。すでに作ったゲームで、開発用パネルの雛形（`js/scenes/devPanel.js`）と名前の置き場所（`js/names.js`）を使いたいときは、次のように取り込む。`js/` を変えるので、ゲームの通常の REQ/RES の流れで行う。名前の置き場所は必須ではなく、開発用パネルの雛形だけを取り込んでもよい。

**前提の確かめ方（発注者）**
先に `oz/` が、`Engine.debug`（`oz/ENGINE_API.md` 3章）と UI 部品（26章）のあるものになっている必要がある。`oz/VERSION` は変わっていないので、版では確かめられない。

1.  9-2 のコマンドを実行する。`SAME` と出れば、前提を満たしている。
2.  `SAME` が出なければ、ゲームのフォルダのルートで Git Bash を開き、次の1行を貼り付けて実行する。

    ```bash
    grep -nE '^### .*(Engine\.debug|addScroll)' oz/ENGINE_API.md
    ```

    期待する結果: 開発モードの見出しと、`addTabs`・`addScroll` の見出しの2行が出る。2行出れば、前提を満たしている。2行出なければ、先に 9-1 の手順で `oz/` を置き換える。

**手順**

| 順 | 誰が | 何をする | 期待する結果 |
| --- | --- | --- | --- |
| 1 | 発注者 | 前提を確かめる（上） | 前提を満たしている |
| 2 | 発注者 | Claude Code に「`D:\ozlab\ozengine-web\_doc\newgame\NEW_GAME_GUIDE.md` の 9-5 で、開発用パネルの雛形を取り込む REQ を作って」と伝える（名前の置き場所も使うなら、それも伝える。手順書を読む許可を求められたら、許可してよい） | Claude Code が、次の順3から始める |
| 3 | Claude Code | 同じ名前のファイルがゲームにあるかを調べ、発注者に見せる（下の「同じ名前のファイル」） | あるもの・無いものが分かり、写すファイルと扱いが REQ に書かれる |
| 4 | Claude Code | `D:\ozlab\ozengine-web\js\` から、下の「写すファイル」の条件に合うものを、ゲームの `js/` の同じ場所に写す（読む許可を求められたら、許可してよい） | 写したファイルが、条件のとおりにそろう |
| 5 | Claude Code | `js/main.js` に、下の「`js/main.js` に足すもの」を足す | `?debug` を付けて開くと、開発モードになる |
| 6 | Claude Code | 開発用パネルを開く入口を、ゲームのシーンに書く（7-4 のコード例と同じ形。入口は開発モードのときだけ） | 入口のコードができる |
| 7 | 発注者 | ゲームを開いて確かめる | `?debug` を付けて開くと、左上に FPS が出て、入口から開発用パネルが開き、閉じると元の画面に戻る。付けないで開くと、FPS も入口も出ない。どちらもコンソールにエラーが出ない |

**写すファイル**

| ファイル | 写す条件 |
| --- | --- |
| `js/scenes/devPanel.js` | いつも写す |
| `js/scenes/WindowScene.js` | ゲームに無いとき（`devPanel.js` が読み込む） |
| `js/ui/virtualPadConfig.js` | ゲームに無いとき（`WindowScene.js` が、中の `VIRTUAL_PAD_LAYOUT` を読み込む。パッドを使わないゲームでも要る） |
| `js/names.js` | `js/ui/virtualPadConfig.js` を写したとき（中の `KEY` を読み込む）と、名前の置き場所を使うとき |

*   ゲームが自分の `js/ui/virtualPadConfig.js`（`VIRTUAL_PAD_LAYOUT` のあるもの）を持つなら、今のまま使え、開発用パネルのために `js/names.js` は要らない。
*   開発用パネルの窓は 600 × 600（論理座標）である。解像度がこれより小さいゲームでは、`devPanel.js` の窓の大きさと部品の位置を、REQ で直すよう指示する。

**`js/names.js` を写すとき**
土台のファイルをそのまま写すと、見本の名前（`stars` など）が入る。写した後に、Claude Code がゲームのルートで次を行う。

1.  6-2 の手順1のコマンドを実行する。期待する結果: `js/names.js` の行だけが出る。ほかのファイルの行が出たら、そこで止めて発注者に報告する。
2.  6-2 の手順3のコマンドを実行し、続けて手順4のコマンドを実行する。期待する結果: 手順4で何も表示されない。`js/names.js` に残る名前は、`LAYER` の `main` と `KEY` の `left`・`right`・`boost` だけである。
3.  ゲームの名前を書き足す。どの名前を移すか（今あるコードの名前を `js/names.js` から読むように直すか）は REQ で決める。

**`js/main.js` に足すもの**
`Engine.start` を呼ぶより前に、次の1行を足す。

```js
const debug = ![null, '0'].includes(new URLSearchParams(location.search).get('debug'));
```

`Engine.start` に渡す設定（`canvas`・`width` などを書いている所）に、次の1行を足す。すでに `debug:` の行があれば、次の1行に置き換える。

```js
  debug,
```

公開するときの扱いは 7-5 に書いてある。

**同じ名前のファイル**
ゲームのフォルダのルートで、次の1行を実行する。

```bash
ls js/names.js js/scenes/devPanel.js js/scenes/WindowScene.js js/ui/virtualPadConfig.js
```

期待する結果: ゲームにあるファイルはその名前が、無いファイルは `No such file or directory` の行が出る。

*   ゲームにあるファイルは、上書きしない。そのまま使うか、別の名前で写すか、中身を合わせるかを、REQ で決める。
*   別の名前で写すときは、それを読み込む側の `import` の行も合わせて直す。

**取り込んだ後**
*   `devPanel.js`・`WindowScene.js`・`names.js` は、ゲームの `js/` のファイルになる。ゲームが書き換えてもよい。
*   OZ Engine のリポジトリで雛形が後から直っても、ゲームには自動では届かない。新しいものを使いたいときは、REQ で取り込み直す（書き換えた部分が消えないように、違いを見て手で合わせる）。

## 10. エンジンの不足を伝える（連絡票）

ゲームを作っていて、`oz/ENGINE_API.md` に無い機能が必要になったとき、または書かれたとおりに動かないときの伝え方である（立ち上げの Step 5 以降）。ゲーム側に回避策を書かず、OZ Engine のリポジトリに連絡票で伝える。

### 10-1. 連絡票の場所
OZ Engine のリポジトリの `_doc/BRIDGE_FROM_<GAMENAME>.md`（例 `D:\ozlab\ozengine-web\_doc\BRIDGE_FROM_VANGUARDRIFTER.md`）。

### 10-2. 書く人
ゲームのプロジェクトのセッション（Claude Code）が、発注者の承認を得て書く。ファイルはゲームのリポジトリの外にあるので、書くときに Claude Code が許可を求める。許可してよい。すでにファイルがあれば、末尾に新しい項を足す（前の項を消さない）。

### 10-3. 書く内容
1つの項に、次のことを書く。`oz/src/` を読んで推測した内部の話は書かない（読んでいないので書けない）。

*   日付。
*   ゲーム名とゲームのリポジトリの場所。
*   ゲームの `oz/VERSION` の版。
*   何をしようとしたか（ゲームの機能として）。
*   `oz/ENGINE_API.md` のどこ（章）が足りないか、何ができないか。
*   望む動き（分かれば）。
*   ゲーム側の RES のパス。
*   ゲーム側に回避策を書いていないこと。

雛形（見出しの例）:

```markdown
## <日付> <ゲーム名>: <不足の題名>

*   **ゲームの場所:** <ゲームのフォルダ>
*   **`oz/VERSION`:** <版>
*   **何をしようとしたか:** <ゲームの機能として>
*   **足りないこと:** `oz/ENGINE_API.md` の <章> に <無い／書かれたとおりに動かない>。<何ができないか>
*   **望む動き:** <分かれば>
*   **ゲーム側の RES:** <RES のパス>
*   **回避策:** ゲーム側に書いていない。
```

### 10-4. コミットしない
連絡票は OZ Engine のリポジトリのファイルである。ゲーム側からはコミットしない（ゲームのリポジトリにも置かない）。OZ Engine のリポジトリ側のセッションが取り込み、対応が済んだら削除する。

### 10-5. 往復の流れ
1.  ゲーム側が、不足を RES に記録し、連絡票を書いて、その作業を止める。
2.  発注者が、OZ Engine のリポジトリのセッションに連絡票を渡す。OZ Engine のリポジトリでは、連絡票を受けて Interrupt で `oz/` と `oz/ENGINE_API.md` を直し、指紋の一覧を作り直す。
3.  対応が済んだら、OZ Engine のリポジトリ側で連絡票を削除する。
4.  ゲーム側は、発注者が直った `oz/` で置き換え（9章）、`oz/ENGINE_API.md` の変わった点に合わせて作業を再開する。
