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

土台の機体は、`FlightScene` が `CanvasCache`（`oz/ENGINE_API.md` 25章）で焼き付けて描く（範囲は `ship.js` の `bounds`、倍率は既定の `1`）。

#### 2.2 起動設定（`Engine.start` に渡す）
| 項目 | 内容 |
| --- | --- |
| `canvas` | 必須。描画先の canvas 要素 |
| `width` / `height` | 必須。論理解像度 |
| `layers` | 必須。レイヤー名の配列（奥から手前の順）。利用側が定義する |
| `tickRate` | 任意。固定ティック数（1秒あたり。既定は 60） |
| `scene` | 必須。最初のシーン |
| `debug` | 任意。FPS の表示の有無の起動時の値（真なら表示した状態で始まる。既定は偽）。実行中の出し入れと位置は `Engine.fpsVisible`・`Engine.fpsPosition`（`oz/ENGINE_API.md` 14章） |
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
単位はすべてミリ秒。

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
5. `DebugOverlay` が FPS を計算し（表示の有無にかかわらず毎フレーム）、表示が有効（`Engine.fpsVisible`）なら選ばれた隅（`Engine.fpsPosition`）に最前面で描画する（自分の `save` / `restore` の中で同じ拡大の変換を設定し、論理座標で描く）。

補足事項は次のとおり。

* **描画の補間は行わない:** `timeScale` が小さいと、動きはティック単位で段階的に見える。
* **ポーズは専用のAPIを持たない:** ポーズ用のシーンを積めば、背面のシーンの `update` は止まり、`draw` だけが続く。
* **シーン切り替え直後の時間スパイクを防ぐ:** シーン操作（切り替え、積む、戻す）があったら蓄積を捨て、次のフレームの `realDelta` を蓄積に入れない。ティックの中で操作が起きたら、そのフレームの残りのティックを回さない。入力の配信（手順2）の中で操作が起きたら、そのフレームのティックを回さない。そのフレームの残りの入力は、新しい最前面のシーンへ配る。ティックの外（タイマーなど）で操作が起きたら、次のフレームの先頭（手順1の前）で検知するので、そのフレームの `realDelta` を蓄積に入れず、ティックも回らない。
* **「押した瞬間」の入力を取りこぼさない:** 入力は毎フレーム配るので、ティックが0回のフレームでも届く。押してから離すまでが1フレームより短いキーも、`onKeyDown` を呼び、そのフレームの間は `isKeyDown` を `true` にして、次のフレームで `false` にする。
* **ブラウザのイベントの中ではシーンの処理を呼ばない:** `onPointer`・`onKeyDown`・`onPress` は手順2の中からだけ呼ぶ。
* **音声の自動再生制限:** 入力の配信はフレームの中なので、そこからは自動再生制限を解除できない。`Sound` は自分で `window` に `pointerdown`・`pointerup`・`keydown` を capture で登録し、そのイベントの中で直接 `AudioContext.resume()` を呼ぶ（`Input` を経由しない）。イベントの中では `resume()` の呼び出しと入力の記録だけを行い、シーンの処理を呼ばない。入力があり AudioContext が `running` になったら登録を解除する。ブラウザが AudioContext を止めたら（`statechange` で `running` でも `closed` でもなくなったら。iOS の Safari の `interrupted` を含む）登録し直し、次の入力で再開する。入力のイベントの外では `resume()` を呼ばない。入力に数えるキー、止まっている間と最初の入力より前の再生の要求の扱いは `oz/ENGINE_API.md` 21章を参照。
* **Canvas の画素数:** `Screen` が、表示の大きさ（CSS の画素数）× `devicePixelRatio`（上限 2、使えない値なら 1）を四捨五入した値（1 以上）にし、`resize` で追従させる。論理解像度とは一致しない。倍率は利用側に公開しない。シーンの座標は論理座標のまま。
* **キャンバスキャッシュの焼き直し:** `CanvasCache` は焼き付けを描くときに、今の画素の倍率を焼いたときの倍率と比べ、違えばその場で焼き直してから描く（`Screen` から通知は受けない。描かれていない焼き付けは次に描くときに焼き直す）。倍率は利用側に公開しない。
* **音の時刻:** フェードと停止の予定には `AudioContext.currentTime` を使う。これは憲法3章「時間の受け渡し」に明記された例外である。音は `timeScale` と無関係に実時間で進む。

`Engine` が各モジュールを生成する（`Layers` と `DebugOverlay` には、起動設定の `width`・`height` を論理解像度として渡す）。`Engine` は `DebugOverlay` を起動設定の `debug` にかかわらず常に作り、`debug` を表示の有無の起動時の値として設定する（`GameLoop` へは常にインスタンスを渡す）。`Time`・`Scenes`・`Layers`・`Input`・`DebugOverlay` のインスタンスを `GameLoop` へ、`Screen`・`Scenes`・`Buttons` のインスタンスに加え、`Keys`・`VirtualPads` を `Input` へ、`VirtualPad` を `VirtualPads` へ引数で渡すので、`GameLoop` と `Input` と `VirtualPads` はこれらを import しない。`Scenes` と `Layers` も互いを import しない。`Engine` は起動時（最初のシーンを積む前）に、画素の倍率（Canvas の画素数 ÷ 論理解像度）の求め方を関数として `CanvasCache` へ渡すので、`CanvasCache` は `Screen` を import せず、`Screen` も `CanvasCache` を知らない。同じく起動時（最初のシーンを積む前）に、論理解像度（起動設定の `width`・`height`）を `Ui` へ渡す（`setUiScreenSize`）ので、`Ui` は `Engine`・`Screen` を import しない。窓（`Ui.createWindow` の戻り値）はシーンが持ち、ポインタはシーンの `onPointer` から窓へ渡される（`Input` は `Ui` を知らず、窓は `Engine.addButton` と入力の仕組みに登録されない）。

依存の向きは次のとおりで、逆向きの import を禁止する。

```
利用側の js/ → oz/index.js → Engine / Scene / Assets / Sound / Storage / CanvasCache / Ui
Engine → Scene / GameLoop / Time / Screen / Scenes / Layers / Input / Buttons / Keys / VirtualPad / VirtualPads / DebugOverlay / CanvasCache / Ui

Scene・GameLoop・Time・Screen・Scenes・Layers・Input・Buttons・Keys・VirtualPad・VirtualPads・DebugOverlay・Sound・Storage・CanvasCache は他のエンジンモジュールに依存しない。
UI 部品のファイル（Ui・UiWindow・UiButton・UiValue・UiCheckbox・UiSlider・UiChoices・UiSpec・UiRect・UiMetrics・UiRenderer・UiStandardLook）は、UI 部品のファイルどうし以外のエンジンモジュールに依存しない。中の向きは Ui → UiWindow・UiRenderer、UiWindow → UiSpec・UiMetrics・UiRect・UiButton・UiValue・UiCheckbox・UiSlider・UiChoices、UiButton・UiValue・UiCheckbox・UiSlider・UiChoices → UiSpec・UiMetrics・UiRect、UiRenderer → UiStandardLook。
例外: Assets → Sound（音声のデコードと、名前で預けるため）。
```

`Engine`・`GameLoop`・`Input` は `Assets`・`Sound`・`Storage` を import しない。

---

### 4. 各モジュールの責務リファレンス
パスの書かれていないモジュール名は `oz/src/` のファイルに対応する。公開するものは `oz/index.js` から再exportする。

| モジュール | 書いてよいこと | 書いたら責務違反になること |
| --- | --- | --- |
| **index.js**（`oz/` 直下） | 公開APIの再export | 処理そのもの |
| **Engine** | 起動設定の受け取りと各モジュールの初期化、公開操作（シーン操作、`timeScale`、ボタンの登録、バーチャルパッドの登録と状態の取得、キーの状態の取得、FPS の表示の有無と位置の読み書き（値の検証を含む）、FPS の値の読み取り）の各モジュールへの委譲、起動時の `CanvasCache` への画素の倍率の求め方の受け渡し、起動時の `Ui` への論理解像度の受け渡し | ゲームループの中身、描画処理、焼き付けの処理、FPS の計算、UI 部品の処理 |
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
| **Buttons** | シーンごとのボタン矩形の登録と当たり判定 | ボタンの描画、UI 部品（`Ui` が担う） |
| **Assets** | 一覧に基づく画像と音声のロード、取得、読み込みに失敗したときの代替（透明な画像、警告） | スプライトJSの読み込み（`import` で行う）、キャッシュ生成（`CanvasCache` が担う）、音の再生 |
| **CanvasCache** | `create` の引数の検証、渡された描く処理の、ページに追加しない Canvas への焼き付け（範囲・`scale`・画素の倍率からの画素数と余白の計算を含む）、焼き付けた画像の描画（画面の画素への位置合わせを含む）、画素の倍率が変わったときの焼き直し、`refresh` による焼き直し、`dispose` による手放し | 絵の中身の解釈（`source` の `draw` 以外のキーの読み取り（範囲は `options.bounds` だけから受け取る）、描く処理の中身に応じた分岐）、画素の加工（`getImageData` などによる色の差し替え）、複数の絵を1枚にまとめること（アトラス）、時間で変わる絵の焼き付け、表示サイズ・画素数の調整（`Screen` の責務）、他のエンジンモジュールの import、画素の倍率の公開、ページへの要素の追加 |
| **Ui** | 公開の口（`createWindow`）、利用側に返す窓のオブジェクト（`addButton`・`addValue`・`addCheckbox`・`addSlider`・`addChoices`・`onPointer`・`draw` の受け渡し）、`Engine` から受け取る論理解像度の保持、起動前のエラー | 窓・部品の処理の中身、描画の中身、他のエンジンモジュール（UI 部品のファイル以外）の import |
| **UiWindow** | 窓の設定の検証と保持、窓の形（全体・タイトルバー・閉じるボタン・内側）の計算、部品の追加と並び、ポインタの振り分け（押し始めの持ち主、窓の外の押下と閉じる判定）、描くための情報（`view()`）の組み立て | Canvas の操作、部品ごとの押下の中身、値の保存、部品ごとの値の計算（スライダーの刻みなど）、`write` の呼び出しの判断、窓の移動・大きさの変更、部品の自動の並べ方 |
| **UiButton** | ボタンの設定の検証、当たり判定、押されているかの状態、離したときの反応と取り消し、描くための情報 | Canvas の操作、窓の外の判定 |
| **UiValue** | 数値・文字の表示の設定の検証、当たり判定、値の読み出しと文字への整え、描くための情報 | Canvas の操作、値の書き換えと保存 |
| **UiCheckbox** | チェックボックスの設定の検証、当たり判定、押されているかの状態、離したときの入り・切りの書き込み（`read`・`write`）と取り消し、描くための情報 | Canvas の操作、窓の外の判定、値の保持と保存 |
| **UiSlider** | スライダーの設定の検証（`min`・`max`・`step`）、溝とつまみの形の計算、当たり判定、ドラッグの状態、位置から刻みの値への変換（遊びと小数の丸めを含む）と書き込み（`read`・`write`）、描くための情報 | Canvas の操作、値の保持と保存、縦の溝 |
| **UiChoices** | 選択肢の列の設定の検証（選択肢の一覧と向き）と写し、選択肢ごとの矩形（等分）、当たり判定、押されている選択肢の状態、離したときの書き込み（`read`・`write`）と取り消し、描くための情報 | Canvas の操作、窓の外の判定、値の保持と保存 |
| **UiSpec** | 窓と部品の設定の検証の共通処理（項目名を含むエラー、知らない項目の検出）、固定の値または描くたびに呼ぶ関数で渡された文字の読み出し、描く関数の種類の名前の一覧（`LOOK_KINDS`） | 部品ごとの処理、Canvas の操作 |
| **UiRect** | 論理座標の矩形の計算（点を含むか、重なり） | 部品の知識 |
| **UiMetrics** | 既定の大きさ（タイトルバーの高さ、部品の高さ、スライダーの高さ、文字の大きさ）と、スライダーの固定の大きさ（つまみ、溝の太さ、遊びの幅）の論理座標の数値 | 論理解像度や画素の倍率からの自動の計算、色などの見た目の値 |
| **UiRenderer** | 窓の描画の手順（種類の順、部品の窓の内側での切り取り、種類ごとの描く関数の選択と `save` / `restore` で囲んだ呼び出し） | 状態の変更、当たり判定、標準の見た目の中身 |
| **UiStandardLook** | 標準の見た目（単色の塗り・枠・文字。フォントは `sans-serif` などの既定の指定）で種類ごとに描く関数 | 画像・フォントの読み込み、状態の変更、ゲーム固有の値 |
| **Sound** | AudioContext の管理（最初の入力と、ブラウザが止めたあとの入力での再開を含む）、音声のデコードと名前での保持、SEとBGMの再生、フェード、音量 | BGMの状態遷移（ピンチなどの判定はゲーム側）、ファイルの読み込み |
| **Storage** | 単一JSONの保存と読み込み、版番号が違うときの既定値への初期化、`localStorage` が使えないときのメモリ上での継続 | セーブ内容の定義、移行処理 |
| **DebugOverlay** | FPSの計算（表示の有無にかかわらず毎フレーム）と値の保持、表示の有無と位置（画面の四隅）の保持、表示（表示の `save` / `restore` の中での論理座標への拡大の設定を含む）、位置の値の一覧（`FPS_POSITIONS`）の定義 | ゲーム状態の参照、公開APIの引数の検証（`Engine` が行う） |
| **js/main.js** | `Engine.start` に渡す設定（解像度、レイヤー、最初のシーン（boot 画面と、その次に進む画面の指定）、`debug`、`virtualPad` など）の用意と `Engine.start` の呼び出し | ゲームロジック、描画処理 |
| **js/scenes/** | シーンごとの進行と、`effect/`・`entities/` の呼び出し、`ui` レイヤーの画面構成（文字、画像、ボタン、暗幕）、スプライトの配置（位置と回転の設定と `draw` の呼び出し）、スプライトの焼き付け（`CanvasCache` での作成をシーンの `init`、手放しを `destroy` で行う）。タイトルとプレイの共通処理（`FlightScene`。機体の焼き付けの作成と手放しを含む）、ミュートの保存と反映（`mute.js`）、文字の共通処理（`uiText.js`）、メニューの仕組み（`MenuScene`）、土台のメニューの項目（`playMenu.js`）、スローの切り替えと入り切りの指定（`slow.js`）、FPS の表示の切り替えと選択肢の値での読み書き（`fps.js`）、UI の見本の窓（05-02 の見本の中身と、2つの見本の開き方 `uiSample.js`、値を変える部品の見本の中身 `uiValueSample.js`、窓を置くシーン `UiSampleScene`、差し替えた見た目 `uiSampleLook.js`）、boot 画面（`BootScene`。最初の入力を受け、次の画面へ進む。ファイル全体の目印はなく、押した瞬間の SE だけ目印付き）もここに置く | 細かい動きや描画の実装（機体の動き、星・トレイル・風の描画） |
| **js/ui/** | バーチャルパッドの定義（配置、キーの割り当て、画像のファイル名）、画像の読み込みと描画 | ゲーム進行、目印の付いたコードの import |
| **js/effect/** | 星、トレイルなどの演出の更新と描画 | ゲーム進行に影響する処理 |
| **js/entities/** | 位置や状態の保持、動きの更新、自動操縦 | 描画命令の直書き（描画はスプライトや `effect/` に任せる） |
| **assets/sprites/*.js** | 見た目の描画（`oz/ENGINE_API.md` 23章の約束）。`ship.js` は OZ Vector Editor の書き出しファイルで、手で編集しない | 位置や動き、外部への依存（組み立て用のJSがパーツのスプライトJSを `import` することを除く） |

**エンジンに入れないもの:** スプライトの描画処理（絵の中身を描くこと。`CanvasCache` は渡された描く処理を呼んで焼き付けるだけで、これと両立する）、アニメーション、カメラ、当たり判定、物理、パーティクル、Entity基底クラス、遷移演出。必要になったPhaseで、発注者の承認を得てから検討する（憲法3章「先回り実装の禁止」）。

**自動テスト（`test/`）の規則:**

* **実行方法:** リポジトリのルートで `node --test`（引数なし）を実行し、結果の `fail 0` で判定する（憲法1章「検証コマンド」）。`package.json` は作らず、使ってよいのは Node.js の標準モジュールだけである（npm パッケージは使わない）。`node:test` と `node:assert/strict` を基本とし、指紋一覧のテストでは `node:crypto`・`node:fs`・`node:path`・`node:url` も使う。Node.js はテストの実行にのみ使い、ゲームの実行・配信には使わない。確認した版は v24.15.0 である。
* **置き場所と命名:** `test/<対象モジュール名>[.<観点>].test.js`（対象がモジュールでない場合は、対象のファイルの名前を使う。指紋一覧は `test/FINGERPRINTS.test.js`）。`test/` にはテスト以外の `.js`（共有の補助モジュールを含む）を置かず、補助関数は各テストファイルの中に書く。`node --test` は既定のパターンに合うファイルをすべて実行するので、そのパターンに合う名前（`*.test.js`・`*-test.js`・`*_test.js`・`test-*.js`・`test.js`）を `test/` の外のファイルに付けてはならない。
* **import の規則:** 対象を `oz/src/` から相対パスで直接 import し、`oz/index.js` は import しない。公開されたものだけを通して確かめ、テストのためにソースを変えない。依存は `test/ → oz/src/` の一方向で、`oz/`・`js/`・`assets/`・`index.html` は `test/` を参照しない。指紋一覧のテストは `oz/src/` を import せず、`oz/` 以下のファイルをデータとして読む（`oz/` のパスは `import.meta.url` から求める）。
* **偽の `window`:** テストファイル内の素のオブジェクトで作り、`globalThis.window` に置いた場合はテストの終了時に（`t.after` で）元に戻す。`window` 以外のグローバルには代入しない。`t.after` は登録した順に動くため、1つのテスト（`t`）で偽の `window` を置くのは1回だけにし、ケースを繰り返すときはサブテストに分ける。`console.warn` は `t.mock.method` で抑止する。状態を持つ `Storage` は、クエリ付きの動的 import でテストごとに読み込み直す。
* **対象:** `Time`・`Scenes`・`Screen`・`Storage`・`Keys`・`VirtualPad`・`VirtualPads`（`Keys`・`VirtualPad`・`VirtualPads` は `window` を使わない）、`CanvasCache`（Canvas を使わない部分: 引数の検証、画素数と余白の計算、画素合わせの判定、起動前のエラー。焼き付けと描画、自動の焼き直しはテストしない。`window` を使わない）、`DebugOverlay`（Canvas を使わない部分: FPS の値の計算、最初の計算までの `null`、表示の有無と位置の保持、位置の値の一覧。描画はテストしない。`window` を使わない）、`Ui`（起動前のエラー、戻り値の操作、中央に置くこと。`window` を使わない）、`UiWindow`（Canvas を使わない部分: 窓と部品の設定の検証、窓の形、部品の当たり判定と窓の内側での切り取り、押す・ずらす・離す・取り消しの流れ、押せないボタン、窓の外で閉じる・閉じない、`'down'` の無い入力、読む関数の呼び出し、チェックボックス・スライダー・選択肢の列の設定の検証、書く関数が呼ばれる条件と渡される値、スライダーの位置から値への変換（刻み、端、小数の丸め、遊び、離したとき、外へずれたときのドラッグ）、選択肢の列の等分と向き。`UiButton`・`UiValue`・`UiCheckbox`・`UiSlider`・`UiChoices`・`UiSpec`・`UiRect`・`UiMetrics` は `UiWindow` を通して確かめる（定数の `LOOK_KINDS`・`DEFAULT_*`・`SLIDER_*` は直接確かめる）。`window` を使わない）、指紋一覧（`oz/FINGERPRINTS.txt` が `oz/` の中身と一致すること）。テストしないモジュール: `Scene`・`Input`・`Sound`・`Assets`・`Layers`・`GameLoop`・`Engine`・`Buttons`・`UiRenderer`・`UiStandardLook`（`UiRenderer`・`UiStandardLook` は描画と標準の見た目の中身のため。`Sound` は読み込み時に `window` を使うため、対象にするときに登録の時期を検討する）。

**指紋一覧（`oz/FINGERPRINTS.txt`）の規則:**

* **形式:** 1行に1ファイル、`<SHA-256 の16進64文字><空白2つ><oz/ からの相対パス>`、パスのバイト順、LF で終わる。一覧ファイル自身は含めない。指紋は中身から CR（0x0D）を取り除いてから求める（作業ツリーの改行が LF と CRLF のどちらでも同じ指紋になるようにするため）。
* **作り直しの時期:** `oz/` の中のファイル（`ENGINE_API.md` だけの変更を含む）を変更・追加・削除するタスクの最後に作り直し、`node --test` が `fail 0` であることを確かめる。一覧を手で編集しない。
* **作り直しのコマンド**（Git Bash、リポジトリのルートで実行）:

  ```bash
  (cd oz && find . -type f ! -path ./FINGERPRINTS.txt | sed 's|^\./||' | LC_ALL=C sort | while IFS= read -r f; do printf '%s  %s\n' "$(tr -d '\r' < "$f" | sha256sum | cut -c1-64)" "$f"; done > FINGERPRINTS.txt)
  ```

* 一覧が古いと `test/FINGERPRINTS.test.js` が失敗する。ゲームのプロジェクトでの照合は `_doc/newgame/NEW_GAME_GUIDE.md` 5章に書く。
