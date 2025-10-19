# Scotland Yard Online

ブラウザで動作するScotland Yardのオンライン対戦ゲームです。React + Phaser 3 + WebSocketを使用して実装されています。

## 🎮 ゲーム概要

Scotland Yardは、1人の怪盗X（Mr. X）と複数の刑事が対戦する非対称型の推理ゲームです。怪盗Xはロンドンの地図上を逃げ回り、刑事たちは協力して怪盗Xを捕まえます。

### 主な機能

- **プライベートマッチ**: ルームIDを共有して友達と対戦
- **公式ルール準拠**:
  - 刑事の位置重複禁止
  - ダブルムーブカード（2手連続移動）
  - 移動回数ベースの位置公開
  - Ferry路線（ブラックチケット専用）
- **リアルタイム対戦**: WebSocketによる即座の状態同期
- **インタラクティブなマップ**: Phaserによる滑らかなアニメーション

## 🏗️ プロジェクト構成

このプロジェクトは pnpm workspaces を使用したモノレポ構成です：

```
packages/
├── domain/      # 共有ドメインロジック（ゲームルール、状態管理）
├── client/      # React + Phaser フロントエンド
├── server/      # Node.js + WebSocket サーバー
└── e2e/         # Playwright E2Eテスト
```

## 🚀 セットアップ

### 必要な環境

- Node.js 18.x 以上
- pnpm 8.x 以上

### インストール

```bash
# 依存関係をインストール
pnpm install

# マップデータを生成
node scripts/generate-map-data.js
```

### 開発サーバーの起動

```bash
# 開発サーバーとクライアントを両方起動
pnpm dev

# または個別に起動
pnpm --filter @scotland-yard-online/server dev  # ポート 3001
pnpm --filter @scotland-yard-online/client dev  # ポート 3000
```

ブラウザで `http://localhost:3000` を開いてゲームをプレイできます。

## 🧪 テスト

```bash
# 全てのテストを実行
pnpm test

# 各パッケージのテストを個別に実行
pnpm --filter @scotland-yard-online/domain test
pnpm --filter @scotland-yard-online/server test
pnpm --filter @scotland-yard-online/e2e test

# カバレッジ付きでテスト
pnpm test --coverage
```

### テスト結果

- **Domain**: 154/154 passed (89.78% coverage)
- **Server**: 54/54 passed (66.08% coverage)
- **E2E**: 11/11 passed (7 core + 4 double-move)

## 📋 ゲームルール

### 基本ルール

1. **プレイヤー**: 3-6人（怪盗X 1人 + 刑事 2-5人）
2. **勝利条件**:
   - **刑事の勝利**: 怪盗Xと同じ位置に到達
   - **怪盗Xの勝利**: 24移動完了まで逃げ切る

### 移動

- **交通手段**: Taxi（黄）、Bus（緑）、Underground（赤）、Ferry（青）
- **チケット**: 各交通手段の利用にはチケットが必要
- **ブラックチケット**: 怪盗X専用、全ての交通手段で使用可能

### 特殊ルール

- **位置公開**: 怪盗Xは特定の移動回数（3, 8, 13, 18, 24）で位置を公開
- **ダブルムーブ**: 怪盗Xは2回まで連続移動可能（ダブルムーブカード使用）
- **位置重複禁止**: 刑事同士は同じ位置に止まれない

## 🎯 開発ガイドライン

このプロジェクトは [OpenSpec](./openspec/) を使用した仕様駆動開発を採用しています。

### 仕様ファイル

- [game-board](./openspec/specs/game-board/spec.md) - ゲームボードとマップ
- [game-state](./openspec/specs/game-state/spec.md) - ゲーム状態管理
- [player-movement](./openspec/specs/player-movement/spec.md) - プレイヤー移動ロジック
- [game-ui](./openspec/specs/game-ui/spec.md) - ユーザーインターフェース
- [network-multiplayer](./openspec/specs/network-multiplayer/spec.md) - ネットワーク対戦

### 新機能の追加

1. `/openspec:proposal` で変更提案を作成
2. 仕様をレビュー・承認
3. `/openspec:apply` で実装
4. `/openspec:archive` でアーカイブ

## 📝 TODO

以下の機能は別のSpecで対応予定です：

- [ ] デプロイ設定（Vercel + Railway/Render）
- [ ] WebSocket接続安定性テスト
- [ ] UI/UX改善（マップ見た目調整、エラーメッセージ改善）
- [ ] パフォーマンス最適化

## 📄 ライセンス

MIT License

## 🙏 クレジット

- マップデータ: [AlexElvers/scotland-yard-data](https://github.com/AlexElvers/scotland-yard-data)
- ゲームデザイン: Ravensburger (Scotland Yard board game)
