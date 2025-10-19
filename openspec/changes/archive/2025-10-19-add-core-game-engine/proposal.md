## Status

**部分的に完了（Partially Deployed）** - 2025-10-19

コアゲーム機能の実装が完了しました。以下の機能が実装され、テストに合格しています：
- プライベートマッチ機能（ルームID共有）- E2Eテスト 7/7 passed
- 刑事の位置重複禁止ルール（公式ルール準拠）- Domain/Serverテスト passed
- ダブルムーブカード（逐次選択方式）- E2Eテスト 4/4 passed
- 移動回数ベースの位置公開 - テスト passed
- Ferry路線対応（ブラックチケット専用）- テスト passed
- Phaserマップレンダリング - 基本機能完了

**未完了（別Specで対応予定）：**
- デプロイ設定（Task 16全般）
- WebSocket接続安定性テスト（Task 17.4）
- UI/UX改善（Task 17.5）
- パフォーマンス最適化（Task 17.6）

**テスト結果：**
- Domain: 154/154 passed (89.78% coverage)
- Server: 54/54 passed (66.08% coverage)
- E2E: 11/11 passed (7 core + 4 double-move)

## Why

Scotland Yardゲームのコア機能を実装する必要があります。React + Phaser 3 + WebSocketを使用して、ブラウザ上で動作するオンライン対戦ゲームを構築します。

ゲームの性質上、情報の非対称性（怪盗Xの位置を隠す）が重要なため、ローカル対戦ではなく最初からオンライン対戦を実装します。

## What Changes

**ドメイン層（クライアント・サーバー共有）:**
- ゲームボード（マップ）の表現とノード・エッジ管理
- ゲーム状態の管理（プレイヤー位置、ターン、チケット）
- プレイヤー移動のバリデーションとロジック
- 怪盗Xの特殊ルール（位置非公開、ブラックチケット）
- 勝利条件の判定
- イベントソーシング（ゲーム履歴記録）

**クライアント側:**
- React UIコンポーネント（ルーム作成/参加、情報パネル）
- Phaserゲーム描画（ボード、プレイヤー駒、アニメーション）
- React + Phaser連携システム
- WebSocketクライアント（useWebSocket hook）

**サーバー側:**
- Node.js + WebSocketサーバー
- ゲームルーム管理（作成、参加、退出）
- サーバー側ゲームルール検証
- プレイヤー視点に応じた状態配信

**インフラ:**
- Monorepo構成（pnpm workspaces）
- Vercelデプロイ設定（クライアント）
- Railway/Renderデプロイ設定（サーバー）

## Impact

- 影響を受けるSpec:
  - `game-board` (新規作成)
  - `game-state` (新規作成)
  - `player-movement` (新規作成)
  - `game-ui` (新規作成)
  - `network-multiplayer` (新規作成)

- 影響を受けるコード:
  - 新規プロジェクトのため、すべて新規作成
  - `packages/domain/` - 共有ドメインロジック
  - `packages/client/` - React + Phaser フロントエンド
  - `packages/server/` - Node.js + WebSocket サーバー
  - `tests/` - テストコード（TDD）
  - デプロイ設定（Vercel、Railway/Render）
