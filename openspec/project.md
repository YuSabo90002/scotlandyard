# Project Context

## Purpose
Scotland Yard - オンライン対戦ボードゲーム

推理ゲーム「スコットランドヤード」のオンライン実装。刑事側プレイヤーが怪盗X（Mr. X）を追跡する非対称型のマルチプレイヤーゲーム。

## Tech Stack
- TypeScript (厳格な型チェック)
- React (UIフレームワーク)
- Phaser 3 (ゲームフレームワーク)
- Rollup (バンドラー)
- Jest (テスティングフレームワーク)
- Node.js (開発サーバー)
- WebSocket (リアルタイム通信 - 将来実装)

## Project Conventions

### Code Style
- TypeScript strict モード有効
- ESLint + Prettier によるフォーマット
- 関数型プログラミングスタイル優先
- イミュータブルなデータ構造

### Architecture Patterns
- ドメイン駆動設計 (DDD)
- ヘキサゴナルアーキテクチャ
- イベントソーシング（ゲーム状態管理）
- CQRS（コマンドとクエリの分離）

### Testing Strategy
**TDD (Test-Driven Development) を厳格に適用**

#### TDD サイクル
1. **Red** - 失敗するテストを書く
2. **Green** - テストを通す最小限のコードを書く
3. **Refactor** - コードをリファクタリング

#### テスト構造
- **Unit Tests**: ドメインロジック、ゲームルール
- **Integration Tests**: API、WebSocket通信
- **E2E Tests**: ゲームフロー全体

#### カバレッジ目標
- 最低 80% のコードカバレッジ
- ゲームルールは 100% カバレッジ必須

### Git Workflow
- Feature Branch Workflow
- Conventional Commits 形式
- PRベースのコードレビュー必須

## Domain Context

### Scotland Yard ゲームルール概要
- **プレイヤー**: 1人の怪盗X + 複数の刑事（2-5人）
- **目的**:
  - 刑事側: 怪盗Xと同じ位置に移動して逮捕
  - 怪盗X側: 一定ターン数逃げ切る
- **移動手段**: タクシー、バス、地下鉄（怪盗Xのみブラックチケット）
- **特徴**: 怪盗Xは特定ターンのみ位置が公開される

### ゲーム用語
- **Station/Node**: マップ上の地点
- **Connection/Edge**: 地点間の移動ルート
- **Transport**: 移動手段（Taxi/Bus/Underground/Black）
- **Reveal Turn**: 怪盗Xの位置が公開されるターン
- **Ticket**: 移動に使用するチケット

## Important Constraints
- すべての新機能はテストファーストで開発
- ゲームルールの変更は必ず仕様書に反映
- 不正防止のため、サーバー側でルール検証必須
- リアルタイム性が重要（レイテンシ < 100ms目標）

## External Dependencies
- Jest: テスティングフレームワーク
- ws: WebSocketライブラリ
- OpenSpec CLI: 仕様管理ツール
