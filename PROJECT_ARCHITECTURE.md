# PROJECT_ARCHITECTURE.md
## OZ Engine 全体仕様および実装定義書

本資料は、AIが本プロジェクトを実装・修正する際の「全体マップ（見取り図）」および「インデックス（索引）」となる設計図である。
直接コードを読めば分かる内部ロジックの詳細（関数の中身、引数の全列挙等）は本資料には記載しない。実装が進むごとに、セクション4を随時追記・更新していくこと。
※ `_log/dir/` は本資料に記載しない（DIRは実装AIに直接読ませない設計のため。`_doc/PROJECT_PHASE_TRANSITION_CLEANUP.md` 4章参照）。

---

### 1. プロジェクトフォルダ構造
AIは新規にファイルを作成、あるいはログを記録する際、必ずこの構造に準拠すること。各ファイルの責務は本資料の「4. 各モジュールの責務リファレンス」を唯一の正解（SSOT）とし、ここには記載しない。

```
ozengine-web/
├── index.html              # 起動ページ（import map を定義する）
├── oz/                     # エンジン本体（ゲームへ丸ごとコピーされる単位）
│   ├── index.js
│   ├── ENGINE_API.md
│   ├── VERSION
│   ├── FINGERPRINTS.txt    # `oz/` の各ファイルの指紋（SHA-256）の一覧（4章の規則）
│   └── src/
├── js/                     # アプリのコード（ゲームの土台）
│   ├── main.js
│   ├── scenes/
│   ├── ui/                 # バーチャルパッドの定義と描画
│   ├── effect/
│   └── entities/
├── assets/                 # 素材
│   ├── sprites/
│   ├── images/             # `vpad/` はバーチャルパッドの既定の画像
│   └── sounds/
├── test/                   # 自動テスト（`node --test` でのみ実行。`oz/` の外に置き、新規プロジェクトにはコピーしない）
├── _doc/
│   └── newgame/            # 新規プロジェクトの手順書・ゲーム用のルールの文面・Claude Code の設定例（ゲームのプロジェクトを作るときだけ使い、コピーしない）
├── _log/
├── CLAUDE.md
├── PROJECT_ARCHITECTURE.md
├── PROJECT_CONSTITUTION.md
└── README.md
```

新規プロジェクト（ゲームのプロジェクト）の作り方、エンジンの更新方法、`oz/` の改変の確かめ方、エンジンの不足の伝え方は、`_doc/newgame/NEW_GAME_GUIDE.md` に書く。ゲームの憲法に貼り付けるルールの文面は `_doc/newgame/GAME_RULES.md`、ゲームのプロジェクトの Claude Code の設定例は `_doc/newgame/settings.example.json` にある。

エンジンと素材の import には、`index.html` で定義する import map を使う。

```html
<script type="importmap">
  { "imports": { "oz": "./oz/index.js", "assets/": "./assets/" } }
</script>
```

---

### 2. データ構造（Model）の概要

#### 2.1 スプライトJS（`assets/sprites/*.js`）
スプライトJSのエンジン側の約束（使い方、`draw` の約束、座標、配置、つなぎのスプライト、組み立て用のJS）の唯一の記載箇所は `oz/ENGINE_API.md` 23章「スプライトJS」である。形式の唯一の記載箇所（エディタのリポジトリ）も同章に書く。本章には書き写さない。

土台の機体は前方を +X とする（エディタで描くときも機首を +X に向ける）。

#### 2.2 起動設定（`Engine.start` に渡す）
| 項目 | 内容 |
| --- | --- |
| `canvas` | 必須。描画先の canvas 要素 |
| `width` / `height` | 必須。論理解像度 |
| `layers` | 必須。レイヤー名の配列（奥から手前の順）。利用側が定義する |
| `tickRate` | 任意。固定ティック数（1秒あたり。既定は 60） |
| `scene` | 必須。最初のシーン |
| `debug` | 任意。デバッグ表示の有無（既定は無効） |
| `virtualPad` | 任意。真ならバーチャルパッドを使う（既定は無効） |

#### 2.3 シーン（`Scene` の派生クラス）
| メソッド | 呼ばれるタイミング |
| --- | --- |
| `init()` | シーンがスタックに積まれたとき（1回） |
| `update(dt)` | 固定ティックごと（最前面のシーンのみ）。`dt` はティック長（ミリ秒） |
| `draw(ctx, layer, time)` | 毎フレーム、レイヤーごと（スタックの下から順に全シーン） |
| `onPointer(pointer)` | ポインタ入力時（最前面のシーンのみ）。`pointer` は `{ type, x, y }`。戻り値は使わない |
| `onKeyDown(code)` | キーを押した瞬間（最前面のシーンのみ） |
| `destroy()` | シーンがスタックから外れたとき（1回） |

#### 2.4 時間（`time`）
phaseout の3系統を引き継ぐ。単位はすべてミリ秒。

| 値 | 内容 |
| --- | --- |
| `realDelta` | 前フレームからの実時間差分 |
| `gameTime` | `timeScale` を適用した累積ゲーム時間 |
| `timeScale` | ゲーム時間の倍率（`1` が等速）。スローや停止に使う |

`draw` に渡す `time` は読み取り専用である。`timeScale` の変更は `Engine.timeScale` で行う。

---

### 3. 処理フロー（実行サイクル）

1フレームの処理順序は次のとおりで、変更してはならない。

1. `Time` が `realDelta` を計算し、`realDelta × timeScale` を蓄積する（1フレームの上限は5ティック分）。`gameTime` にも同じ量（同じ上限）を足す。
2. `Input` が、ブラウザから受け取って溜めておいた入力を、タッチの指のパッドへの振り分け（`VirtualPads`。配信の始めの最前面のシーンのパッド）→ キーの確定（`Keys`。キーボードとパッドをまとめる）→ 届いた順の配信、の順に処理する。`timeScale` に関係なく毎フレーム1回行う。ポインタは単一ポインタに絞ってから、ボタン → 最前面のシーンの順で、ボタンが消費したらシーンへ届かない。キーは最前面のシーンへ届く。
3. 蓄積がティック長に達している間、`Scenes` が最前面のシーンの `update(dt)` を呼ぶ（固定ティック）。
4. `Layers` が、`save` / `restore` の中で、変換を初期化してキャンバス（画素数の全体）を消去し、論理座標への拡大の変換（画素数 ÷ 論理解像度）を設定してから、レイヤーを奥から順に走査して、`Scenes` 経由で各シーンの `draw(ctx, layer, time)` を呼ぶ。変換は `restore` で戻し、外へ漏らさない。
5. `debug` が有効なら、`DebugOverlay` が最前面に描画する（自分の `save` / `restore` の中で同じ拡大の変換を設定し、論理座標で描く）。

補足事項は次のとおり。

* **描画の補間は行わない:** `timeScale` が小さいと、動きはティック単位で段階的に見える。
* **ポーズは専用のAPIを持たない:** ポーズ用のシーンを積めば、背面のシーンの `update` は止まり、`draw` だけが続く。
* **シーン切り替え直後の時間スパイクを防ぐ:** シーン操作（切り替え、積む、戻す）があったら蓄積を捨て、次のフレームの `realDelta` を蓄積に入れない。ティックの中で操作が起きたら、そのフレームの残りのティックを回さない。入力の配信（手順2）の中で操作が起きたら、そのフレームのティックを回さない。そのフレームの残りの入力は、新しい最前面のシーンへ配る。ティックの外（タイマーなど）で操作が起きたら、次のフレームの先頭（手順1の前）で検知するので、そのフレームの `realDelta` を蓄積に入れず、ティックも回らない。
* **「押した瞬間」の入力を取りこぼさない:** 入力は毎フレーム配るので、ティックが0回のフレームでも届く。押してから離すまでが1フレームより短いキーも、`onKeyDown` を呼び、そのフレームの間は `isKeyDown` を `true` にして、次のフレームで `false` にする。
* **ブラウザのイベントの中ではシーンの処理を呼ばない:** `onPointer`・`onKeyDown`・`onPress` は手順2の中からだけ呼ぶ。
* **音声の自動再生制限:** 入力の配信はフレームの中なので、そこからは自動再生制限を解除できない。`Sound` は自分で `window` に `pointerdown`・`pointerup`・`keydown` を capture で登録し、そのイベントの中で直接 `AudioContext.resume()` を呼ぶ（`Input` を経由しない）。イベントの中では `resume()` の呼び出しと入力の記録だけを行い、シーンの処理を呼ばない。`Escape` の `keydown` は入力に数えない。入力があり AudioContext が `running` になったら登録を解除する。ブラウザが AudioContext を止めたら（`statechange` で `running` でも `closed` でもなくなったら。iOS の Safari の `interrupted` を含む）登録し直し、次の入力で再開する。入力のイベントの外では `resume()` を呼ばない。一度 `running` になったあとで止まっている間の SE は捨て、BGM の操作は受け付ける（再開後に鳴る）。最初の入力より前の再生の要求は捨てる。
* **Canvas の画素数:** `Screen` が、表示の大きさ（CSS の画素数）× `devicePixelRatio`（上限 2、使えない値なら 1）を四捨五入した値（1 以上）にし、`resize` で追従させる。論理解像度とは一致しない。倍率は利用側に公開しない。シーンの座標は論理座標のまま。Phase 04（キャンバスキャッシュ）で焼き付ける解像度を決める前提になる。
* **音の時刻:** フェードと停止の予定には `AudioContext.currentTime` を使う。これは憲法3章「時間の受け渡し」に明記された例外である。音は `timeScale` と無関係に実時間で進む。

`Engine` が各モジュールを生成する（`Layers` と `DebugOverlay` には、起動設定の `width`・`height` を論理解像度として渡す）。`Time`・`Scenes`・`Layers`・`Input`・`DebugOverlay` のインスタンスを `GameLoop` へ、`Screen`・`Scenes`・`Buttons` のインスタンスに加え、`Keys`・`VirtualPads` を `Input` へ、`VirtualPad` を `VirtualPads` へ引数で渡すので、`GameLoop` と `Input` と `VirtualPads` はこれらを import しない。`Scenes` と `Layers` も互いを import しない。

依存の向きは次のとおりで、逆向きの import を禁止する。

```
利用側の js/ → oz/index.js → Engine / Scene / Assets / Sound / Storage
Engine → Scene / GameLoop / Time / Screen / Scenes / Layers / Input / Buttons / Keys / VirtualPad / VirtualPads / DebugOverlay

Scene・GameLoop・Time・Screen・Scenes・Layers・Input・Buttons・Keys・VirtualPad・VirtualPads・DebugOverlay・Sound・Storage は他のエンジンモジュールに依存しない。
例外: Assets → Sound（音声のデコードと、名前で預けるため）。
```

`Engine`・`GameLoop`・`Input` は `Assets`・`Sound`・`Storage` を import しない。

---

### 4. 各モジュールの責務リファレンス
パスの書かれていないモジュール名は `oz/src/` のファイルに対応する。公開するものは `oz/index.js` から再exportする。

| モジュール | 書いてよいこと | 書いたら責務違反になること |
| --- | --- | --- |
| **index.js**（`oz/` 直下） | 公開APIの再export | 処理そのもの |
| **Engine** | 起動設定の受け取りと各モジュールの初期化、公開操作（シーン操作、`timeScale`、ボタンの登録、バーチャルパッドの登録と状態の取得、キーの状態の取得）の各モジュールへの委譲 | ゲームループの中身、描画処理 |
| **GameLoop** | `requestAnimationFrame` の管理、3章の順序の呼び出し | 時間計算の詳細、ゲーム固有の処理 |
| **Time** | `realDelta`・`gameTime`・`timeScale` の管理、固定ティックの蓄積 | 入力、描画 |
| **Screen** | 論理解像度の保持、スクリーン座標と論理座標の変換、Canvas の表示サイズの調整（縦横比を保ってウィンドウに合わせる）、Canvas の画素数の調整（表示サイズ × `devicePixelRatio`、上限 2） | 描画、入力の配信、`ctx` の操作 |
| **Layers** | レイヤー順の走査、消去、論理座標への拡大の変換の設定（毎フレーム。描画全体の `save` / `restore` の中だけ）、呼び出しごとの `save` / `restore` | レイヤー名の固定値、ゲーム固有の描画 |
| **Scene** | シーンの基底クラス（2.3章のインターフェース） | 共通のゲーム処理 |
| **Scenes** | シーンスタックの管理（切り替え、積む、戻す）、シーン操作があったことの通知（`GameLoop` が参照する）、最前面のシーンの参照 | 遷移演出、BGMの操作 |
| **Input** | ポインタ（タッチは指ごと）とキーボードの受信、論理座標への変換、canvas のタッチ向けの設定、振り分け → 確定 → 配信の流れ、単一ポインタの選び出し、優先順の配信 | キー割り当ての固定値、ゲーム固有の分岐、パッドの当たり判定、キーの確定の中身 |
| **Keys** | キーボードとパッドの入力元をまとめたキーの押下状態の確定、押した瞬間の判定 | イベントの受信、配信 |
| **VirtualPad** | 1つのパッドの配置の検証、当たり判定、指ごとの押下状態、キーへの変換、つまみの位置、描画用の状態の写し | 描画、画像の読み込み、配置やキー割り当ての既定値、`window` への依存 |
| **VirtualPads** | シーンごとのパッドの登録、指で触れたかの記録、最前面のシーンのパッドへのタッチの振り分け、パッドのキーの変化を入力の列に差し込むこと | 当たり判定の中身、キーの確定、配信 |
| **Buttons** | シーンごとのボタン矩形の登録と当たり判定 | ボタンの描画、タブやスクロールなどのUI部品 |
| **Assets** | 一覧に基づく画像と音声のロード、取得、読み込みに失敗したときの代替（透明な画像、警告） | スプライトJSの読み込み（`import` で行う）、キャッシュ生成、音の再生 |
| **Sound** | AudioContext の管理（最初の入力と、ブラウザが止めたあとの入力での再開を含む）、音声のデコードと名前での保持、SEとBGMの再生、フェード、音量 | BGMの状態遷移（ピンチなどの判定はゲーム側）、ファイルの読み込み |
| **Storage** | 単一JSONの保存と読み込み、版番号が違うときの既定値への初期化、`localStorage` が使えないときのメモリ上での継続 | セーブ内容の定義、移行処理 |
| **DebugOverlay** | FPSの計算と表示（表示の `save` / `restore` の中での論理座標への拡大の設定を含む） | ゲーム状態の参照 |
| **js/main.js** | `Engine.start` に渡す設定（解像度、レイヤー、最初のシーン（boot 画面と、その次に進む画面の指定）、`debug`、`virtualPad` など）の用意と `Engine.start` の呼び出し | ゲームロジック、描画処理 |
| **js/scenes/** | シーンごとの進行と、`effect/`・`entities/` の呼び出し、`ui` レイヤーの画面構成（文字、画像、ボタン、暗幕）、スプライトの配置（位置と回転の設定と `draw` の呼び出し）。タイトルとプレイの共通処理（`FlightScene`）、ミュートの保存と反映（`mute.js`）、文字の共通処理（`uiText.js`）、メニューの仕組み（`MenuScene`）、土台のメニューの項目（`playMenu.js`）、スローの切り替え（`slow.js`）、boot 画面（`BootScene`。最初の入力を受け、次の画面へ進む。ファイル全体の目印はなく、押した瞬間の SE だけ目印付き）もここに置く | 細かい動きや描画の実装（機体の動き、星・トレイル・風の描画） |
| **js/ui/** | バーチャルパッドの定義（配置、キーの割り当て、画像のファイル名）、画像の読み込みと描画 | ゲーム進行、目印の付いたコードの import |
| **js/effect/** | 星、トレイルなどの演出の更新と描画 | ゲーム進行に影響する処理 |
| **js/entities/** | 位置や状態の保持、動きの更新、自動操縦 | 描画命令の直書き（描画はスプライトや `effect/` に任せる） |
| **assets/sprites/*.js** | 見た目の描画（`oz/ENGINE_API.md` 23章の約束）。現在の `ship.js` は手書きのつなぎのスプライトで、エディタの P5（塗り）の後に、エディタの書き出しファイルに差し替える | 位置や動き、外部への依存（組み立て用のJSがパーツのスプライトJSを `import` することを除く） |

**エンジンに入れないもの:** スプライトの描画処理、アニメーション、カメラ、当たり判定、物理、パーティクル、Entity基底クラス、遷移演出、タブやスクロールなどのUI部品。必要になったPhaseで、発注者の承認を得てから検討する（憲法3章「先回り実装の禁止」）。

**自動テスト（`test/`）の規則:**

* **実行方法:** リポジトリのルートで `node --test`（引数なし）を実行し、結果の `fail 0` で判定する（憲法1章「検証コマンド」）。`package.json` は作らず、使ってよいのは Node.js の標準モジュールだけである（npm パッケージは使わない）。`node:test` と `node:assert/strict` を基本とし、指紋一覧のテストでは `node:crypto`・`node:fs`・`node:path`・`node:url` も使う。Node.js はテストの実行にのみ使い、ゲームの実行・配信には使わない。確認した版は v24.15.0 である。
* **置き場所と命名:** `test/<対象モジュール名>[.<観点>].test.js`（対象がモジュールでない場合は、対象のファイルの名前を使う。指紋一覧は `test/FINGERPRINTS.test.js`）。`test/` にはテスト以外の `.js`（共有の補助モジュールを含む）を置かず、補助関数は各テストファイルの中に書く。`node --test` は既定のパターンに合うファイルをすべて実行するので、そのパターンに合う名前（`*.test.js`・`*-test.js`・`*_test.js`・`test-*.js`・`test.js`）を `test/` の外のファイルに付けてはならない。
* **import の規則:** 対象を `oz/src/` から相対パスで直接 import し、`oz/index.js` は import しない。公開されたものだけを通して確かめ、テストのためにソースを変えない。依存は `test/ → oz/src/` の一方向で、`oz/`・`js/`・`assets/`・`index.html` は `test/` を参照しない。指紋一覧のテストは `oz/src/` を import せず、`oz/` 以下のファイルをデータとして読む（`oz/` のパスは `import.meta.url` から求める）。
* **偽の `window`:** テストファイル内の素のオブジェクトで作り、`globalThis.window` に置いた場合はテストの終了時に（`t.after` で）元に戻す。`window` 以外のグローバルには代入しない。`t.after` は登録した順に動くため、1つのテスト（`t`）で偽の `window` を置くのは1回だけにし、ケースを繰り返すときはサブテストに分ける。`console.warn` は `t.mock.method` で抑止する。状態を持つ `Storage` は、クエリ付きの動的 import でテストごとに読み込み直す。
* **対象:** `Time`・`Scenes`・`Screen`・`Storage`・`Keys`・`VirtualPad`・`VirtualPads`（`Keys`・`VirtualPad`・`VirtualPads` は `window` を使わない）、指紋一覧（`oz/FINGERPRINTS.txt` が `oz/` の中身と一致すること）。テストしないモジュール: `Scene`・`Input`・`Sound`・`Assets`・`Layers`・`GameLoop`・`DebugOverlay`・`Engine`・`Buttons`（`Sound` は読み込み時に `window` を使うため、対象にするときに登録の時期を検討する）。

**指紋一覧（`oz/FINGERPRINTS.txt`）の規則:**

* **形式:** 1行に1ファイル、`<SHA-256 の16進64文字><空白2つ><oz/ からの相対パス>`、パスのバイト順、LF で終わる。一覧ファイル自身は含めない。指紋は中身から CR（0x0D）を取り除いてから求める（作業ツリーの改行が LF と CRLF のどちらでも同じ指紋になるようにするため）。
* **作り直しの時期:** `oz/` の中のファイル（`ENGINE_API.md` だけの変更を含む）を変更・追加・削除するタスクの最後に作り直し、`node --test` が `fail 0` であることを確かめる。一覧を手で編集しない。
* **作り直しのコマンド**（Git Bash、リポジトリのルートで実行）:

  ```bash
  (cd oz && find . -type f ! -path ./FINGERPRINTS.txt | sed 's|^\./||' | LC_ALL=C sort | while IFS= read -r f; do printf '%s  %s\n' "$(tr -d '\r' < "$f" | sha256sum | cut -c1-64)" "$f"; done > FINGERPRINTS.txt)
  ```

* 一覧が古いと `test/FINGERPRINTS.test.js` が失敗する。ゲームのプロジェクトでの照合は `_doc/newgame/NEW_GAME_GUIDE.md` 5章に書く。
