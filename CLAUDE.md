# OZ Engine

HTML+JS 製ゲームの基礎機能を提供する、一人開発向けのエンジンとその最小サンプル。ブラウザの Canvas 2D と Vanilla JS（ES Modules、ビルドなし）で動く。コードを変更する者は必ず `./PROJECT_CONSTITUTION.md` に従うこと。

開発は DIR/REQ/RES 駆動で行う（DIR: `_log/dir/`、REQ: `_log/req/`、RES: `_log/res/`）。

* **プロジェクト立ち上げ前**（`PROJECT_ARCHITECTURE.md` がまだ雛形のまま）なら、`_doc/INITIAL_PROJECT_STARTUP.md` の手順に従う。
* **Phase の親セッション**（DIR策定・サブフェイズ管理）では、スキル `oz-dir-session` の手順に従う。
* **REQ／サブフェイズのセッション**（親から起動された子、または単独の Interrupt / Survey）では、スキル `oz-req-session` の手順に従う（実装はサブエージェント `oz-implementer`、監査は `oz-auditor` に任せる）。
* **サブエージェントとして起動された場合**は、渡された指示とエージェント定義だけに従い、上記スキル・手順書は参照しない。
