# OZ Engine API

このドキュメントだけで、エンジンを使うゲーム（利用側）を実装できる。

## 1. 概要と使えるもの

利用側が使えるのは次の7つだけである。

```js
import { Engine, Scene, Assets, Sound, Storage, CanvasCache, Ui } from 'oz';
```

* `Engine` : 起動、シーンの操作、`timeScale` の読み書き、FPS の表示の出し入れと位置、FPS の値の読み取り（14章）、ボタンの登録、キーの状態の取得、バーチャルパッドの登録と状態の取得
* `Scene` : シーンの基底クラス
* `Assets` : 画像と音声のロードと取得
* `Sound` : 音の再生と音量
* `Storage` : 設定の保存
* `CanvasCache` : 描く処理の焼き付け（25章）
* `Ui` : 窓と UI 部品（ボタン、数値・文字の表示、チェックボックス、スライダー、選択肢の列、タブ、スクロールする領域）（26章）

ブラウザの Canvas 2D と ES Modules で動く。ビルドは不要だが、実行には静的サーバが必要である（`file://` では ES Modules が動かない）。

## 2. `index.html` の書き方

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Game</title>
  <script type="importmap">
    { "imports": { "oz": "./oz/index.js", "assets/": "./assets/" } }
  </script>
  <style>
    html, body {
      margin: 0; height: 100%; background: #000; overflow: hidden;
      touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
    }
    body { display: flex; align-items: center; justify-content: center; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas></canvas>
  <script type="module" src="./js/main.js"></script>
</body>
</html>
```

* canvas の表示サイズ（`style.width` / `style.height`）はエンジンが設定する。CSS で幅と高さを指定しないこと。
* canvas の画素数（`width`・`height` の属性）もエンジンが設定する（4章）。HTML で指定しても上書きされる。
* 中央寄せと黒い余白は、上の CSS で行う。
* `viewport` の `meta` は、スマートフォンでページが縮小表示されたり、2本の指で拡大されたりするのを止める。
* `html, body` の `touch-action: none` は、canvas の外の黒い余白でも、拡大とスクロールを止める。
* `user-select: none`（`-webkit-user-select: none` を含む）は、文字の選択を止める。`-webkit-touch-callout: none` は、長押しのメニューを止める。
* canvas の上では、エンジンが同じ種類のスタイルを設定する（16章）ので、`index.html` が違っても canvas の上では効く。

## 3. `Engine.start(config)`

エンジンを起動する。戻り値はない。2回呼ぶとエラーになる。設定が不正な場合も、項目名を含む `Error`（先頭に `[oz] Engine.start:`）を投げる。

| 項目 | 必須 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `canvas` | 必須 | - | canvas 要素（`document.querySelector('canvas')` の結果が `null` ならエラー） |
| `width` | 必須 | - | 論理解像度の幅。正の有限数 |
| `height` | 必須 | - | 論理解像度の高さ。正の有限数 |
| `layers` | 必須 | - | レイヤー名の配列。空でない。奥から手前の順 |
| `scene` | 必須 | - | 最初のシーン。`Scene` のインスタンス（クラスそのものはエラー） |
| `tickRate` | 任意 | `60` | 1秒あたりの `update` のティック数。正の有限数 |
| `debug` | 任意 | `false` | 真なら FPS を表示した状態で始める（`Engine.fpsVisible` の起動時の値。14章）。真偽は `Boolean(...)` で解釈し、型の検証はしない |
| `virtualPad` | 任意 | `false` | 真ならバーチャルパッド（画面のスティックとボタン。24章）の仕組みを有効にする。真偽は `Boolean(...)` で解釈し、型の検証はしない |

最小の起動例:

```js
import { Engine, Scene } from 'oz';

Engine.start({
  canvas: document.querySelector('canvas'),
  width: 1280,
  height: 720,
  layers: ['main'],
  scene: new Scene(),
});
```

## 4. 画面

* `width` / `height` が描画の座標（論理解像度）になる。原点は左上で、x は右、y は下へ増える。
* Canvas の画素数（`canvas.width`・`canvas.height`）は論理解像度と一致しない。エンジンが、表示の大きさ（CSS の画素数）に画面の画素密度（`devicePixelRatio`。上限 2）を掛けた大きさにし、ウィンドウの大きさが変わると追従させる。起動設定で変えることはできない。
* `draw` に渡す `ctx` には、論理座標で描けるように拡大の変換がエンジンによって設定されている。線と文字は画面の画素でくっきり描かれる。
* `ctx.canvas.width`・`ctx.canvas.height` を論理解像度として使わないこと。解像度は起動設定の `width`・`height` を使う（シーンに渡しておく）。
* `ctx.setTransform`・`ctx.resetTransform` で変換を初期化すると、論理座標が崩れる。変換を変えるときは、`save` と `restore` の中で `translate`・`rotate`・`scale` などを使うこと（13章、23章）。
* `getImageData`・`putImageData` のように画素を直接読み書きする操作は変換が効かず、画素数の座標になる。
* 表示は、ウィンドウに収まる最大の大きさに自動で合わせられる。縦横比は保たれ、ウィンドウの大きさを変えても追従する。
* キャンバスは毎フレーム透明に消去される。シーンが描かない部分にはページの背景（上の CSS では黒）が見える。

## 5. シーンの作り方

`Scene` を継承し、必要なメソッドだけを書く。書かなかったメソッドは何もしない。

| メソッド | 呼ばれるタイミング |
| --- | --- |
| `init()` | スタックに積まれた直後に1回 |
| `update(dt)` | 最前面のシーンだけ、ティックごとに（1フレームに0回以上） |
| `draw(ctx, layer, time)` | 毎フレーム、スタックの全シーンについてレイヤーごとに |
| `onPointer(pointer)` | ポインタ入力のとき、最前面のシーンだけ（16章） |
| `onKeyDown(code)` | キーを押した瞬間、最前面のシーンだけ（17章） |
| `destroy()` | スタックから外されたときに1回 |

* `new Scene()` は何も描かないシーンとして使える。
* シーンを積むたびに、新しいインスタンスを作ること（外したインスタンスを再利用しない）。

動くシーンの例:

```js
class MoveScene extends Scene {
  x = 0;

  update(dt) {
    this.x += dt * 0.1; // dt はミリ秒
  }

  draw(ctx, layer, time) {
    if (layer !== 'main') return;
    ctx.save();
    ctx.fillStyle = '#3498db';
    ctx.fillRect(this.x, 100, 200, 200);
    ctx.restore();
  }
}
```

## 6. シーンの操作

| API | 内容 |
| --- | --- |
| `Engine.changeScene(scene)` | スタックを全部外して、`scene` を1つ積む |
| `Engine.pushScene(scene)` | 最前面に `scene` を積む |
| `Engine.popScene()` | 最前面のシーンを外す |

* 引数が `Scene` のインスタンスでないとエラーになる（スタックは変更されない）。`Engine.start` の前に呼んでもエラーになる。
* 呼ばれる順序: `changeScene` は最前面から順に全シーンの `destroy()` を呼び、そのあと新しいシーンの `init()` を呼ぶ。`pushScene` は `init()` のみ、`popScene` は `destroy()` のみ呼ぶ。
* 積むと、背面のシーンは `update` が止まり、`draw` は続く。戻すと背面のシーンの `update` が再開する。
* 積むと、背面のシーンには入力（`onPointer`・`onKeyDown`）も届かず、背面のシーンのボタンも反応しない。背面のシーンのバーチャルパッド（24章）も反応しない。戻すと再び届き、反応する。
* ポーズは専用APIではなく、ポーズ用のシーンを `pushScene` で積み、`popScene` で戻して作る。

## 7. 操作を呼んでよい場所

* 呼んでよい: `update`・`onPointer`・`onKeyDown`・`onPress`（18章）の中と、フレーム処理の外（タイマー、`Assets.load` の完了など Promise の完了時）。
* 呼ばない: `draw`・`init`・`destroy` の中。実行時の検出はしないので、呼んだ場合の動作は保証されない。

## 8. 操作の直後の時間

シーンの操作があったフレームでは、残りのティックが回らない。次のフレームの経過時間も進まない。これにより、操作のあとに動きが飛ばない。フレーム処理の外で操作した場合は、次のフレームでティックが回らない。

入力の配信（`onPointer`・`onKeyDown`・`onPress`）の中で操作した場合も同じで、そのフレームのティックは回らず、次のフレームの経過時間も進まない。そのフレームの残りの入力は、新しい最前面のシーンへ届く。

## 9. スタックが空のとき

* `popScene` などでスタックが空になってもエラーにならない。シーンのメソッドは何も呼ばれない。
* 空のスタックへの `popScene` は何もしない。
* 配る先のない入力は捨てられる。`Engine.isKeyDown` は使える。
* 画面の消去と、FPS の表示（14章）は続く。
* `pushScene` または `changeScene` で再開できる。

## 10. レイヤーの重なり方

`layers` の順に、奥から手前へ描かれる。各レイヤーについて、スタックの下のシーンから順に `draw` が呼ばれる。シーンの中で描く順序には左右されない。

`layers: ['bg', 'fg']`、スタックが `[A, B]`（B が最前面）の場合の `draw` の呼び出し順:

```text
A/bg → B/bg → A/fg → B/fg
```

手前のシーン B の奥のレイヤー（`bg`）は、奥のシーン A の手前のレイヤー（`fg`）より先に描かれる。全体を覆いたいシーンは、手前のレイヤーに描くこと。

`draw` の呼び出しごとに `ctx.save()` / `ctx.restore()` で囲まれるので、`draw` の中で `ctx` の状態（`fillStyle` など）を変更しても、次の `draw` に影響しない。

## 11. 時間

* `update(dt)` の `dt` : 1ティックの長さ（ミリ秒、`1000 / tickRate`）。常に一定で、`timeScale` の影響を受けない。
* `draw` の `time` : 読み取り専用のオブジェクト。代入するとエラー（`TypeError`）になる。

| 項目 | 内容 |
| --- | --- |
| `time.realDelta` | 前フレームからの実時間の差（ミリ秒）。初回は `0` |
| `time.gameTime` | ゲーム内の累積時間（ミリ秒）。`timeScale` に応じて進む |
| `time.timeScale` | 現在の `timeScale` |

* 1フレームで進む時間の上限は5ティック分である。タブを裏に回してから戻しても、動きは飛ばない。`gameTime` も同じ上限に従う。`realDelta` は丸められず、実時間の差分がそのまま入る。

## 12. `timeScale`

`Engine.timeScale` で読み書きする（`Engine.start` の後から使える）。

* 起動時の値は `1`（等速）である。小さくすると遅くなる。`0` なら `update` は呼ばれず、`draw` は続く。
* `0` でも入力は届く。再開には `onPointer`・`onKeyDown`・`onPress` の中で値を戻せばよい。
* 入力の配信の中で変更した値は、次のフレームの時間から効く。変更したフレームは、蓄積済みの分の `update` が回ることがある。
* 負の値や数値以外を代入すると `RangeError` になる。
* 描画の補間はしない。小さくすると、動きはティック単位で段階的になる。
* 音は `timeScale` の影響を受けない。`0` でも BGM とフェードは進む（21章）。

```js
Engine.timeScale = 0.5; // 半分の速さ
```

## 13. 動きの指針

* 動きは `update(dt)` で進める。`time.gameTime` は周期的な動き（`Math.sin` など）に使う。
* `update` の中で描画しない。`draw` の中でシーンの状態を変更しない。
* `draw` の中で `ctx` の状態を変更するときは、`ctx.save()` と `ctx.restore()` を対で使う。

## 14. FPS の表示

FPS（1秒あたりのフレーム数）を画面の四隅のどれかに表示でき、値をゲームから読める。表示は最前面（すべてのレイヤーとシーンの上）に出る。見た目（文字の大きさ・色・縁取り）は変えられない。

`Engine.start` の後から次の3つが使える。

| API | 読み書き | 値 | 既定 |
|---|---|---|---|
| `Engine.fpsVisible` | 読み書き | `true`（表示）/ `false`（非表示） | 起動設定 `debug` を `Boolean(...)` にした値（`debug` を省くと `false`） |
| `Engine.fps` | 読み取りのみ | 整数の FPS。起動から約1秒は `null` | `null` |
| `Engine.fpsPosition` | 読み書き | `'top-left'`・`'top-right'`・`'bottom-left'`・`'bottom-right'` | `'top-left'` |

* 起動設定 `debug` は、`Engine.fpsVisible` の起動時の値だけを決める（3章）。位置は起動設定では指定できない（起動後に `Engine.fpsPosition` で変える）。

```js
// 毎フレームの draw で、FPS の値を読んで文字を描く（draw の中では読むだけ）
draw(ctx, layer, time) {
  if (layer !== 'main') return;
  const fps = Engine.fps; // 起動から約1秒は null
  ctx.fillText(fps === null ? 'FPS: --' : `FPS: ${fps}`, 20, 40);
}

// ボタンやキーの処理で、表示の出し入れと位置を変える
onKeyDown(code) {
  if (code === 'KeyF') Engine.fpsVisible = !Engine.fpsVisible;
  if (code === 'KeyG') Engine.fpsPosition = 'bottom-right';
}
```

### 値と表示

* **FPS の計算:** 約1秒ごとに、その間のフレーム数を経過時間で割り、四捨五入した整数にする。
* **値が変わる時期:** 約1秒に1回、各フレームの最後（`draw` の後）。1フレームの間（入力の配信・`update`・`draw`）は変わらないので、`draw` から読んでよい。
* **`null` の間:** 起動から最初の計算までの約1秒は `Engine.fps` が `null`。表示の `FPS: --` に当たる。
* **表示を消している間:** `Engine.fpsVisible` が `false` でも FPS の計算は続き、`Engine.fps` は更新される。
* **位置:** 四隅のどれか。隅からの距離はどの隅も同じ（論理座標で 8）で、右の隅は右寄せ、下の隅は下寄せで描くので、文字の長さが変わっても隅からの距離は変わらず、画面の外にはみ出さない。位置は論理解像度（`width`・`height`）に対して決まり、ウィンドウの大きさや画素の倍率が変わっても同じ隅に付く。

### 代入の効き方と場所

* `Engine.fpsVisible`・`Engine.fpsPosition` への代入は、次の表示から効く。入力の配信（`onPointer`・`onKeyDown`・`onPress`）や `update` の中で代入した場合は、そのフレームの表示から効く。
* 代入してよい場所は、`update`・`onPointer`・`onKeyDown`・`onPress` の中と、フレーム処理の外。`draw` の中では読むだけにする（13章）。

### エラー

* **起動前:** `Engine.fpsVisible`・`Engine.fps`・`Engine.fpsPosition` の読み書きは `Error`（例: `[oz] Engine.fpsVisible: Engine.start の前には使えません`）。ただし `Engine.fps` は setter が無いので、代入は起動前でも下の `TypeError` になる（読むと起動前は `Error`）。
* **`Engine.fpsVisible` に真偽値以外:** `RangeError`（例: `[oz] Engine.fpsVisible: true か false で指定してください: 1`）。値は変わらない。
* **`Engine.fpsPosition` に4つ以外:** `RangeError`（例: `[oz] Engine.fpsPosition: 'top-left'・'top-right'・'bottom-left'・'bottom-right' のどれかで指定してください: center`）。値は変わらない。
* **`Engine.fps` への代入:** 起動の前後にかかわらず、strict モードのコード（ES Modules の中。ゲームのコードは常にこれ）では `TypeError` で、値は変わらない。strict でないコード（開発者ツールのコンソールなど）ではエラーにならず無視され、値は変わらない。
* フレーム処理の中でこれらのエラーを起こすと、ほかの例外と同じくループが止まる（15章）。

## 15. 例外

* フレーム処理の中（`update`・`draw`・`onPointer`・`onKeyDown`・`onPress`、およびこれらから呼んだシーン操作による `init`・`destroy`）でシーンのメソッドまたはボタンの関数が例外を投げると、ループが止まり、コンソールにエラーが残る。
* フレーム処理の外（タイマー、Promise の完了時など）からのシーン操作で `init`・`destroy` が例外を投げた場合は、例外が呼び出し元へ伝わるだけで、ループは止まらない。そのときのスタックの状態:
  * `init` が失敗したシーンは、スタックに積まれたまま残る。次のフレームはティックが回らないので（8章）`update` は呼ばれず、`update` が呼ばれるのはその次のフレーム以降になる。ただし次のフレームでもティックの前に入力は配られるので、失敗したシーンが最前面なら、そのシーンの `onPointer`・`onKeyDown`・ボタンの `onPress` は呼ばれることがある。`draw` も呼ばれる。
  * `destroy` が失敗したシーンは、`popScene`・`changeScene` のどちらでもスタックから外れている。
  * `changeScene` の途中で `destroy` が失敗すると、新しいシーンは積まれず、スタックは途中まで外れた状態で残る。
* `Engine.start` の中で最初のシーンの `init` が失敗した場合は、例外が `start` から投げられ、ループは始まらない。
* `Assets.image` のエラー（ロードされていない名前。20章）をフレーム処理の中で起こすと、シーンのメソッドの例外と同じくループが止まる。
* `Assets.load` は、ファイルの読み込みに失敗しても警告を出して続行する（20章）。
* `Sound.playSe`・`Sound.playBgm` のエラー（一覧にない名前など。21章）をフレーム処理の中で起こすと、シーンのメソッドの例外と同じくループが止まる。
* `Storage` のエラー（`open` の前の `get`・`set`、`defaults` にない名前、JSON にできない値など。22章）をフレーム処理の中で起こすと、シーンのメソッドの例外と同じくループが止まる。
* `CanvasCache` のエラー（引数の誤り、手放した焼き付けの使用など。25章）や、焼き付けの途中で描く処理が投げた例外をフレーム処理の中で起こすと、シーンのメソッドの例外と同じくループが止まる。

## 16. ポインタ入力

`onPointer(pointer)` の `pointer` は `{ type, x, y }` である。`type` は `'down'`・`'move'`・`'up'`、`x`・`y` は描画と同じ論理座標である。戻り値は使わない。

* 最前面のシーンだけに届く。
* マウス、タッチ、ペンを同じように扱う。主ボタンだけを扱い、右クリック、中クリックは扱わない。
* `onPointer` は単一ポインタである。バーチャルパッド（24章）が処理した指を除いて、パッドの外で押しているポインタが同時に2本以上あるときは、ほかに押しているポインタが無いときに押し始めた1本だけが、離すまで届く。そのあいだに押し始めたポインタは、離すまで届かない。
* バーチャルパッドを有効にした場合（`virtualPad`。3章）、タッチは指ごとに受け取る。パッドが処理した指（パッドのスティックやボタンの円の内側で押し始めた指）は、離すまで `onPointer` にも画面のボタン（18章）にも届かない。
* ペンはマウスと同じ扱いで、バーチャルパッドには反応しない。
* 押さずにマウスを動かしても `'move'` が届く。連続した `'move'` は1フレームに1つにまとめられることがある。
* 押したまま canvas の外へ出ても `'up'` が届く。このとき `x`・`y` は論理解像度の範囲外の値になることがある。
* 押下の中断も `'up'` として届く。
* 入力は canvas の上でだけ受け取る。押さずに canvas の外（中央寄せで生じる余白を含む）を動かしたり、そこで押したりしても何も届かない。canvas の外で押してから canvas の上へ入ると、`'down'` のない `'move'` だけが届き、離しても `'up'` は届かない。
* タッチでページがスクロールや拡大をしないように、エンジンが canvas の `touch-action` を `none` に設定する。あわせて、文字の選択や長押しのメニューが出ないように、`user-select`・`-webkit-user-select`・`-webkit-touch-callout` も `none` に設定する。
* タッチの長押しで出るメニュー（`contextmenu`）は、エンジンが止める。PC のマウスの右クリックのメニューは止めない。
* 座標がずれるので、canvas の CSS に `border`・`padding` を付けない。
* 押下を受けたシーンの操作で最前面のシーンが変わると、新しいシーンには `'down'` のない `'move'`・`'up'` が届くことがある。

```js
class DragScene extends Scene {
  x = 0;
  y = 0;
  dragging = false;

  onPointer({ type, x, y }) {
    if (type === 'down') this.dragging = true;
    if (type === 'up') this.dragging = false;
    if (this.dragging) {
      this.x = x;
      this.y = y;
    }
  }
}
```

## 17. キーボード入力

* キーは `KeyboardEvent.code` の文字列（`'Space'`、`'KeyA'`、`'Digit1'`、`'Escape'` など）で指定する。
* `onKeyDown(code)` は押した瞬間に、最前面のシーンだけに届く。キーリピートでは呼ばれない。
* `Engine.isKeyDown(code)` は押している間 `true` を返す。どのメソッドの中からでも呼べる（`Engine.start` の前はエラー）。値は入力を確定するときだけ変わり、1フレームの間は変わらない。
* 押してから離すまでが1フレームより短くても、`onKeyDown` は必ず呼ばれ、そのフレームの間は `isKeyDown` が `true` になり、次のフレームで `false` になる。
* `isKeyDown` は実時間のフレーム単位で変わるため、`timeScale` が小さいときは、ティックの間に押して離したキーが `update` から見えないことがある。取りこぼしたくない操作は `onKeyDown` を使う。
* バーチャルパッド（24章）を有効にしている場合、パッドが押しているキーも、キーボードのキーと同じように `isKeyDown`・`onKeyDown` に現れる。キーボードとパッドで同じキーを押しているときは、`onKeyDown` は先に押した側の1回だけ呼ばれ、片方を離してももう片方が押していれば押したままになる。
* ウィンドウからフォーカスが外れると、押している状態はすべて解除される（パッドのキーも解除される）。詳しくは24章。
* ブラウザの既定の動作（F5、F12 など）は止めない。

```js
class PlayerScene extends Scene {
  x = 0;
  jumps = 0;

  onKeyDown(code) {
    if (code === 'Space') this.jumps += 1;
  }

  update(dt) {
    if (Engine.isKeyDown('ArrowRight')) this.x += dt * 0.1;
  }
}
```

## 18. ボタン

`Engine.addButton(scene, { x, y, width, height, onPress })` でシーンにボタンを登録する。

| 項目 | 内容 |
| --- | --- |
| `x`, `y` | 矩形の左端と上端（論理座標）。有限の数値 |
| `width`, `height` | 矩形の幅と高さ。正の有限数 |
| `onPress` | 押されたときに引数なしで呼ばれる関数 |

* 不正な引数はエラーになる。`Engine.start` の前に呼んでもエラーになる。
* `init` の中で登録する（最初のシーンの `init` でも使える）。constructor の中では、`Engine.start` の前に作るシーンで使えない。
* バーチャルパッド（24章）が処理した指は、画面のボタンに届かない。
* ポインタの `'down'` の位置が矩形の内側なら `onPress()` が呼ばれる。その押下は、離すまでの `'move'`・`'up'` も含めて、シーンの `onPointer` に届かない。`onPress` の中でシーンが変わっても、新しいシーンにも届かない。
* 左端と上端を含み、右端と下端を含まない。重なっている場合は、後に登録したものだけが反応する。
* 反応するのは最前面のシーンのボタンだけである。背面になると反応せず、戻ると再び反応する。スタックから外れたシーンのボタンは反応しない。
* エンジンはボタンを描かない。利用側がシーンの `draw` で描く。
* 描かれる・押せなくできる・離したときに反応するボタンは、26章の窓の中の部品のボタン（`addButton`）で作れる（この章のボタンの仕様は変わらない）。
* 削除、移動、有効無効の切り替えはできない。

```js
class MenuScene extends Scene {
  button = { x: 40, y: 600, width: 180, height: 80 };

  init() {
    Engine.addButton(this, {
      ...this.button,
      onPress: () => Engine.pushScene(new PauseScene()),
    });
  }

  draw(ctx, layer) {
    if (layer !== 'main') return;
    const { x, y, width, height } = this.button;
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }
}
```

## 19. 入力の届くタイミングと順序

* 入力は `timeScale` に関係なく毎フレーム1回、`update` の前に届く。`timeScale` が `0` の間も届き、スロー中も遅れない。
* `onPointer`・`onKeyDown`・`onPress` は、`draw` の中やブラウザのイベントの中からは呼ばれない。
* 1フレームの順序: 時間を進める → 届いた順に入力を配る → `update` を0回以上 → `draw`。
* 入力を配る始めに、溜まったタッチの指を、そのときの最前面のシーンのバーチャルパッド（24章）へ振り分ける。パッドが処理した指は `onPointer` にも画面のボタンにも届かない。同じフレームの中でシーンが変わっても、振り分けは配る始めの最前面のシーンで行う。
* パッドのキー（`onKeyDown`・`isKeyDown` に現れるもの）は、その指のイベントがあった位置で、ほかの入力と届いた順を保って届く。
* ポインタはボタン → 最前面のシーンの順に、キーは最前面のシーンに届く。

## 20. アセット

`Assets` で画像と音声をロードし、画像を名前で取り出す。`Assets` は `Engine.start` の前から使える（`Engine` の各操作と違い、前に呼んでもエラーにならない）。

| API | 内容 |
| --- | --- |
| `Assets.load({ images, sounds })` | 一覧の画像と音声をロードする。すべて終わると解決する Promise を返す（値は `undefined`） |
| `Assets.image(名前)` | ロード済みの画像を返す。`ctx.drawImage` に渡せる。`width`・`height` で元の画像の画素数を読める（縦横比を保った描画に使える） |

### `Assets.load`

* `images`・`sounds` は、名前からパスへのオブジェクトである。どちらも省略できる（`{}` でもよい）。
* 何度呼んでもよい。同じ名前を再びロードすると、後に始めたロードの結果に置き換わる（先に終わった順ではない）。
  * ロード済みの名前の再ロード中は、完了するまで前のものを使う。
  * まだ完了していない名前の再ロード中は、未ロードとして扱う（`Assets.image` や `Sound` はエラー）。先に始めたロードが先に終わっても同じである。
  * 再ロードが完了すると、新しいものを使う。再ロードが失敗すると、失敗の扱い（下記）に置き換わる。
  * 流れている BGM の名前を再ロードしても、流れている音はそのまま続く。
* `images` と `sounds` の名前は別々に管理する。同じ名前を両方に使ってよい。音声の名前は `Sound` で使う（21章）。
* パスはページ（`index.html`）からの相対パスで書く。import map の `assets/` は `import` にしか効かないので、ここでは使えない。
* スプライトJSは対象外である。`import` で読み込む（23章）。
* 進捗の通知はない。ロード中の表示はシーンで行う。

### 引数が不正なとき

次の場合は何も始めず、`Error`（先頭に `[oz] Assets.load:`）で reject する。同期的な例外にはならない。

* 引数がオブジェクトでない（`undefined`・`null`・配列・数値など）
* `images`・`sounds` 以外の項目がある（`image:` のような書き間違いを見つけるため）
* `images`・`sounds` が、省略でもオブジェクトでもない（`null`・配列を含む）
* 名前が空文字列、またはパスが空でない文字列でない

### 読み込みの失敗

* ファイルが読めない、画像として不正、音声をデコードできない、AudioContext が使えない、などの場合でも、Promise は失敗せず、読めた分で続行する。
* 失敗したファイルごとに、`[oz] Assets.load:` で始まる警告をコンソールに出す（名前とパスを含む）。
* 失敗した画像は、`Assets.image` が透明な1×1の画像（`width`・`height` は `1`）を返す。ページには追加されない。
* 失敗した音は、`Sound.playSe`・`Sound.playBgm` がエラーにならず何もしない（21章）。

### 取得

`Assets.image(名前)` は、一覧にない名前や、ロードの終わっていない名前でエラーになる。

### ロードの流れの例

ロード用のシーンの `init` で `Assets.load` を呼び、完了したら `Engine.changeScene` で本編へ切り替える。ロード中の表示は `draw` で行う。

```js
import { Engine, Scene, Assets } from 'oz';

class LoadScene extends Scene {
  init() {
    Assets.load({
      images: { player: './assets/images/player.png' },
      sounds: { jump: './assets/sounds/jump.mp3' },
    }).then(() => Engine.changeScene(new GameScene()));
  }

  draw(ctx, layer) {
    if (layer !== 'main') return;
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ロード中', 640, 360);
    ctx.restore();
  }
}

class GameScene extends Scene {
  draw(ctx, layer) {
    if (layer !== 'main') return;
    ctx.drawImage(Assets.image('player'), 0, 0);
  }
}
```

## 21. サウンド

`Sound` で SE と BGM を鳴らし、音量を変える。音声ファイルは `Assets.load` の `sounds` に書いた名前で指定する（20章）。一覧では SE と BGM を区別しない。`Sound` は `Engine.start` の前から使える（`Engine` の各操作と違い、前に呼んでもエラーにならない）。

| API | 内容 |
| --- | --- |
| `Sound.playSe(名前, { rate })` | SE を1回鳴らす。`rate` は再生速度（既定値 `1`） |
| `Sound.playBgm(名前, { fadeMs })` | BGM をループで流す。`fadeMs` はフェードインの長さ（ミリ秒、既定値 `0`） |
| `Sound.stopBgm({ fadeMs })` | BGM を止める。`fadeMs` はフェードアウトの長さ（ミリ秒、既定値 `0`） |
| `Sound.masterVolume` | 全体の音量（読み書き） |
| `Sound.bgmVolume` | BGM の音量（読み書き） |
| `Sound.seVolume` | SE の音量（読み書き） |

### SE

* 呼ぶと最初から鳴る。同じ SE を重ねて鳴らせる。
* 一覧にない名前や、ロードの終わっていない名前はエラーになる。
* `rate` はその1回の再生速度で、音程と長さが一緒に変わる。`1` で元の高さ、`2` で1オクターブ上になり長さは半分、`0.5` で1オクターブ下になり長さは2倍。
* 第2引数を省いたとき、または `rate` を省いたときは `1`（今までと同じ鳴り方）。
* `rate` は `0` より大きい有限数で、そうでなければ（`0` 以下、`NaN`、`Infinity`、数値以外）`RangeError` になり、音は鳴らない。
* 半音単位で上げ下げするときは `rate = 2 ** (半音の数 / 12)` で計算できる。
* 重ねて鳴らす SE のそれぞれに、別の `rate` を指定できる。

```js
let step = 0;

// 鳴らすたびに半音ずつ高くする
function playNext() {
  Sound.playSe('se', { rate: 2 ** (step / 12) });
  step += 1;
}
```

### BGM

* ループで流れる。`fadeMs` は `0` 以上の有限数で、そうでなければ `RangeError` になる（`playBgm`・`stopBgm` とも）。
* 流れている曲と同じ名前の `playBgm` は何もしない（フェードインの途中でも同じ）。そのため、シーンをまたいで流し続けられる。
* 別の曲を `playBgm` すると、前の曲がフェードアウトし、新しい曲がフェードインするクロスフェードになる（長さはどちらも新しい曲の `fadeMs`）。
* フェードアウト中の曲の名前を `playBgm` すると、その曲が頭から新しく流れ始める（フェードアウト中の音はそのまま消える）。
* フェードインの途中で `stopBgm` を呼んでも、音量は飛ばず、その時点の音量からフェードアウトする。
* BGM が流れていないときの `stopBgm` は何もしない。
* 一覧にない名前や、ロードの終わっていない名前はエラーになる。

### 読み込みに失敗した名前

`Assets.load` で読み込みに失敗した名前の `playSe`・`playBgm` は、エラーにならず何もしない。流れている BGM があれば、そのまま続く。ただし、読み込みに失敗した名前でも `rate`（`playSe`）と `fadeMs`（`playBgm`）の確認は行い、不正な値なら `RangeError` になる。

### 音量

* `0`〜`1` の数値で、既定値は `1`。範囲外と数値以外（`NaN`・文字列・`null` など）は `RangeError` になり、値は変わらない。
* 再生中の音にもすぐ効く。BGM のフェードとは掛け合わされる。
* ロードの前から設定できる。
* ミュートは `Sound.masterVolume = 0` で行う。

### AudioContext

音を使わないゲームでは AudioContext が作られない。

### 時間

音は実時間で進む。`timeScale` やポーズ用のシーンの影響を受けず、`timeScale` が `0` でも BGM とフェードは進む。PC のブラウザでは、タブを裏に回しても止まらない。スマートフォンでは、電話の着信、他のアプリへの切り替え、画面のロックなどで、ブラウザが音を止めることがある。土台に戻って画面に触れる（またはキーを押す）と再開する（次の「ブラウザが音を止めたとき」）。

### ブラウザが音を止めたとき

* 止まったあとの次の入力（画面に触れる、クリック、`Escape` 以外のキー。canvas の外でもよい）で再開する。ブラウザが自分で再開することもあり、そのときは入力なしに鳴り始める。エンジンは入力なしに再開を試みない。
* 流れていた BGM は、止まった位置から続きが鳴る。フェードも再開後に続きが進む。
* 止まっている間の `playSe` は捨てる（エラーにしない）。再開のための入力への反応の中で呼んだ分も、再開が終わる前なら捨てられることがある。
* 止まっている間の `playBgm`・`stopBgm` は受け付け、再開後にその結果の状態で鳴る（例: 止まっている間に別の曲を `playBgm` すると、再開後にその曲が流れる）。
* 名前の確認と `fadeMs`・`rate` の確認は、止まっている間も行う。
* 「最初の入力まで」（最初の入力より前の扱い）とは別の話である。

### 最初の入力まで

ブラウザの制限で、ユーザーの入力があるまで音は鳴らせない。

* 最初の入力より前の `playSe`・`playBgm` は、エラーにせず捨てる。入力のあとに鳴らし直すことはしない。
* 名前の確認（一覧にない名前のエラー）と `fadeMs`・`rate` の確認は、入力の前でも行う。
* `Escape` キーは入力に数えない。
* 最初の入力そのものへの反応（`onPointer` の `'down'`、`onKeyDown`）の中で呼んだ分は鳴る。タッチの押下では、ブラウザによっては鳴り始めが指を離すときになる（「タッチの最初の押下」を参照）。
* canvas の外での入力でも、解除される。
* BGM を流したいゲームは、最初の入力への反応の中で `playBgm` を呼ぶ。同じ曲なら何も起きないので、毎回呼んでよい。ボタンが消費した押下はシーンに届かない（18章）ので、必要ならボタンの `onPress` の中でも呼ぶ。`onPress` の中で呼んだ分も、最初の入力そのものへの反応として鳴る。
* 最初の入力を受けるだけの画面（土台の boot 画面のような、「TAP SCREEN」などを表示して、押す（離す）かキー（`Escape` 以外）を押すと次の画面へ進むだけの画面）を最初に置き、その画面を離れてから音を使う書き方もできる。この書き方なら、次の画面ではすぐ鳴らせる。次の画面の `init` で `playBgm` を呼んでよい。上の「最初の入力への反応の中で `playBgm` を呼ぶ」書き方と、どちらを選んでもよい。ロードが必要なゲームで、その画面自体で音を鳴らすなら、ロードを先に済ませる（読み込んでいない名前の音は鳴らせない）。その画面で音を鳴らしてもよいが、タッチでは鳴る時期がブラウザによって遅れる（「タッチの最初の押下」を参照）。
* 入力の前に音声をロードすると、Chrome がコンソールに黄色の警告を出すことがある。エラーではなく、動作に影響しない。

```js
import { Engine, Scene, Sound } from 'oz';

class TitleScene extends Scene {
  onPointer({ type }) {
    if (type === 'down') Sound.playBgm('title', { fadeMs: 1000 });
  }

  onKeyDown(code) {
    Sound.playBgm('title', { fadeMs: 1000 });
    if (code === 'Space') Sound.playSe('decide');
  }
}

Sound.bgmVolume = 0.5; // ロードの前から設定できる
```

### タッチの最初の押下

タッチでは、指を離すまで音を出すことを認めないブラウザと、押した瞬間から認めるブラウザがある。Android の Chrome では指を離したときに鳴り、iPhone の Safari（iOS）では押した瞬間に鳴った。そのため、最初の入力がタッチの押下のときは、指を離すまで認めないブラウザで次のようになる。

* `onPointer` の `'down'` やボタンの `onPress` の中で呼んだ音は、捨てられずに鳴るが、指を離すまで認めないブラウザ（Android の Chrome、PC の Chrome のタッチの再現機能）では、鳴り始めは押した瞬間ではなく指を離したときになる。BGM も同じである（`onPress` と BGM は実機では確かめていない）。
* 押したままの間に `update` などから `playSe` を何度も呼ぶと、その分が指を離したときに重なって同時に鳴る。これは PC の Chrome のタッチの再現機能でだけ確かめた。実機では確かめていない。
* 2回目以降の押下では、呼んだときにすぐ鳴る。マウスでは、最初の押下でも呼んだときにすぐ鳴る。
* 実機で確かめたのは、最初に画面に触れた押下の `'down'` で呼んだ `playSe` が鳴る時期だけである。Android の Chrome では指を離したときに鳴り、iPhone の Safari（iOS）では押した瞬間に鳴った。ボタンの `onPress` は実機では確かめていない。ほかの端末・ブラウザは確かめていない。

最初の入力を受けるだけの画面を最初に置き、その画面を離れてから音を使う書き方（「最初の入力まで」）にすれば、この節の影響（指を離すまで鳴らない、まとめて鳴る）を受けない。最初の入力を受ける画面で音を鳴らしてもよいが、鳴る時期はこの節のとおりブラウザによって遅れる。影響を受けないためには、その画面では音を鳴らさず、次の画面から鳴らす。

バーチャルパッド（24章）の指から生まれた `onKeyDown` が最初の入力になる場合も、パッドを最初の入力の画面に置かず、その画面を離れてからパッドのある画面へ進むことで避けられる。パッドの指が最初の入力になったときの鳴り方そのものは確かめていない。

### iPhone の消音スイッチ

iPhone では、本体の消音スイッチ（マナーモード）が入っていると、音が鳴らない。エンジンはこれに対応しない。消音スイッチが入っていても鳴らすための回避はしない。

## 22. セーブ

`Storage` で設定などの小さなデータを保存する。保存先はブラウザの `localStorage` である。`Storage` は `Engine.start` の前から使える（`Engine` の各操作と違い、前に呼んでもエラーにならない。`Storage.open` の前の `get`・`set` がエラーになるのとは別の話である）。

| 操作 | 内容 |
| --- | --- |
| `Storage.open({ key, version, defaults })` | セーブを開く。保存データを読み、`defaults` の名前だけを持つ状態にする |
| `Storage.get(名前)` | 値を取り出す |
| `Storage.set(名前, 値)` | 値を設定し、その場で保存する |

### `Storage.open`

* `key` : `localStorage` のキー。空でない文字列。
* `version` : 版番号。有限の数値。
* `defaults` : 名前から既定値へのオブジェクト。値は JSON にできるもの。空のオブジェクトも許す。`open` の時点でコピーを取るので、あとで元のオブジェクトを変更しても影響しない。
* 引数が不正なときと、2回目の呼び出しは `Error`（先頭に `[oz] Storage.open:`）になる。エラーのときは開いていない状態のまま残るので、直して呼び直せる。
* `open` は `localStorage` へ書き込まない。

### `Storage.get`・`Storage.set`

* `open` の前、`defaults` にない名前（`constructor` や `__proto__` を含む）は `Error` になる。
* `set` に渡せる値は JSON にできるものだけである。`null`、真偽値、文字列、有限の数値、配列、プレーンなオブジェクト（とその入れ子）が使える。`undefined`・関数・シンボル・BigInt・`NaN`・`Infinity`・`Date`・`Map`・循環参照（内側に含まれる場合も）は `Error` になり、値も保存も変わらない。
* `get` が返すのは値のコピーである。結果を書き換えても保存済みの値には影響しない。`set` に渡したオブジェクトを後から書き換えても影響しない。
* 保存は `set` のその場で行う。1つのキーに `{ version, data }` の単一の JSON として、全体が入る。

### 既定値で始める場合

次のとき、全部の名前が `defaults` の値で始まる。エラーにはならない。

* 保存データがない
* 保存データの版番号が `version` と違う
* 保存データが JSON として読めない
* 保存データの形が違う

移行処理はない。古いデータは最初の `set` まで消えず、`set` で新しい形に置き換わる。

版番号が同じなら保存値を使う。`defaults` に増えた名前は既定値になり、`defaults` にない保存値は捨てられる（次の `set` で保存からも消える）。

### `localStorage` が使えないとき

`localStorage` が使えない、または容量があふれたときは、例外を投げず、コンソールに警告（`[oz] Storage.open:` または `[oz] Storage.set:` で始まる）を出して、メモリの上で続ける。`get`・`set` は動くが、ページを閉じると失われる。保存に失敗した `set` のたびに警告が出て、次の `set` で再び保存を試す。

### 使い方の例

```js
import { Engine, Scene, Storage } from 'oz';

Storage.open({
  key: 'mygame',
  version: 1,
  defaults: { bgmVolume: 1, highScore: 0 },
});

class SettingsScene extends Scene {
  onKeyDown(code) {
    if (code === 'ArrowUp') Storage.set('bgmVolume', Math.min(1, Storage.get('bgmVolume') + 0.1));
  }
}
```

## 23. スプライトJS

スプライトJSは、`assets/sprites/` に置く、見た目を描くJSである。OZ Vector Editor が書き出す。エンジンは中身を解析せず、読み込みもしない（`Assets.load` の対象外。20章）。

### 使い方
利用側は `import` し、既定の export のオブジェクトの `draw(ctx)` を呼ぶだけである。import map の `assets/`（2章）を使って、次のように書く。

```js
import player from 'assets/sprites/player.js';
```

* エディタの書き出しの `bounds` は、キャンバスキャッシュ（25章）の範囲として読んでよい（図形が0個のときは `null`）。それ以外のキー（`format`・`formatVersion`・`elements`・`source` など）は、エンジンも利用側も読まない。
* `draw(ctx)` は `ctx` の状態を元に戻して終わる。
* スプライトは見た目だけを持つ。位置・HP・`update()` などの動きは、利用側のクラスが持つ。

### 座標と配置
* 座標の単位は px である。基準点はワールド座標の原点 (0, 0) で、y 軸は下向きである。エディタの px は、そのままゲームの px になる。
* 配置（位置・回転・拡大縮小）は、呼ぶ側が `ctx` の変換（`translate`・`rotate`・`scale`）で行ってから `draw` を呼ぶ。変換は `ctx.save()` と `ctx.restore()` で囲む（13章）。
* 回転の基準となる前方の向きは、ゲームごとに決める。エディタでもその向きで描く（具体的な向きはゲームの開発資料に書く）。

### 使い方の例
シーンの `draw` の中で、自機のスプライトを位置と角度を付けて描く。

```js
import { Scene } from 'oz';
import player from 'assets/sprites/player.js';

class PlayScene extends Scene {
  draw(ctx, layer) {
    if (layer !== 'main') return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    player.draw(ctx);
    ctx.restore();
  }
}
```

多数のスプライトを毎フレーム描くときは、キャンバスキャッシュ（25章）で焼き付けておくと、同じ書き方（位置と角度を付けて `draw(ctx)` を呼ぶ）で、毎フレームの描画を軽くできる。

### つなぎのスプライト
エディタで描けない絵を手で書く場合も、既定の export で `draw(ctx)` を持つ形（`export default { draw }`）にする。`format` などのデータのキーは持たなくてよい。手で書いてよい条件は、プロジェクトの憲法に従う。

### 組み立て用のJS
名前の頭に `_` を付けたJS（例 `_hero.js`）は、パーツのスプライトJSを組み立てる。スプライトJSは外部依存のない1ファイルとするが、組み立て用のJSは例外として、同じ `assets/sprites/` にあるパーツのスプライトJSを相対パス（`./body.js` など）で `import` してよい。エンジン（`oz`）・`js/`・`assets/sprites/` の外のファイルは `import` しない。

* 既定の export で `draw(ctx)` を持つ点は同じである。配置は `ctx` の変換で行う。
* エディタのアニメーションの機能で書き出す想定で、現時点では存在せず、エンジンにも専用の読み込みはない。
* 時間の引数（`draw(ctx, t)` など）を足すかどうかは、そのときに決める。

### 形式の記載箇所
スプライトJSの形式（既定の export に入るデータのキー、`draw` の中身など）は、OZ Vector Editor のリポジトリ（ローカル `D:\ozlab\ozvectoreditor`）の `PROJECT_ARCHITECTURE.md` 2章「スプライト（書き出し形式）」にだけ書かれている。本章は形式を書き写さず、エンジンを使う側の約束だけを書く。エディタ側の使い方の例も同じ項にある。

## 24. バーチャルパッド

バーチャルパッドは、画面に出すスティックとボタン（スマートフォンなどのタッチ操作用）である。指の位置をキーの押下（`KeyboardEvent.code`）に変えるので、ゲームはキーボードと同じ `Engine.isKeyDown`・`onKeyDown` で受け取れる。画面の `Engine.addButton`（18章）のボタンと区別するため、ここでは「パッドのスティック」「パッドのボタン」と呼ぶ。

* エンジンは当たり判定、押下状態、キーへの変換、つまみの位置を持つ。**画像の読み込みと描画はしない**。見た目は利用側が `Engine.virtualPadState` を読んで描く。
* 配置（位置と大きさ）、キーの割り当て、遊びの大きさの既定値はエンジンに無い。すべて `Engine.addVirtualPad` の引数で渡す。

### 有効・無効

`Engine.start` の `virtualPad`（3章）で切り替える。既定は無効である。

| API | 内容 |
| --- | --- |
| `Engine.addVirtualPad(scene, layout)` | シーンにパッドを登録する。`init` の中で呼ぶ（`Engine.addButton` と同じ） |
| `Engine.virtualPadEnabled` | 読み取りのみ。起動設定で有効なら `true` |
| `Engine.virtualPadTouched` | 読み取りのみ。有効で、canvas の上を指で触れたことがあれば `true`。無効のときは常に `false` |
| `Engine.virtualPadState(scene)` | シーンのパッドの描画用の状態の写し（毎回新しいオブジェクト）。無効のとき、または登録していないシーンでは `null` |

* 4つとも `Engine.start` の前に使うとエラー（`[oz] <API名>: Engine.start の前には使えません`）。`scene` が `Scene` のインスタンスでないとエラー。
* 無効のとき、`Engine.addVirtualPad` は引数の検証だけを行い、何も登録しない。無効のときの `onPointer` とキーの動作は、バーチャルパッドの無いときと同じである。
* 有効のとき、同じシーンに2回登録するとエラー。

### `layout`（`Engine.addVirtualPad` の第2引数）

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `stick` | 任意 | スティック。`{ x, y, radius, deadZone, keys }` |
| `stick.x`・`stick.y` | 必須 | 中心の論理座標。有限の数値 |
| `stick.radius` | 必須 | 半径。正の有限数。当たり判定の円であり、つまみが動ける範囲でもある |
| `stick.deadZone` | 必須 | 遊びの大きさ。`radius` に対する割合で、`0` 以上 `1` 未満の有限の数値 |
| `stick.keys` | 必須 | `{ left, right, up, down }` のうち、使う方向だけを書いたオブジェクト（空でもよい）。値は空でない文字列（`KeyboardEvent.code`） |
| `buttons` | 任意 | ボタンの配列（空でもよい）。各要素は `{ x, y, radius, key }` |
| `buttons[i].x`・`y` | 必須 | 中心の論理座標。有限の数値 |
| `buttons[i].radius` | 必須 | 半径。正の有限数 |
| `buttons[i].key` | 必須 | 空でない文字列（`KeyboardEvent.code`） |

* `layout`・`stick`・`stick.keys`・`buttons` の各要素に、表にない項目があるとエラー（書き間違いを見つけるため。画像のファイル名などは別のオブジェクトに書く）。
* `stick` が無く、`buttons` も無いか空だとエラー。`stick` に `null` を書くとエラー（省略するときは項目ごと書かない）。
* エラーは `Error` で、先頭が `[oz] Engine.addVirtualPad:`、項目名を含む（例 `stick.radius は正の有限数で指定してください`、`buttons[0].key は空でない文字列で指定してください`、`stick.keys に使えない項目 Left があります`）。
* 値はコピーして持つ。登録後に元のオブジェクトを変えても影響しない。

### 反応する条件と指の扱い

パッドが反応するのは、次のすべてを満たすときである。

* 起動設定で有効である。
* 指で触れたことがある（`Engine.virtualPadTouched` が `true`。最初の指の押し始めを処理するときに立つので、その指からパッドが反応する）。マウスとキーボードだけの環境では `false` のまま、パッドは反応しない。
* 入力を配る始めの最前面のシーンに、パッドが登録されている（積んだシーンの背面や、登録していないシーンでは反応しない）。
* 指のタッチである。ペンとマウスはパッドに反応せず、`onPointer` に届く。
* 押し始めた位置が、パッドのスティックかボタンの円の内側（縁を含む）である。

指の扱い:

* パッドのボタンは、指を離すまで押したままである（指がボタンの円の外へ出ても押したまま）。同じボタンを複数の指で押したときは、全部の指を離すまで押したまま。ほかの場所で押し始めた指が上を通っても押さない。重なっているボタンは、後に登録したものが優先する。
* パッドのスティックは1本の指だけが操作する。すでに操作している指がある間に、スティックの円の内側で押し始めた2本目の指は、何も押さずに離すまで持たれる（パッドが処理した指として `onPointer` にも画面のボタンにも届かない）。
* パッドが処理した指は、離すまで `onPointer` にも画面のボタンにも届かない。パッドの外で押し始めた指は、パッドに反応せず、`onPointer` などに届く（16章）。
* 反応するパッドでなくなったとき（メニューのシーンを積んだときなど）は、次の節の扱いになる。

### スティックの方向の判定

スティックを操作している指の位置から中心を引いた `(dx, dy)` と、その長さ `dist` で判定する。指が円の外へ出ても、そのまま使う。

* `dist < deadZone * radius` のあいだは、どの方向も押さない（遊び）。
* それ以外は、8方向を45度ずつに分けて判定する。斜めでは2つの方向が同時に押される（左上なら `left` と `up` のキー）。
* `stick.keys` に割り当てのない方向は、何も押さない。

### キーとの関係

* パッドが押しているキーは、キーボードのキーと同じく `Engine.isKeyDown(code)` が `true` になり、押した瞬間に `onKeyDown(code)` が呼ばれる（17章）。
* キーボードとパッドで同じキーを押したときは、`onKeyDown` は先に押した側の1回だけ呼ばれる。片方を離しても、もう片方が押していれば押したままである。
* **最前面のシーンが変わったとき:** 反応するパッドでなくなると、次に入力を配る始めに、そのパッドが押していたキーは離した扱いになる。そのとき触れていた指は、離すまでどこにも届かず、何も押さない。メニューを閉じても、その指では押されない（指を離して押し直す）。キーボードのキーは影響を受けず、押したまま残る。
* **フォーカスが外れたとき:** ウィンドウからフォーカスが外れると、パッドのキーもキーボードのキーも解除され、触れていた指は離すまで何も押さない。
* ゲームのロジックの入力には、キー（`Engine.isKeyDown`・`onKeyDown`）を使うこと。倒し具合を読む API は無い。

### 表示の条件と状態の読み方

`Engine.virtualPadState(scene)` は、次の形のオブジェクトを返す。

```text
{
  visible: boolean,        // 表示してよいか（= Engine.virtualPadTouched）
  stick: {                 // layout に stick が無ければ null
    x, y, radius,          // 登録した値
    knobX, knobY,          // つまみの中心（論理座標）。指が無ければ (x, y)
    active: boolean,       // 指で操作しているか
  } | null,
  buttons: [               // layout.buttons と同じ順。無ければ空の配列
    { x, y, radius, key, pressed: boolean },
  ],
}
```

* `visible` が偽のあいだは何も描かない。指で触れるまでは偽、触れた後は、ページを開いている間ずっと真である。マウスとキーボードだけの環境では偽のままである。
* 値は入力を確定するとき（毎フレームの配信の始め）にだけ変わり、1フレームの間は変わらない。`draw` から呼んでよい（読み取りのみ）。
* `knobX`・`knobY` は、指の位置が円の内側（`dist <= radius`）ならその位置、外なら中心から半径 `radius` の円の中へ縮めた位置である。描画のための値であり、ゲームのロジックの入力には使わない（キーを使う）。
* つまみの絵の大きさはエンジンが知らない。絵が土台の円の外へ出ないように、利用側が `knobX`・`knobY` を、中心から半径 `radius - knobRadius`（`knobRadius` はつまみの絵の半径）の円の中に収めて描く。

### 描き方の例

画像は `Assets.load` で読み込み（20章）、シーンの `init` で登録し、`draw` で `Engine.virtualPadState` から描く。ファイル名と値は例である。押している間の見た目は、別の画像にして切り替えると、ファイルの差し替えだけで変えられる。

```js
const LAYOUT = {
  stick: { x: 200, y: 530, radius: 130, deadZone: 0.25, keys: { left: 'ArrowLeft', right: 'ArrowRight' } },
  buttons: [{ x: 1090, y: 550, radius: 100, key: 'Space' }],
};
const KNOB_RADIUS = 56;

// ロード用のシーンなどで。無効のときは読み込まなくてよい。
function loadPadImages() {
  if (!Engine.virtualPadEnabled) return Promise.resolve();
  return Assets.load({
    images: {
      'pad:base': './assets/images/pad/stick_base.svg',
      'pad:knob': './assets/images/pad/stick_knob.svg',
      'pad:button': './assets/images/pad/button.svg',
      'pad:button:pressed': './assets/images/pad/button_pressed.svg',
    },
  });
}

class PlayScene extends Scene {
  x = 0;

  init() {
    Engine.addVirtualPad(this, LAYOUT);
  }

  update(dt) {
    if (Engine.isKeyDown('ArrowLeft')) this.x -= dt * 0.1; // パッドの左もここに届く
  }

  draw(ctx, layer) {
    if (layer !== 'ui') return;
    const pad = Engine.virtualPadState(this);
    if (pad === null || !pad.visible) return;

    if (pad.stick) {
      const { x, y, radius, knobX, knobY } = pad.stick;
      ctx.drawImage(Assets.image('pad:base'), x - radius, y - radius, radius * 2, radius * 2);
      // つまみは、中心から radius - KNOB_RADIUS の円の中に収める
      const limit = radius - KNOB_RADIUS;
      let ox = knobX - x;
      let oy = knobY - y;
      const len = Math.hypot(ox, oy);
      if (limit <= 0) {
        ox = 0;
        oy = 0;
      } else if (len > limit) {
        ox *= limit / len;
        oy *= limit / len;
      }
      ctx.drawImage(Assets.image('pad:knob'), x + ox - KNOB_RADIUS, y + oy - KNOB_RADIUS, KNOB_RADIUS * 2, KNOB_RADIUS * 2);
    }
    for (const b of pad.buttons) {
      const image = Assets.image(b.pressed ? 'pad:button:pressed' : 'pad:button');
      ctx.drawImage(image, b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2);
    }
  }
}
```

* `drawImage` だけを使う場合は `ctx` の状態を変えないので `save` / `restore` は不要である。透明度や変形を変えるときは `save` / `restore` で囲む（13章）。

### エラー

* `Engine.start` の前に、4つの操作のどれかを使うとエラー（`[oz] <API名>: Engine.start の前には使えません`）。
* `Engine.addVirtualPad` で、`scene` が `Scene` のインスタンスでない、`layout` が正しくない（`[oz] Engine.addVirtualPad:` で始まり、項目名を含む）、有効なときに同じシーンへ2回登録した、場合はエラー。
* `Engine.virtualPadState` で、`scene` が `Scene` のインスタンスでないとエラー。

## 25. キャンバスキャッシュ

`CanvasCache` は、`draw(ctx)` で描けるもの（スプライトJS、図形、文字）を、前もってページに追加しない Canvas に焼き付けておき、毎フレームはその画像を貼るだけにする。多数のスプライトを同時に描くときの、毎フレームのベクターの描画の負荷を減らすためのものである。

焼き付けた結果は `draw(ctx)` を持つオブジェクト（以下「焼き付け」）として返るので、スプライトJSと同じ書き方で描ける。エンジンは描く処理を呼ぶだけで、絵の中身を知らない。

```js
import { Scene, CanvasCache } from 'oz';
```

### `CanvasCache.create(source, options)`

| 引数 | 必須 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `source` | 必須 | なし | 描く処理。関数なら `source(ctx)`、そうでなければ `source.draw(ctx)` として呼ぶ |
| `options.bounds` | 必須 | なし | 焼き付ける範囲 `{ minX, minY, maxX, maxY }`（有限の数値で、`maxX > minX`、`maxY > minY`） |
| `options.scale` | 任意 | `1` | 焼き付ける大きさの倍率（正の有限数） |

* `bounds` は `source` の座標（拡大前の px）での最小・最大である。OZ Vector Editor の書き出しの `bounds` と同じ形で、スプライトJSなら `sprite.bounds` をそのまま渡せる（線の太さの半分を含む）。`bounds` を持たない描く処理では、呼ぶ側が同じ形で書き、線の太さや影を含める。
* `bounds` と `scale` は `create` のときに決まり、後から変えられない（`bounds` は値を写して持つので、元のオブジェクトを書き換えても変わらない）。
* `options` のほかの項目は読まない。
* 戻り値は焼き付けで、`draw(ctx)`・`refresh()`・`dispose()` だけを持つ。

### 描く処理に渡される ctx
`source` に渡す `ctx` は、焼き付けのたびに初期状態で、焼き付け用の変換（`bounds`・`scale`・画素の細かさに合わせたもの）は設定済みである。`source` は変換を自分で設定しない。`source` が `ctx` の状態を戻さずに終わっても、例外を投げても、その状態は次の焼き付けに持ち越されない。

### 描かれる位置と大きさ
焼き付けの `draw(ctx)` は、「`ctx.save()` → `ctx.scale(scale, scale)` → `source` を描く → `ctx.restore()`」と同じ位置・大きさに描く。呼ぶ側は `scale` を掛けない。

* 呼ぶ側は `translate`・`rotate`・`scale` を掛けてから `draw(ctx)` を呼べる。`draw` は `ctx` の状態を元に戻して終わる。
* 拡大・縮小・回転を掛けていないときは、画像の1画素を画面の1画素に合わせて描く（位置は画面の画素に丸められる）。
* 回転したときは、画像の補間で描かれる（`imageSmoothingEnabled` はエンジンが変えない）。
* `bounds` のすぐ外側は、線のにじみが欠けないように、エンジンがわずかな余白を取る。それより外は切れる。

### 使い方の例
スプライトJSの `bounds` を渡す例。

```js
import { Scene, CanvasCache } from 'oz';
import player from 'assets/sprites/player.js';

class PlayScene extends Scene {
  init() {
    this.playerImage = CanvasCache.create(player, { bounds: player.bounds });
  }
  draw(ctx, layer) {
    if (layer !== 'main') return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    this.playerImage.draw(ctx);
    ctx.restore();
  }
  destroy() {
    this.playerImage.dispose();
  }
}
```

手で範囲を書く例（関数で円と文字を描く。線の太さを含めた範囲を渡す）。

```js
import { Scene, CanvasCache } from 'oz';

class BadgeScene extends Scene {
  init() {
    this.badge = CanvasCache.create((ctx) => {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', 0, 0);
    }, { bounds: { minX: -21, minY: -21, maxX: 21, maxY: 21 }, scale: 2 });
  }
  draw(ctx, layer) {
    if (layer !== 'main') return;
    ctx.save();
    ctx.translate(100, 100);
    this.badge.draw(ctx);
    ctx.restore();
  }
  destroy() {
    this.badge.dispose();
  }
}
```

### 自動の焼き直し
焼き付ける画素数は、エンジンが `scale` と画面の画素の細かさから決める（呼ぶ側は画面の画素の倍率を知らなくてよく、知る方法もない）。ウィンドウの大きさや画面の向きなどが変わると、次にその焼き付けを描くときに、エンジンが焼き直す。同じオブジェクトをそのまま使える。その描画のときに描く処理が呼ばれる。

### `refresh()`
その時点の描く処理を呼び直して、焼き直す。色や演出を切り替えた後に呼ぶ。

### `dispose()`
焼き付けを手放す（画像を持たなくなり、焼き直しもされない）。シーンの `destroy` で呼ぶ。2回目以降は何もしない。手放した後の `draw`・`refresh` はエラーになる。

### 作れる時期
`Engine.start` の後。シーンの `init` で作り、`destroy` で手放す。焼き付けは `create` の中ですぐ行われる。

* シーンの基底クラス（自分で作った `Scene` の派生クラス）の `init` で作って `destroy` で手放す場合、そのクラスをさらに継承したクラスで `init`・`destroy` を書くときは、先頭で `super.init()`・`super.destroy()` を呼ぶ。呼ばないと、焼き付けが作られないまま描こうとしてエラーになる、または手放されずに画像のメモリが残る。

### 注意
* `scale` と大きく違う倍率（呼ぶ側の `ctx.scale` など）で描くと、拡大ではぼやけ、縮小では細い線が淡くなる。大きさを変えて描くなら、その大きさの `scale` で別に焼き付ける。
* `bounds` の外は切れる。OZ Vector Editor の書き出しでも、尖った角の線（`miter`）がはみ出す部分は切れることがある。
* 時間で変わる絵（アニメーション）は対象にしない。焼き付けた時点の見た目のまま描かれる。
* 色違いが要るときは、色ごとに別の描く処理を渡して焼き付ける。見た目を変えたら `refresh()` を呼ぶ。
* 文字を焼き付けるときは、Web フォントの読み込みが済んでから `create`（または `refresh()`）する。
* 焼き付け1つにつき画像1枚分のメモリを使う。大きな範囲と大きな `scale` の組み合わせや、多数の焼き付けを持ち続けることは避け、使わなくなったら `dispose()` する（ブラウザ、特に iPhone の Safari には Canvas の大きさとメモリの上限がある）。

### エラー
* `Engine.start` の前に `create` を呼ぶとエラー（`[oz] CanvasCache.create: Engine.start の前には使えません`）。この判定は引数の検証より先に行う。
* `create` の引数が正しくないとエラー（`[oz] CanvasCache.create:` で始まる）。上から順に調べ、最初に当たったものを投げる。
  * `source` が関数でも、`draw` が関数のオブジェクトでもない（無い・`null` を含む）: `source (draw(ctx) を持つオブジェクト、または ctx を受け取る関数) が渡されていません`
  * `options` が `null` でないオブジェクトでない（無いを含む）: `options (設定オブジェクト) が渡されていません`
  * `bounds` が `null` でないオブジェクトでない（無い・`null` を含む）: `bounds (焼き付ける範囲 { minX, minY, maxX, maxY }) が渡されていません`
  * 4つの値のどれかが有限の数値でない: `bounds の minX / minY / maxX / maxY は有限の数値で指定してください`
  * `maxX <= minX` または `maxY <= minY`: `bounds の範囲が空です（maxX は minX より、maxY は minY より大きくしてください）`
  * `scale` が `undefined` でなく、正の有限数でない: `scale は正の有限数で指定してください`
* 焼き付け用の Canvas を用意できないとエラー（`[oz] CanvasCache.create: 焼き付け用の Canvas を用意できません`）。
* 手放した後の `draw`・`refresh` はエラー（`[oz] 焼き付けの draw: dispose の後には使えません`、`[oz] 焼き付けの refresh: dispose の後には使えません`）。
* 描く処理が投げた例外は、包み直さずそのまま伝わる。`create` の中なら焼き付けは返らない。`refresh()` や自動の焼き直し（`draw` の中）で投げたときは、その呼び出しから例外が出て、その焼き付けは次に描くときにもう一度焼き直される。フレーム処理の中で起きればループが止まる（15章）。

## 26. UI 部品（窓、ボタン、数値・文字の表示、チェックボックス、スライダー、選択肢の列、タブ、スクロールする領域）

`Ui` で、タイトルバーと閉じるボタンのある窓を作り、その中にボタン、数値・文字の表示、値を変える3種類の部品（チェックボックス、スライダー、選択肢の列）を置ける。3種類は、呼ぶ側の値を `read` で読み、`write` で書く。窓の中の部品をまとめる仕組みが2つある。タブの列（選んだタブの部品だけが出る）と、スクロールする領域（指で縦にずらして、窓に収まらない数の部品を見る）。窓はシーンが持つ。エンジンは標準の見た目（単色の塗り・枠・文字）で描く。見た目は `look` で差し替えられる。`Ui.createWindow` は `Engine.start` の後から使える（最初のシーンの `init` の中でもよい）。

```js
import { Scene, Ui } from 'oz';
```

| 操作 | 内容 |
| --- | --- |
| `Ui.createWindow(options)` | 窓を作り、窓の操作のオブジェクトを返す |

### `Ui.createWindow(options)`

表にない項目はエラーになる。任意の項目は、書かないか `undefined` にすると既定になる（`null` はエラー）。値はコピーして持ち、後から元のオブジェクトを変えても影響しない。

| 項目 | 必須 | 既定 | 内容 |
| --- | --- | --- | --- |
| `title` | 必須 | - | タイトルバーの文字。文字列（空文字も可） |
| `width`・`height` | 必須 | - | 窓の全体（タイトルバーを含む）の大きさ（論理座標）。正の有限数で、どちらも `titleBarHeight` より大きい |
| `x`・`y` | 任意 | 中央 | 窓の左上（論理座標）。有限の数値。省略した軸は画面の中央に置く |
| `onClose` | 必須 | - | 閉じるときに引数なしで呼ぶ関数 |
| `closeOnOutside` | 任意 | `true` | 窓の外を押して離したら閉じるか。`true` か `false` |
| `titleBarHeight` | 任意 | `88` | タイトルバーの高さ。閉じるボタンは、この長さの正方形 |
| `textSize` | 任意 | `36` | 文字の大きさ。正の有限数 |
| `look` | 任意 | - | 種類ごとの描く関数（`backdrop`・`window`・`titleBar`・`closeButton`・`button`・`value`・`checkbox`・`slider`・`choices`・`tabs`・`scroll`・`scrollBar` の12の種類）。渡した種類はその関数で、渡さなかった種類は標準の見た目で描く |

### 窓の操作

返される窓のオブジェクトは凍結されていて、次の9つだけを持つ。`addTabs`・`addScroll` 以外の戻り値は使わない。

| 操作 | 内容 |
| --- | --- |
| `addButton(spec)` | ボタンを足す |
| `addValue(spec)` | 数値・文字の表示を足す |
| `addCheckbox(spec)` | チェックボックスを足す |
| `addSlider(spec)` | スライダーを足す |
| `addChoices(spec)` | 選択肢の列を足す |
| `addTabs(spec)` | タブの列を足す（1つの窓に1つまで）。タブごとのオブジェクトの配列（凍結。`labels` の順）を返す |
| `addScroll(spec)` | スクロールする領域を足す。領域のオブジェクトを返す |
| `onPointer(pointer)` | シーンの `onPointer` で受けたポインタをそのまま渡す |
| `draw(ctx)` | 窓を描く。シーンの `draw` の中で呼ぶ |

窓の形（作った後は変わらない。窓の移動・大きさの変更はできない）:

* 窓の全体は `{ x, y, width, height }`。`x`・`y` を省略した軸は、画面の中央に置く（`x = (画面の幅 - width) / 2`、`y = (画面の高さ - height) / 2`。丸めない）。
* 窓の上端にタイトルバー（全幅、高さ `titleBarHeight`）があり、その右端に閉じるボタン（一辺 `titleBarHeight` の正方形）がある。
* 画面全体（論理解像度の全体）に暗幕を描く。
* 窓の内側は、タイトルバーの下の `{ x, y + titleBarHeight, width, height - titleBarHeight }`。部品の位置の原点は、この左上である。
* 部品は、`addButton`・`addValue`・`addCheckbox`・`addSlider`・`addChoices` の5種類と、タブの列・スクロールする領域（`addTabs`・`addScroll`。後の節）を足せる。5種類は、窓にも、タブにも、スクロールする領域の中にも足せる（足す操作の項目は同じ）。
* 窓の外へはみ出した部品は、窓の内側で切り取られる。部品の矩形のうち窓の内側に入っている部分だけが描かれ、その部分だけが押せる。全部が外にある部品は、描かれず押せない。
* 閉じるボタンは、部品のボタンと同じく離したときに反応し、押したまま外へずらして離すと取り消せる。押されたとき（離したとき）に `onClose()` が呼ばれる。シーンを外すのは、呼ぶ側が `onClose` の中で行う（`Engine.popScene()`）。

### `addButton(spec)`・`addValue(spec)`

表にない項目はエラーになる。部品は窓を作った後いつでも足せる（削除・移動はできない）。

`addButton(spec)`:

| 項目 | 必須 | 既定 | 内容 |
| --- | --- | --- | --- |
| `x`・`y` | 必須 | - | 窓の内側の左上を原点とする位置（論理座標）。有限の数値 |
| `width` | 必須 | - | 幅。正の有限数 |
| `height` | 任意 | `88` | 高さ。正の有限数 |
| `label` | 必須 | - | 文字。文字列、または描くたびに呼ぶ関数（引数なし。戻り値は文字にする） |
| `onPress` | 必須 | - | 押されたとき（離したとき）に引数なしで呼ぶ関数 |
| `enabled` | 任意 | 常に押せる | 押せるかを返す関数（引数なし）。偽なら押せない |

`addValue(spec)`（押しても何も起きない）:

| 項目 | 必須 | 既定 | 内容 |
| --- | --- | --- | --- |
| `x`・`y`・`width`・`height` | | | `addButton` と同じ |
| `label` | 必須 | - | 項目名。`addButton` の `label` と同じ形 |
| `read` | 必須 | - | 値を読む関数（引数なし）。描くたびに1回呼ぶ |
| `format` | 任意 | `String(value)` | 読んだ値を表示の文字にする関数（引数は読んだ値。戻り値は文字にする） |

* 後に足した部品が上に描かれ、押したときも後に足した部品だけが調べられる。矩形は左端・上端を含み、右端・下端を含まない。数値・文字の表示が上にあると、下のボタンは押せない。
* 文字が部品の幅に収まらないとき、標準の見た目は文字を横に縮めて収める（切らない、はみ出さない）。窓のタイトルも同じ（閉じるボタンの手前までに縮める）。見た目を差し替えたときは、描く関数が扱いを決める（`info` の矩形と文字を渡す）。
* `label`（関数のとき）・`enabled`・`read`・`format` は、描くたびに呼ばれる（`enabled` は押したとき・離したときにも呼ばれる）。部品を足す操作は `label`・`read`・`write`・`format`・`enabled` を呼ばない。`onPointer` は `label`・`format` を呼ばない。`read` は、数値・文字の表示では `onPointer` から呼ばれないが、チェックボックス・スライダー・選択肢の列では、押したとき・ずらしたとき・離したときにも呼ばれる。
* `label` が関数のときの戻り値は `String(...)` で文字にする。`enabled` の戻り値は真偽として扱う（偽なら押せない）。
* 押せないボタンは、押されている見た目にならず、押しても何も起きない。

### `addCheckbox(spec)`・`addSlider(spec)`・`addChoices(spec)`

表にない項目はエラーになる。3種類とも、値を変えるときに `write` を呼ぶ（呼ぶのは窓の `onPointer` の中だけ）。`write` の戻り値は使われない。

`addCheckbox(spec)`（離したとき、`read` の戻り値を真偽にしたものを反転して `write` に渡す）:

| 項目 | 必須 | 既定 | 内容 |
| --- | --- | --- | --- |
| `x`・`y`・`width` | 必須 | - | `addButton` と同じ |
| `height` | 任意 | `88` | 高さ。正の有限数 |
| `label` | 必須 | - | 項目名。`addButton` の `label` と同じ形 |
| `read` | 必須 | - | 値を読む関数（引数なし）。戻り値を真偽にしたものが入り（`true`）か切り（`false`） |
| `write` | 必須 | - | 値を書く関数（引数は新しい真偽 1つ） |

`addSlider(spec)`:

| 項目 | 必須 | 既定 | 内容 |
| --- | --- | --- | --- |
| `x`・`y`・`width` | 必須 | - | `addButton` と同じ。`width` は 64 より大きくする |
| `height` | 任意 | `132` | 高さ。正の有限数 |
| `label` | 必須 | - | 項目名。`addButton` の `label` と同じ形 |
| `min`・`max` | 必須 | - | 最小・最大。有限の数値で、`min < max` |
| `step` | 必須 | - | 刻み。正の有限数で、`max - min` 以下（小数の誤差を見込む。`(max - min) / step` が `1 - 1e-9` より小さいときだけエラー）、`max - min` が `step` の整数倍 |
| `read` | 必須 | - | 値を読む関数（引数なし） |
| `write` | 必須 | - | 値を書く関数（引数は刻みの値 1つ） |
| `format` | 任意 | `String(value)` | 読んだ値を値の文字にする関数（`addValue` の `format` と同じ形） |

`addChoices(spec)`:

| 項目 | 必須 | 既定 | 内容 |
| --- | --- | --- | --- |
| `x`・`y`・`width` | 必須 | - | `addButton` と同じ |
| `height` | 任意 | 横なら `88`、縦なら `88 × 選択肢の数` | 列の全体の高さ。正の有限数 |
| `choices` | 必須 | - | 選択肢の配列。要素は `{ label, value }`（`label` は文字列か、描くたびに呼ぶ関数。`value` は `undefined` 以外の値）。1つ以上で、`value` が `===` で同じものを2つ持たない |
| `direction` | 任意 | `'horizontal'` | 並べる向き。`'horizontal'`（幅を等分して横に並べる）か `'vertical'`（高さを等分して縦に並べる） |
| `read` | 必須 | - | 値を読む関数（引数なし）。戻り値と `===` で同じ `value` の選択肢が選ばれている |
| `write` | 必須 | - | 値を書く関数（引数は選ばれた選択肢の `value`） |

### `addTabs(spec)`・`addScroll(spec)`

表にない項目はエラーになる。位置 `x`・`y` は窓の内側の左上が原点（ほかの部品と同じ）。

`addTabs(spec)`（タブの列。幅を `labels` の数で等分する。離したとき、押し始めたタブの上であればそのタブが選ばれる）:

| 項目 | 必須 | 既定 | 内容 |
| --- | --- | --- | --- |
| `x`・`y`・`width` | 必須 | - | `addButton` と同じ |
| `height` | 任意 | `88` | 列の高さ。正の有限数 |
| `labels` | 必須 | - | タブの名前の配列。要素は文字列か、描くたびに呼ぶ関数（`addButton` の `label` と同じ形）。1つ以上。足した時点で写して持つ |

`addScroll(spec)`（スクロールする領域。縦にずらして見る）:

| 項目 | 必須 | 既定 | 内容 |
| --- | --- | --- | --- |
| `x`・`y` | 必須 | - | 窓の内側の左上を原点とする位置（論理座標）。有限の数値。タブに入れた領域も同じ |
| `width`・`height` | 必須 | - | 領域の見せる範囲の大きさ。正の有限数 |

* `addTabs` が返す配列の要素（タブのオブジェクト。凍結）は、`addButton`・`addValue`・`addCheckbox`・`addSlider`・`addChoices`・`addScroll`・`addTabs` の7つの操作を持つ。5種類と `addScroll` で足したものは、そのタブに入る（位置の原点は窓の内側の左上）。`addTabs` は呼ぶと必ずエラー（タブの列はタブに入れられない）。
* `addScroll` が返す領域のオブジェクト（凍結）も、同じ7つの操作を持つ。5種類で足したものは領域の中に入り（位置の原点は領域の中身の左上）、`addTabs`・`addScroll` は呼ぶと必ずエラー（入れられない組み合わせ）。5種類の項目は、窓に足すときと同じ。ポインタの受け方は「スクロールする領域の中の部品のポインタの受け方」のとおり（窓に足すときとは違う）。
* 窓の `addScroll` とタブの `addScroll` は、どちらも領域のオブジェクトを返す。タブに入れていない部品（窓に直接足した部品、タブの列そのもの）は、どのタブが選ばれていても出る。
* 部品の入れ方: どのタブに入れるかは、足す操作をどのオブジェクトに対して呼ぶかで決める（部品の設定に「タブの番号」の項目は無い）。タブの列は1つの窓に1つまで。タブの列とスクロールする領域は、領域の中に入れられない。スクロールする領域はタブに入れられる。タブの列はタブにも入れられない。
* 自動の並べ方はしない。部品の位置は呼ぶ側が決める（タブの列の下に部品を置くなら、`y` をタブの列の高さより大きくする）。部品の足し順が描く順で、後に足した部品が上（押すときも後に足した部品が先）。選ばれていないタブの部品は、描かれず押せないので、その位置にある出ているほかの部品が調べられる。
* タブの切り替わり方、スクロールの動き、領域の中の部品のポインタの受け方の詳しい決まりは、この章の後の節に書く。例は「タブとスクロールする領域の使い方の例」。

窓・タブ・領域のオブジェクトの操作の一覧:

| オブジェクト | 5種類の足す操作 | `addScroll(spec)` | `addTabs(spec)` |
| --- | --- | --- | --- |
| 窓 | 窓に足す | 足す。領域のオブジェクトを返す | 足す。タブのオブジェクトの配列を返す |
| タブのオブジェクト | そのタブに足す | そのタブに足す。領域のオブジェクトを返す | 必ずエラー |
| 領域のオブジェクト | 領域の中に足す | 必ずエラー | 必ずエラー |

5種類の足す操作の戻り値は使わない。窓・タブ・領域の中に足した部品は、削除も移動もできない。

### 値のつなぎ方

部品は値を自分で持たない。`addValue` の `read` が、描くたびに（`draw` の中で1回）値を読む。ボタンの `label`・`enabled` も同じく描くたびに読むので、外で値が変わると、次の描画で表示が追従する。

* `read` の戻り値は、`format` に渡る。`format` が無ければ `String(value)` が表示になる（`null` は `'null'`、`undefined` は `'undefined'` と出る）。
* `null` や数値の整え方は、呼ぶ側が `format` で決める。例: `format: (v) => (v === null ? '--' : String(v))`、`format: (v) => v.toFixed(2)`。
* `read`・`format`・`label`・`enabled` は `draw` の中から呼ばれるので、状態を変えないこと（描画の中で状態を変えてはいけない）。
* 例: FPS（14章）を表示するとき `{ label: 'FPS', read: () => Engine.fps, format: (v) => (v === null ? '--' : String(v)) }`。値の保存（22章 `Storage`）は、呼ぶ側が `onPress` などの中で行う（部品は `Storage` を使わない）。

チェックボックス・スライダー・選択肢の列も、値を自分で持たず、`read`（引数なし）と `write`（引数は新しい値1つ）で呼ぶ側の値につなぐ。描くたびに `read` を1回呼んで表示を合わせるので、値が外から変わっても次の描画で追従する。`read`・`write` が呼ばれる時:

| 部品 | `draw` の中（描くたび） | `'down'` | `'move'` | `'up'` |
| --- | --- | --- | --- | --- |
| チェックボックス | `read` 1回 | 呼ばない | 呼ばない | 部品の当たりの矩形の中で離したとき: `read` 1回 → `write(!Boolean(読んだ値))` |
| スライダー | `read` 1回 | `read` 1回 → 位置の刻みの値が読んだ値と `===` で違えば `write(刻みの値)` | 刻みの番号が変わったときだけ: `read` 1回 → `===` で違えば `write(刻みの値)` | 呼ばない（値を変えない） |
| 選択肢の列 | `read` 1回 | 呼ばない | 呼ばない | 押し始めた選択肢の上で離したとき: `read` 1回 → その選択肢の値と `===` で違えば `write(選択肢の値)` |
| スクロールする領域の中のスライダー | `read` 1回 | 呼ばない（押しただけでは値を書かない） | 動かした距離が 20 以内: 呼ばない。20 を越えたとき横寄りなら、押した位置の刻みの値で `read` 1回 → 違えば `write`、続けて今の位置で、刻みの番号が変わったときだけ `read` 1回 → 違えば `write`。縦寄りなら呼ばない。横寄りと決まった後は、窓に直接置いたスライダーと同じ | 20 以内で離したとき: 押した位置の刻みの値で `read` 1回 → 違えば `write`。横寄りの後に離したとき、縦のスクロール中に離したときは呼ばない |

* `write` を呼ぶのは、窓の `onPointer` の中だけ。`draw` の中では呼ばない。今の値（`read` の戻り値）と同じ値になる操作では `write` を呼ばない（比べ方は上の表のとおり `===`）。チェックボックスだけは、離したときの `!Boolean(v)` が `Boolean(v)` と必ず違うので、必ず `write` を呼ぶ。
* 値の保存は、呼ぶ側が `write` の中で行う（例: `Storage.set`）。部品は `Storage` を使わない。
* `write`（と、ポインタを受けたときの `read`）が投げた例外は、包み直さずに伝わる（`onPress` と同じ。フレーム処理の中ならループが止まる。15章）。部品の状態は `write` を呼ぶ前に戻してあり、チェックボックス・選択肢の列は押されている状態を解いてから呼ぶ（スライダーの `'down'` だけは `write` の後に押されている状態にする）。
* `write` は窓の `onPointer` の中から呼ばれるので、シーンの操作（`Engine.popScene` など）をしてよい（7章）。`read` は `draw` の中からも呼ばれるので、状態を変えないこと。

### スライダーの値の決まり方

* `min`・`max`・`step` は必須で、`min < max`、`0 < step ≤ max - min`、`max - min` が `step` の整数倍でなければならない（`step` を省略した連続した値は作れない）。`step ≤ max - min` も小数の誤差を見込んで判定し、`(max - min) / step` が `1 - 1e-9` より小さいときだけエラーにする。例: `min 0.1・max 0.3・step 0.2` は通り（値は `0.1` と `0.3` の2通り）、`min 0・max 1・step 1.5` と `min 0.1・max 0.3・step 0.25` はエラー。整数倍かは小数の誤差を見込んで判定する（`n = (max - min) / step`、`k = Math.round(n)` として、`|n - k| ≤ k × 1e-9` なら整数倍）。例: `min 0・max 0.3・step 0.1` は整数倍で、`min 0・max 1・step 0.3` はエラー。刻みの数は `k`（値は `k + 1` 通り）。
* 刻みの番号 `i`（`0`〜`k`）の値は、`i = 0` なら `min`、`i = k` なら `max` そのもの、それ以外は `min + i × step` を、`min`・`max`・`step` のうち小数の桁が最も多いものの桁数で丸めた数。丸める桁数は、`0`〜`20` のうち `Number(v.toFixed(桁数)) === v` となる最小の桁数（`min`・`max`・`step` それぞれで求めて最大を取る）。`1e-7` のように指数の形で書かれる数も、この桁数（`1e-7` は 7）で扱う。`1e21` 以上の数は桁数 0 として扱う（`toFixed` が指数の形の文字を返すため。丸めても元の数のまま）。`min`・`max`・`step` のどれかが小数第 20 位までで表せない数（`1e-21`、`1.5e-20` など）のときは丸めず、`min + i × step` の計算のまま（小数の誤差が残ることがある）。毎回 `i` から求めるので、誤差は積み重ならない。例: `min 0・max 1・step 0.1` の `i = 3` は `0.3`（`0.30000000000000004` にならない）、`min -1・max 1・step 0.1` の `i = 3` は `-0.7`、`min 0.5・max 2・step 0.25` の `i = 3` は `1.25`。`write` に渡すのはこの刻みの値だけ。
* 溝は横向きだけ。部品の矩形のうち、上の 1/3 が文字の段（左に項目名、右に値の文字）、下の 2/3 が溝の段で、つまみの中心は溝の左端（`min`）から右端（`max`）まで動く。つまみの大きさは `Math.min(64, 溝の段の高さ)` で、つまみは部品の矩形からはみ出さない。溝の太さは 12。既定の高さ `132` なら、文字の段 44、溝の段 88、つまみ 64。形は `info` の `textRow`・`track`・`knob` で渡る。
* 刻みの番号 `i` の位置（つまみの中心の x）は `track.x + track.width × i / k`。押した位置から番号へは、位置を溝の左端から右端までの割合にして `k` 倍し、四捨五入する。溝の端より外は `min`・`max` になる。
* `read` の戻り値が範囲外、刻みに合っていない、数でないときも、操作するまで `write` は呼ばれない。つまみは、`number`（`NaN` 以外）なら値の位置に描き（範囲外・`Infinity`・`-Infinity` は端。刻みに合っていない値は刻みに寄せずにその値の位置）、`NaN` と数でない値（`undefined`・`null`・文字列など）は左端に描く。値の文字は、いつも `read` の戻り値そのものを `format` に渡す（寄せた値ではない。`format` が無ければ `String(value)`）。`info.value` も戻り値そのもの。

### 値を変える部品のポインタの受け方

3種類とも、押し始めた部品が、離すまでポインタを受け取る。押して反応する範囲は、部品の矩形の全体（窓の内側との重なり。箱やつまみだけではない）。窓の内側で切り取られるときは、残った部分だけが押せる。`'down'` の無い `'move'`・`'up'` には反応しない。

* チェックボックス・選択肢の列は、ボタンと同じく離したときに反応する。押している間は押されている状態で、押したまま外へずらすと押されている状態が消える。外で離すと何も起きず（取り消し）、外へずらしてから戻して離すと反応する。選択肢の列は、押し始めた選択肢の上で離したときだけ反応する（ほかの選択肢の上へずらすと、押されている状態が消え、そこで離しても何も起きない）。選ばれている選択肢を押して離しても `write` は呼ばない。
* スライダーは、押した瞬間に値を書く（押した位置へ飛ぶ。遊びは使わない）。そのままドラッグすると、指が部品の上下・窓の内側の外・窓の外へずれても、離すまで横の位置で追う。溝の左端より外へずらすと `min`、右端より外は `max` に止まる（端の外は遊びなし）。離したときの位置では値を変えない（それまでに書いた値のまま。取り消しは無く、外で離しても窓は閉じない）。
* スライダーには遊び（ヒステリシス）がある。刻みの境目（隣の刻みとの中点）を、境目の向こうへ 8（論理座標）以上越えるまで、番号を変えない。境目の近くで指が細かく揺れても、値が行き来しない。例（溝の左端 132・幅 500・`k = 10`、刻みの幅 50）: 番号 3（x 282）で押し、x 314 へずらしても変わらず（中点 307 を 7 越えた）、x 316（9 越えた）で番号 4 になる。x 307 へ戻しても 4 のまま、x 298（4 の位置 332 から 34 離れた）で 3 に戻る。刻みの幅が狭いスライダーでは、ドラッグが 8 だけ遅れて追う。
* 窓に直接置いた（タブに入れたものを含む）スライダーは、押した瞬間に値を書く。スクロールする領域の中のスライダーは、押した瞬間には書かず、指を動かした向きで決める（「スクロールする領域の中の部品のポインタの受け方」）。

### 選択肢の列

* 列の矩形（`x`・`y`・`width`・`height`）を、選択肢の数 `n` で等分して並べる（`direction` が `'horizontal'` なら幅を横に、`'vertical'` なら高さを縦に）。選択肢どうしの間は空けない。境は `rect.x + rect.width × i / n`（縦は `rect.y + rect.height × i / n`）で、選択肢 `i` は境 `i` から境 `i + 1` まで。たとえば幅 300 で 3つなら、境は `x`・`x + 100`・`x + 200`・`x + 300`。
* 矩形のどこを押しても、どれか1つの選択肢に当たる（左端・上端を含み、右端・下端を含まない。境の点は後ろ側の選択肢）。
* 選ばれているのは、`read` の戻り値と `===` で同じ `value` の選択肢（`NaN` は選ばれない）。`value` が `===` で同じ選択肢を2つ持てないのは、どちらが選ばれているか決まらないため。どれとも同じでなければ、どれも選ばれていない。
* 足した時点で、選択肢の一覧は写して持つ。後から元の配列や要素を変えても影響しない。

### タブの切り替わり方

* タブの列の矩形（`x`・`y`・`width`・`height`）を、`labels` の数 `n` で等分して横に並べる。タブどうしの間は空けない。境は `rect.x + rect.width × i / n`（`i = 0〜n`）で、タブ `i` は境 `i` 以上、境 `i + 1` 未満（境の点は後ろ側のタブ）、高さは列の全体。たとえば幅 300 で3つなら、境は `x`・`x + 100`・`x + 200`・`x + 300`。
* 選ばれているタブは、窓を作った直後は先頭（`labels[0]`）。窓の中でタブの列が持ち、`read`・`write` は無く、ゲームから読んだり変えたりする口も無い（ゲームから切り替えられない）。窓を作り直すと先頭に戻る。窓を開いている間は保たれる。
* 押し方は、ボタンと同じ。押すと、押した位置のタブが押されている状態になる。押し始めたタブの上にある間だけ押されている状態で、ほかのタブの上や列の外へずらすと消える。押し始めたタブの上で離したときだけ、そのタブが選ばれる（離したときに切り替わる）。外やほかのタブの上で離すと何も起きない。選ばれているタブを押して離しても何も変わらない。押して反応する範囲は、列の矩形と窓の内側の重なり。
* 選ばれているタブに入れた部品（タブに入れたスクロールする領域を含む）と、どのタブにも入れていない部品だけが、描かれ、押せる。選ばれていないタブの部品は、描く関数が呼ばれず、押せず、`label`・`read`・`format`・`enabled` も呼ばれない（窓の内側の外にはみ出した窓の部品は、今までどおり描く関数が呼ばれて切り取られる。呼ばれないのは、出ていない部品と、領域の矩形と重ならない領域の中の部品）。
* タブを切り替えても、ほかのタブの部品の状態は保たれる。スクロールする領域のスクロールの位置は、別のタブへ切り替えて戻ってもそのまま。値は、呼ぶ側の持ち物の `read` が決める。
* `label` が関数のタブは、描くたびにタブごとに呼ばれる。

### スクロールの動き

* 領域の矩形は `{ 窓の内側の x + spec.x, 窓の内側の y + spec.y, width, height }`（画面の論理座標）。見える範囲は、領域の矩形と窓の内側の重なり。領域の中の部品の位置は、領域の中身の左上が原点（スクロールしていないとき、領域の左上と同じ）。
* 中身の高さは、領域の高さと、中の部品の下端（`y + height`）の最大の大きい方。呼ぶ側が渡す項目は無い。部品を足すと、中身の高さは増えることはあっても減らない。いちばん下の部品の下端が、いちばん下までスクロールしたときの領域の下端に付く（下の余白は作れない）。位置 `y` が負の部品は、スクロールの位置が 0 より小さくならないので、領域の上にはみ出した部分は見えない。
* スクロールの位置 `scrollY` は 0（上端）〜 `中身の高さ - 領域の高さ`（下端）。中身の高さが領域の高さ以下なら、スクロールできない（位置は 0 のまま、位置の表示も出ない）。位置は領域が持ち、窓を開いている間は保たれる。ゲームから読んだり変えたりする口は無い。
* 領域の見える範囲の中で押すと、領域が持ち主になる。中の部品の有無にかかわらず、部品の無いところ、数値・文字の表示、押せないボタンの上でも、ずらせる。
* ずらし方: ドラッグになったら（次の節）、指の縦の位置が動くたびに、`scrollY` を前の位置との差だけ動かす。指を上へ動かすと中身が上へ動き、中身が指に付いて動く（`scrollY = 範囲に収めた(scrollY + (前の y - 今の y))`）。ドラッグになった位置から指に付いて動く（ドラッグになった瞬間に決まった距離の分だけ飛ばない）。横の動きは `scrollY` に使わない。
* 上端・下端より先へは動かない。その先へ指を動かしても止まったままで、指を戻すと、戻した分だけすぐに動く。
* 離したら、その位置で止まる。慣性（離した後に流れること）、ホイール、横のスクロールは無い。
* 位置の表示: スクロールできるときだけ、領域の右端の内側に、縦の細い帯とつまみが描かれる（`look.scrollBar`）。帯は `{ x: 領域の x + width - 12, y: 領域の y, width: 12, height: 領域の高さ }`、つまみの長さは `Math.min(領域の高さ, Math.max(44, 領域の高さ × 領域の高さ / 中身の高さ))`、つまみの上端は `領域の y + (領域の高さ - つまみの長さ) × scrollY / (中身の高さ - 領域の高さ)`。押して動かすことはできない（上を押しても、領域のほかの場所と同じ扱い）。中の部品は右端の 12 を空けて置くと、位置の表示に重ならない。
* 切り取り: 中の部品は、領域の矩形と窓の内側で切り取られ、見えている部分だけが描かれ、押せる。全部が外にある部品は押せない。領域の矩形と重ならない中の部品は、描く関数が呼ばれず、`label`・`read`・`format`・`enabled` も呼ばれない。
* 窓のほかの部品との重なり: 領域は窓の部品の1つで、足した順に描く。領域の後に足した部品は領域の上に描かれ、そこを押しても領域には届かない。領域の中の部品どうしも、後に足した方が上で、押した位置のいちばん上の部品が調べられる。

### スクロールする領域の中の部品のポインタの受け方

領域の中の部品は、押した指が、タップ（部品を押す）かドラッグ（スクロール）かを、押した位置から動いた距離で区別する。窓に直接置いた部品（タブに入れた部品を含む）には、この区別は無く、「ポインタの受け方」「値を変える部品のポインタの受け方」のとおり。

* 押した位置から `dx² + dy² > 20²`（論理座標で 20 を越えた）になったらドラッグ。それまで（ちょうど 20 を含む）はタップ。土台の表示で約 10〜12 CSS 画素。この距離は固定で、変えられない。
* ボタン・チェックボックス・選択肢の列: 押した瞬間から、押されている見た目になる（時間を使わないので、遅らせない）。距離の手前は、窓に直接置いたときと同じ（押したまま外へずらすと押されている状態が消え、外で離すと何も起きず、戻して離すと反応する）。手前で離すと反応する。距離を越えたらドラッグになり、押されていた部品は取り消される（押されている見た目が消え、離しても反応しない）。ドラッグになった後は、部品にポインタは届かない。
* 数値・文字の表示、押せないボタン、部品の無いところ: ドラッグになるまで何も起きない。ドラッグになればスクロールする。
* スライダー: 押しただけでは何も起きない（値を書かず、押されている見た目にもならない）。距離の手前の動きも何も起きない。距離を越えたとき、横寄り（`|dx| > |dy|`）ならスライダーの操作になる: 押した位置の刻みの値を書き（窓に直接置いたときの押した瞬間と同じ）、続けて今の位置へ追う。以後は窓に直接置いたスライダーと同じ（遊び 8、離すまで横の位置で追い、外へ出ても続き、端の外は `min`・`max`、離したときの位置では値を変えない）。縦寄り（`|dx| ≤ |dy|`。等しいときは縦）ならスクロールのドラッグになり、値は変わらない。距離を越えずに離したときは、押した位置の刻みの値へ飛ぶ（`read` 1回 → 違えば `write` 1回）。
* ドラッグ中（スクロール・スライダーの操作中）に、指が領域の外・窓の外へ出ても、離すまで続く。離しても窓は閉じない。
* 状態の変更と `write`・`onPress` の呼び出しは、窓の `onPointer` の中だけで行う。`draw` の中では行わない。
* 領域の中の部品は、位置が変わるたびに（スクロールの位置が変わるとき、ドラッグになって取り消すとき）エンジンが作り直す。呼ぶ側が気にすることは無い（`label`・`read` などは作り直しでは呼ばれない）。

### ポインタの受け方

* ボタンは離したときに反応する。押したまま外へずらして離すと何も起きない（取り消し）。外へずらしてから戻して離すと反応する。
* 押し始めた部品が、離すまでポインタを受け取る。押せないボタン（`enabled` が偽）、数値・文字の表示、部品の無いところ、タイトルバーを押しても何も起きない。
* 窓の外を押して外で離すと、`closeOnOutside` が `true` なら `onClose` が呼ばれる。窓の外の押下は、`closeOnOutside` にかかわらず、部品にもタイトルバーにも届かない。窓の中で押して外で離す、外で押して中で離すときは閉じない。`closeOnOutside` が `false` なら、窓の外を押しても閉じない（閉じるボタンか、部品の中の処理で閉じる）。
* 窓の中の、部品の無いところ・タイトルバー（閉じるボタンを除く）を押した指は、離すまで、どの部品にも反応しない。
* 押している間に別の `'down'` が届いても無視する（エンジンのポインタは1本）。
* `'down'` の無い `'move'`・`'up'` には、どの部品も反応せず、窓も閉じない。
* `onPress`・`onClose` は窓の `onPointer` の中から呼ばれるので、シーンの操作（`Engine.popScene` など）をしてよい（7章）。`label`・`enabled`・`read`・`format` は `draw` の中から呼ばれるので、状態を変えないこと。

### シーンへの置き方

シーンは `init` で窓を作り、`onPointer` と `draw` で窓へ渡す。窓を `Engine.pushScene` で積めば、最前面のシーンにだけ入力が届くので、背面のシーンには入力が届かない。`onClose` で `Engine.popScene()` する。シーンを積むたびに、新しい窓を作る。

```js
import { Engine, Scene, Ui } from 'oz';

class SettingsScene extends Scene {
  init() {
    this.window = Ui.createWindow({
      title: '設定',
      width: 600,
      height: 400,
      onClose: () => Engine.popScene(),
    });
    this.window.addValue({ x: 20, y: 20, width: 560, label: 'スロー', read: () => Engine.timeScale });
    this.window.addButton({ x: 20, y: 130, width: 560, label: '閉じる', onPress: () => Engine.popScene() });
  }

  onPointer(pointer) {
    this.window.onPointer(pointer);
  }

  draw(ctx, layer) {
    if (layer === 'ui') this.window.draw(ctx);
  }
}
```

### 値を変える部品の使い方の例

3種類を使い、`read` と `write` で呼ぶ側の値につなぐ。`write` の中で `Storage`（22章）に保存する（`Storage.open` は `Engine.start` の前などに済ませておく）。

```js
import { Engine, Scene, Sound, Storage, Ui } from 'oz';

Storage.open({
  key: 'mygame',
  version: 1,
  defaults: { bgmVolume: 1, muted: false },
});

class OptionsScene extends Scene {
  init() {
    this.window = Ui.createWindow({
      title: '設定',
      width: 600,
      height: 660,
      onClose: () => Engine.popScene(),
    });

    // スライダー（0〜1 の 0.1 刻み。write に渡るのは 0.3 や 0.7 など、誤差の無い刻みの値）
    this.window.addSlider({
      x: 20, y: 20, width: 560,
      label: 'BGM の音量',
      min: 0, max: 1, step: 0.1,
      read: () => Sound.bgmVolume,
      write: (v) => {
        Sound.bgmVolume = v;
        Storage.set('bgmVolume', v);
      },
      format: (v) => Math.round(v * 100) + '%',
    });

    // チェックボックス（write に渡るのは反転した真偽）
    this.window.addCheckbox({
      x: 20, y: 172, width: 560,
      label: 'ミュート',
      read: () => Storage.get('muted'),
      write: (on) => {
        Sound.masterVolume = on ? 0 : 1;
        Storage.set('muted', on);
      },
    });

    // 選択肢の列（縦。高さの既定は 88 × 3）
    this.window.addChoices({
      x: 20, y: 280, width: 560,
      direction: 'vertical',
      choices: [
        { label: '等速', value: 1 },
        { label: '2分の1', value: 0.5 },
        { label: '4分の1', value: 0.25 },
      ],
      read: () => Engine.timeScale,
      write: (v) => { Engine.timeScale = v; },
    });
  }

  onPointer(pointer) {
    this.window.onPointer(pointer);
  }

  draw(ctx, layer) {
    if (layer === 'ui') this.window.draw(ctx);
  }
}
```

### タブとスクロールする領域の使い方の例

タブ2つ（「スクロール」「表示」）。「スクロール」のタブにスクロールする領域（中身が領域より高い）、「表示」のタブに数値の表示、どのタブにも入れないボタンを置く。領域の中の部品は、右端の 12 を空けた幅で置く。

```js
import { Engine, Scene, Sound, Ui } from 'oz';

class TabsScene extends Scene {
  init() {
    this.muted = false;
    this.window = Ui.createWindow({
      title: 'タブ',
      width: 600,
      height: 560,
      onClose: () => Engine.popScene(),
    });

    // タブの列（窓の内側の左上が原点。戻り値は、タブごとのオブジェクトの配列）
    const [scrollTab, viewTab] = this.window.addTabs({
      x: 20, y: 12, width: 560,
      labels: ['スクロール', '表示'],
    });

    // 「スクロール」のタブの、スクロールする領域（高さ 240。領域そのものの x・y は、窓の内側の左上が原点）
    const area = scrollTab.addScroll({ x: 20, y: 112, width: 560, height: 240 });
    // 領域の中の部品の位置は、領域の中身の左上が原点。領域の幅 560 に対して幅 548 なら、右端の 12 が空く
    area.addCheckbox({
      x: 0, y: 0, width: 548,
      label: 'ミュート',
      read: () => this.muted,
      write: (on) => {
        this.muted = on;
        Sound.masterVolume = on ? 0 : 1;
      },
    });
    area.addSlider({
      x: 0, y: 100, width: 548,
      label: 'BGM の音量',
      min: 0, max: 1, step: 0.1,
      read: () => Sound.bgmVolume,
      write: (v) => { Sound.bgmVolume = v; },
      format: (v) => Math.round(v * 100) + '%',
    });
    // いちばん下の部品の下端（252 + 88 = 340）が中身の高さ。340 - 240 = 100 だけスクロールできる
    area.addButton({
      x: 0, y: 252, width: 548,
      label: '最初に戻す',
      onPress: () => { Sound.bgmVolume = 1; },
    });

    // 「表示」のタブの部品。「スクロール」が選ばれている間は描かれず、押せない
    viewTab.addValue({ x: 20, y: 112, width: 560, label: 'FPS', read: () => Engine.fps, format: (v) => (v === null ? '--' : String(v)) });

    // どのタブにも入れない部品（窓に直接足す）。どちらのタブでも出ている
    this.window.addButton({
      x: 20, y: 372, width: 560,
      label: '閉じる',
      onPress: () => Engine.popScene(),
    });
  }

  onPointer(pointer) {
    this.window.onPointer(pointer);
  }

  draw(ctx, layer) {
    if (layer === 'ui') this.window.draw(ctx);
  }
}
```

### 見た目の差し替え

`look` の関数は `(ctx, info) => void` で、1回ごとに `ctx.save()` と `ctx.restore()` で囲んで呼ばれる。順序は 暗幕 → 窓 → タイトルバー → 閉じるボタン → 部品（足した順。窓の内側で切り取る。選ばれていないタブの部品は呼ばれない）。部品のうちスクロールする領域は、その位置で `scroll`（地と枠）→ 中の部品（足した順。領域の矩形でも切り取る。領域の矩形と重ならない部品は呼ばれない）→ `scrollBar`（スクロールできるときだけ。領域の矩形で切り取る）を続けて描き、領域の後に足した窓の部品はその後に描く。タブの列は、列の全体を1回の呼び出しで描く（タブごとには呼ばれない）。`info` の座標はすべて画面の論理座標である（窓の内側からの位置ではない）。`info` は描くたびに新しく作られ、書き換えても窓と部品に影響しない。戻り値は使われない。`look` の関数が投げた例外は包み直さずに伝わる（フレーム処理の中ならループが止まる。15章）。

差し替えても、押せる範囲（部品の矩形と窓の内側の重なり、閉じるボタンの正方形、窓の全体）は変わらない。描く関数は矩形の内側に描くことを勧める（はみ出しても押せる範囲は変わらない。部品は窓の内側で切り取られる）。`look` に渡した種類だけがその関数になり、渡さなかった種類は標準の見た目になる。同じ `look` のオブジェクトを複数の窓に渡して、絵柄をそろえられる。標準の見た目を描く関数は公開されていない。スライダーの位置と値の対応（溝とつまみの形、刻み、遊び）と、選択肢の等分も、差し替えても変わらない。描く関数は、渡された `track`・`knob` と選択肢の矩形のとおりに描けばよい。選択肢の列は、列の全体を1回の呼び出しで描く（選択肢ごとに呼ばれない）。つながった形（区切りの線、両端だけの角の丸みなど）を描く関数が決められる。

`look` の種類は `backdrop`（暗幕）、`window`（窓の地と枠）、`titleBar`（タイトルバーとタイトルの文字）、`closeButton`（閉じるボタン）、`button`（部品のボタン）、`value`（数値・文字の表示）、`checkbox`（チェックボックス）、`slider`（スライダー）、`choices`（選択肢の列）、`tabs`（タブの列）、`scroll`（スクロールする領域の地と枠）、`scrollBar`（スクロールの位置の表示）の12の種類。知らない名前、関数でない値はエラーになる。

| 種類 | `info` の項目 |
| --- | --- |
| `backdrop` | `x`・`y`・`width`・`height`（論理解像度の全体） |
| `window` | `x`・`y`・`width`・`height`（窓の全体）、`title`、`textSize` |
| `titleBar` | `x`・`y`・`width`・`height`（全幅で、閉じるボタンの部分を含む）、`title`、`textSize` |
| `closeButton` | `x`・`y`・`width`・`height`、`pressed`、`textSize`、`label`（常に `''`）、`enabled`（常に `true`） |
| `button` | `x`・`y`・`width`・`height`、`label`、`pressed`、`enabled`、`textSize` |
| `value` | `x`・`y`・`width`・`height`、`label`、`value`（`read` の戻り値）、`text`（`format` で整えた文字）、`textSize` |
| `checkbox` | `x`・`y`・`width`・`height`、`label`、`checked`（`Boolean(read())`）、`pressed`、`textSize` |
| `slider` | `x`・`y`・`width`・`height`、`label`、`value`（`read` の戻り値）、`text`（`format` で整えた文字）、`min`・`max`・`step`、`textRow`（文字の段）・`track`（溝）・`knob`（つまみ）（いずれも `{ x, y, width, height }`）、`pressed`（ドラッグ中か）、`textSize` |
| `choices` | `x`・`y`・`width`・`height`（列の全体）、`direction`、`choices`（選択肢ごとの `{ x, y, width, height, label, value, selected, pressed }` の配列）、`textSize` |
| `tabs` | `x`・`y`・`width`・`height`（列の全体）、`tabs`（タブごとの `{ x, y, width, height, label, selected, pressed }` の配列。`labels` の順）、`textSize` |
| `scroll` | `x`・`y`・`width`・`height`（領域の矩形）、`scrollY`（スクロールの位置）、`contentHeight`（中身の高さ）、`scrollable`（スクロールできるか）、`dragging`（スクロールのドラッグ中か）、`textSize` |
| `scrollBar` | `x`・`y`・`width`・`height`（帯）、`thumb`（つまみの `{ x, y, width, height }`）、`scrollY`・`contentHeight`・`dragging` |

`closeButton` の `label` と `enabled` は、部品のボタンと同じ形の情報なので入る（`label` は常に空文字、`enabled` は常に `true`）。

`tabs` は、タブの列全体を1回で描く（区切りの線、両端の角の丸みなど、つながった形は描く関数が決める）。`selected` は選ばれているタブ、`pressed` は押されているタブ（列全体で最大1つ）。`scroll` は中の部品の下に描く地と枠で、`scrollBar` は中の部品の上に描く位置の表示（スクロールできないときは呼ばれない）。`scroll` と `scrollBar` の `dragging` は、スクロールのドラッグ中（スライダーの操作中は偽）。差し替えても、押せる範囲、タブの等分、スクロールの動き（位置、上端・下端、位置の表示の形）は変わらない。描く関数は渡された矩形のとおりに描けばよい。

領域の中の部品の `info`（`button`・`value`・`checkbox`・`slider`・`choices`）は、今までの種類の描く関数に、スクロールの位置 `scrollY` だけずらした画面の矩形（`y` は `領域の y + 部品の y - scrollY`）で渡る。領域からはみ出す位置になることもあり、はみ出した部分は領域の矩形と窓の内側で切り取られる。

一部だけ差し替える例（タイトルバーの色と、ボタンの形を変える。ほかの種類は標準の見た目）:

```js
import { Engine, Scene, Ui } from 'oz';

const look = {
  titleBar(ctx, { x, y, width, height, title, textSize }) {
    ctx.fillStyle = '#204060';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${textSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 16, y + height / 2, width - height - 32);
  },
  button(ctx, { x, y, width, height, label, pressed, enabled, textSize }) {
    ctx.fillStyle = !enabled ? '#303030' : pressed ? '#c08000' : '#806000';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = enabled ? '#ffffff' : '#808080';
    ctx.font = `${textSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2, width - 32);
  },
};

class SettingsScene extends Scene {
  init() {
    this.window = Ui.createWindow({ title: '設定', width: 600, height: 400, onClose: () => Engine.popScene(), look });
  }
  // ...（部品の追加と onPointer・draw は 26章の最初の例と同じ）
}
```

12の種類すべてを渡せば、窓の見た目をゲームの絵柄で全部描ける（`ctx` の状態はエンジンが `save` / `restore` で囲むので、関数の中で戻さなくてよい。ただし `save` 直後の状態はシーン側の `ctx` を引き継ぐので、文字を描くときは `textAlign`・`textBaseline` を、例のように明示する）。

### 既定の大きさ

タイトルバーの高さ 88、部品の高さ 88、文字の大きさ 36 は、論理解像度の短い辺が 720 のゲームを、スマートフォンで短い辺を画面の短い辺（およそ 360〜430 CSS 画素）に合わせて表示する前提の値である。この表示では論理座標の 1 が約 0.5〜0.6 CSS 画素になり、押しやすい目安の 44 CSS 画素は、狭い方の 360 CSS 画素で論理座標 `44 × 720 / 360 = 88` に当たる。文字 36 は約 18〜21 CSS 画素である。

短い辺が違うゲームでは、`titleBarHeight`・`textSize`・部品ごとの `height` を渡す（目安は `既定 × 短い辺 / 720`）。横長のゲームを縦に持ったスマートフォンで表示すると、長い辺が画面の幅に合うので約 0.3 倍になり、既定の大きさでは小さい（ボタンは約 26 CSS 画素）。その場合は横に持つか、大きさを渡す。値は論理解像度や画素の倍率から自動では変わらない。

値を変える部品の既定の大きさ（いずれも論理座標。上と同じ考え方で決めた固定の値）:

| 部品 | 既定 |
| --- | --- |
| チェックボックス | 高さ 88 |
| スライダー | 高さ 132（文字の段 44、溝の段 88）。つまみは一辺 64（土台の表示で約 32〜38 CSS 画素。指の下からはみ出して見え、追える大きさ。押せる範囲は部品の全体なので、88 より小さくてよい）、溝の太さ 12、遊びの幅 8 |
| 選択肢の列 | 1つの選択肢の高さ 88（横なら列の高さ 88、縦なら `88 × 選択肢の数`） |

タブとスクロールする領域の既定の大きさ・固定の値（いずれも論理座標。上と同じ考え方で決めた固定の値）:

| 名前 | 値 | 内容 |
| --- | --- | --- |
| タブの列の高さ | 88 | `height` を省略したとき。タブは押す部品なので、部品の高さと同じ考え方 |
| タップとドラッグを分ける距離 | 20 | 土台の表示で約 10〜12 CSS 画素。固定で、変えられない |
| 位置の表示の帯の太さ | 12 | 押さない目印なので、スライダーの溝と同じ太さ。固定 |
| 位置の表示のつまみの最短の長さ | 44 | 中身が長くても、つまみがこれより短くならない。固定 |

スクロールする領域の高さには既定が無い（`height` は必須）。

短い辺が違うゲームでは、`height` を渡す。つまみ・溝の太さ・遊びは固定の値で、`height` に合わせて変わるのは、文字の段と溝の段の高さ、溝の段がつまみより低いときのつまみの縮みだけである。

### 注意

* 窓を置いたシーン自身が `Engine.addButton` で窓と重なる位置にボタンを登録すると、そのボタンが押下を独占し、窓には届かない。
* 窓の外の入力が背面のシーンに届かないのは、窓を置いたシーンを `Engine.pushScene` で積み、最前面のシーンにだけ入力が届く（16章）ためである。背面のシーンの `Engine.addButton` のボタンも反応しない（18章）。窓は `Engine.addButton` にも入力の仕組みにも登録されず、ポインタはシーンの `onPointer` から渡されたものだけで動く。
* 窓の外（暗幕の上）に `Engine.addButton` のボタンを登録した場合も、そのボタンの押下は窓に届かず、窓の外を押したことにならない（閉じない）。
* バーチャルパッド（24章）が処理した指（パッドの円の内側で押し始めた指）は、`onPointer` に届かないので、窓にも部品にも届かない（標準の窓も閉じない）。
* パッドが反応するのは最前面のシーンに登録したパッドだけなので、背面のシーンのパッドの位置の押下は、窓を置いたシーンの `onPointer` に届き、窓の外の押下として扱われる（`closeOnOutside` が `true` なら窓が閉じる）。閉じたくないときは、窓を置いたシーンの `init` にも同じ配置のパッドを登録する（`Engine.addVirtualPad`）。
* 窓とパッドの円が重なると、重なった部分を押した指はパッドが受け取り、部品には届かない。窓をパッドの円と重ねない。
* 窓を閉じる・切り替えて最前面のシーンが変わると、パッドのキーは離した扱いになり、触れたままの指は離すまで何も押さない（24章）。

### エラー

* すべて `Error`（先頭に `[oz] Ui.createWindow:`、窓の `addButton` は `[oz] 窓の addButton:`、`addValue` は `[oz] 窓の addValue:`、`addCheckbox` は `[oz] 窓の addCheckbox:`、`addSlider` は `[oz] 窓の addSlider:`、`addChoices` は `[oz] 窓の addChoices:`、`addTabs` は `[oz] 窓の addTabs:`、`addScroll` は `[oz] 窓の addScroll:`。タブのオブジェクトの操作は `[oz] タブの <操作名>:`、領域のオブジェクトの操作は `[oz] スクロールする領域の <操作名>:`）。項目名を含む。上から順に調べ、最初に当たったものを投げる。エラーのときは、窓は作られず、部品は足されない。
* `Engine.start` の前の `Ui.createWindow` はエラー（`[oz] Ui.createWindow: Engine.start の前には使えません`）。この判定は引数の検証より先に行う。
* 知らない項目はエラーにする（書き間違い `closeOnOutsde` などが既定の動きに黙って戻るのを防ぐため）。「書かれていて」は `undefined` でないこと（`null` はエラー）。
* フレーム処理の中でエラーを起こすと、ほかの例外と同じくループが止まる（15章）。

文面は `<先頭> <本文>` の形で、先頭は上に書いたとおり。上から順に調べ、最初に当たったものを投げる。

`Ui.createWindow`:

1. `Engine.start の前には使えません`
2. `options (窓の設定オブジェクト) が渡されていません`（`null`・配列・オブジェクトでないとき）
3. `options に使えない項目 <名前> があります`
4. `title は文字列で指定してください`
5. `width は正の有限数で指定してください`（`width`、`height` の順。`height` のときは項目名が替わる）
6. `titleBarHeight は正の有限数で指定してください`（書かれているとき）
7. `width は titleBarHeight より大きくしてください`（`width`、`height` の順）
8. `x は有限の数値で指定してください`（書かれているとき。`x`、`y` の順）
9. `onClose は関数で指定してください`
10. `closeOnOutside は true か false で指定してください`（書かれているとき）
11. `textSize は正の有限数で指定してください`（書かれているとき）
12. `look は描く関数のオブジェクトで指定してください`（書かれていて、`null`・配列・オブジェクトでないとき）
13. `look に使えない項目 <名前> があります`
14. `look.<名前> は関数で指定してください`

窓の `addButton`:

1. `spec (ボタンの設定オブジェクト) が渡されていません`
2. `spec に使えない項目 <名前> があります`
3. `x は有限の数値で指定してください`（`x`、`y` の順）
4. `width は正の有限数で指定してください`（`width`、書かれていれば `height` の順）
5. `label は文字列か、文字列を返す関数で指定してください`
6. `onPress は関数で指定してください`
7. `enabled は関数で指定してください`（書かれているとき）

窓の `addValue`: 1〜5 は `addButton` と同じ（1 は `spec (表示の設定オブジェクト) が渡されていません`）。6 は `read は関数で指定してください`、7 は `format は関数で指定してください`（書かれているとき）。

窓の `addCheckbox`:

1. `spec (チェックボックスの設定オブジェクト) が渡されていません`
2. `spec に使えない項目 <名前> があります`
3. `x は有限の数値で指定してください`（`x`、`y` の順）
4. `width は正の有限数で指定してください`（`width`、書かれていれば `height` の順）
5. `label は文字列か、文字列を返す関数で指定してください`
6. `read は関数で指定してください`
7. `write は関数で指定してください`

窓の `addSlider`:

1. `spec (スライダーの設定オブジェクト) が渡されていません`
2. `spec に使えない項目 <名前> があります`
3. `x は有限の数値で指定してください`（`x`、`y` の順）
4. `width は正の有限数で指定してください`（`width`、書かれていれば `height` の順）
5. `width は 64 より大きくしてください`（`width` が 64 以下のとき）
6. `label は文字列か、文字列を返す関数で指定してください`
7. `min は有限の数値で指定してください`（`min`、`max` の順）
8. `max は min より大きくしてください`
9. `step は正の有限数で指定してください`
10. `step は max - min 以下にしてください`
11. `max - min は step の整数倍にしてください`
12. `read は関数で指定してください`
13. `write は関数で指定してください`
14. `format は関数で指定してください`（書かれているとき）

窓の `addChoices`:

1. `spec (選択肢の列の設定オブジェクト) が渡されていません`
2. `spec に使えない項目 <名前> があります`
3. `x は有限の数値で指定してください`（`x`、`y` の順）
4. `width は正の有限数で指定してください`（`width`、書かれていれば `height` の順）
5. `direction は 'horizontal' か 'vertical' で指定してください`（書かれているとき）
6. `choices は配列で指定してください`
7. `choices に選択肢がありません`
8. 選択肢ごとに先頭から、次を順に調べる（`<i>` は番号、0 から）:
    1. `choices[<i>] は label と value を持つオブジェクトで指定してください`（`null`・配列・オブジェクトでないとき。配列の穴も）
    2. `choices[<i>] に使えない項目 <名前> があります`
    3. `choices[<i>].label は文字列か、文字列を返す関数で指定してください`
    4. `choices[<i>].value を指定してください`（`undefined` のとき）
    5. `choices[<i>].value が choices[<j>].value と同じです`（`<j>` は `<i>` より前で、`===` で同じ最初の番号）
9. `read は関数で指定してください`
10. `write は関数で指定してください`

窓の `addTabs`（`[oz] 窓の addTabs:`）:

1. `タブの列は1つの窓に1つまでです`（すでにタブの列を足したとき。設定より先に調べる）
2. `spec (タブの列の設定オブジェクト) が渡されていません`
3. `spec に使えない項目 <名前> があります`
4. `x は有限の数値で指定してください`（`x`、`y` の順）
5. `width は正の有限数で指定してください`（`width`、書かれていれば `height` の順）
6. `labels は配列で指定してください`
7. `labels にタブがありません`
8. `labels[<i>] は文字列か、文字列を返す関数で指定してください`（先頭から。配列の穴も）

窓の `addScroll`・タブの `addScroll`（先頭は `[oz] 窓の addScroll:`・`[oz] タブの addScroll:`）:

1. `spec (スクロールする領域の設定オブジェクト) が渡されていません`
2. `spec に使えない項目 <名前> があります`
3. `x は有限の数値で指定してください`（`x`、`y` の順）
4. `width は正の有限数で指定してください`（`width`、`height` の順。`height` は必須）

入れられない組み合わせ（設定は調べず、呼ぶと必ずエラー）:

* タブの `addTabs`: `[oz] タブの addTabs: タブの列はタブに入れられません`
* 領域の `addTabs`: `[oz] スクロールする領域の addTabs: タブの列はスクロールする領域に入れられません`
* 領域の `addScroll`: `[oz] スクロールする領域の addScroll: スクロールする領域はスクロールする領域に入れられません`

タブのオブジェクト・領域のオブジェクトの5つの足す操作（`addButton`・`addValue`・`addCheckbox`・`addSlider`・`addChoices`）は、窓の同じ操作と同じ文面・同じ順（先頭だけが `[oz] タブの <操作名>:`・`[oz] スクロールする領域の <操作名>:` に替わる）。タブのオブジェクトの `addScroll` は上の `addScroll` と同じ。エラーのときは何も足されない。
