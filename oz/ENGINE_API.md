# OZ Engine API

このドキュメントだけで、エンジンを使うゲーム（利用側）を実装できる。

## 1. 概要と使えるもの

利用側が使えるのは次の2つだけである。

```js
import { Engine, Scene } from 'oz';
```

* `Engine` : 起動、シーンの操作、`timeScale` の読み書き、ボタンの登録、キーの状態の取得
* `Scene` : シーンの基底クラス

ブラウザの Canvas 2D と ES Modules で動く。ビルドは不要だが、実行には静的サーバが必要である（`file://` では ES Modules が動かない）。

## 2. `index.html` の書き方

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Game</title>
  <script type="importmap">
    { "imports": { "oz": "./oz/index.js", "assets/": "./assets/" } }
  </script>
  <style>
    html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
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
* 中央寄せと黒い余白は、上の CSS で行う。

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
| `debug` | 任意 | `false` | 真なら FPS を最前面に表示する |

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

* `width` / `height` が Canvas の解像度と描画の座標になる。原点は左上で、x は右、y は下へ増える。
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
* 積むと、背面のシーンには入力（`onPointer`・`onKeyDown`）も届かず、背面のシーンのボタンも反応しない。戻すと再び届き、反応する。
* ポーズは専用APIではなく、ポーズ用のシーンを `pushScene` で積み、`popScene` で戻して作る。

## 7. 操作を呼んでよい場所

* 呼んでよい: `update`・`onPointer`・`onKeyDown`・`onPress`（18章）の中と、フレーム処理の外（タイマー、Promise の完了時など）。
* 呼ばない: `draw`・`init`・`destroy` の中。実行時の検出はしないので、呼んだ場合の動作は保証されない。

## 8. 操作の直後の時間

シーンの操作があったフレームでは、残りのティックが回らない。次のフレームの経過時間も進まない。これにより、操作のあとに動きが飛ばない。フレーム処理の外で操作した場合は、次のフレームでティックが回らない。

入力の配信（`onPointer`・`onKeyDown`・`onPress`）の中で操作した場合も同じで、そのフレームのティックは回らず、次のフレームの経過時間も進まない。そのフレームの残りの入力は、新しい最前面のシーンへ届く。

## 9. スタックが空のとき

* `popScene` などでスタックが空になってもエラーにならない。シーンのメソッドは何も呼ばれない。
* 空のスタックへの `popScene` は何もしない。
* 配る先のない入力は捨てられる。`Engine.isKeyDown` は使える。
* 画面の消去と、`debug` の FPS 表示は続く。
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

* `1` が等速。小さくすると遅くなる。`0` なら `update` は呼ばれず、`draw` は続く。
* `0` でも入力は届く。再開には `onPointer`・`onKeyDown`・`onPress` の中で値を戻せばよい。
* 入力の配信の中で変更した値は、次のフレームの時間から効く。変更したフレームは、蓄積済みの分の `update` が回ることがある。
* 負の値や数値以外を代入すると `RangeError` になる。
* 描画の補間はしない。小さくすると、動きはティック単位で段階的になる。

```js
Engine.timeScale = 0.5; // 半分の速さ
```

## 13. 動きの指針

* 動きは `update(dt)` で進める。`time.gameTime` は周期的な動き（`Math.sin` など）に使う。
* `update` の中で描画しない。`draw` の中でシーンの状態を変更しない。
* `draw` の中で `ctx` の状態を変更するときは、`ctx.save()` と `ctx.restore()` を対で使う。

## 14. `debug`

`debug: true` で起動すると、左上に FPS が最前面で表示される。実行中には切り替えられない。

## 15. 例外

* フレーム処理の中（`update`・`draw`・`onPointer`・`onKeyDown`・`onPress`、およびこれらから呼んだシーン操作による `init`・`destroy`）でシーンのメソッドまたはボタンの関数が例外を投げると、ループが止まり、コンソールにエラーが残る。
* フレーム処理の外（タイマー、Promise の完了時など）からのシーン操作で `init`・`destroy` が例外を投げた場合は、例外が呼び出し元へ伝わるだけで、ループは止まらない。そのときのスタックの状態:
  * `init` が失敗したシーンは、スタックに積まれたまま残る。次のフレームはティックが回らないので（8章）`update` は呼ばれず、`update` が呼ばれるのはその次のフレーム以降になる。ただし次のフレームでもティックの前に入力は配られるので、失敗したシーンが最前面なら、そのシーンの `onPointer`・`onKeyDown`・ボタンの `onPress` は呼ばれることがある。`draw` も呼ばれる。
  * `destroy` が失敗したシーンは、`popScene`・`changeScene` のどちらでもスタックから外れている。
  * `changeScene` の途中で `destroy` が失敗すると、新しいシーンは積まれず、スタックは途中まで外れた状態で残る。
* `Engine.start` の中で最初のシーンの `init` が失敗した場合は、例外が `start` から投げられ、ループは始まらない。

## 16. ポインタ入力

`onPointer(pointer)` の `pointer` は `{ type, x, y }` である。`type` は `'down'`・`'move'`・`'up'`、`x`・`y` は描画と同じ論理座標である。戻り値は使わない。

* 最前面のシーンだけに届く。
* マウス、タッチ、ペンを同じように扱う。主ポインタの主ボタンだけを扱い、マルチタッチ、右クリック、中クリックは扱わない。
* 押さずにマウスを動かしても `'move'` が届く。連続した `'move'` は1フレームに1つにまとめられることがある。
* 押したまま canvas の外へ出ても `'up'` が届く。このとき `x`・`y` は論理解像度の範囲外の値になることがある。
* 押下の中断も `'up'` として届く。
* 入力は canvas の上でだけ受け取る。押さずに canvas の外（中央寄せで生じる余白を含む）を動かしたり、そこで押したりしても何も届かない。canvas の外で押してから canvas の上へ入ると、`'down'` のない `'move'` だけが届き、離しても `'up'` は届かない。
* タッチでページがスクロールや拡大をしないように、エンジンが canvas の `touch-action` を `none` に設定する。
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
* ウィンドウからフォーカスが外れると、押している状態はすべて解除される。
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
* ポインタの `'down'` の位置が矩形の内側なら `onPress()` が呼ばれる。その押下は、離すまでの `'move'`・`'up'` も含めて、シーンの `onPointer` に届かない。`onPress` の中でシーンが変わっても、新しいシーンにも届かない。
* 左端と上端を含み、右端と下端を含まない。重なっている場合は、後に登録したものだけが反応する。
* 反応するのは最前面のシーンのボタンだけである。背面になると反応せず、戻ると再び反応する。スタックから外れたシーンのボタンは反応しない。
* エンジンはボタンを描かない。利用側がシーンの `draw` で描く。
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
* ポインタはボタン → 最前面のシーンの順に、キーは最前面のシーンに届く。
