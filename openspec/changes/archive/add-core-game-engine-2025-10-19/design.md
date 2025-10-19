# Design: Core Game Engine

## Context

Scotland Yardのコアゲームエンジンを実装する。React + Phaser 3を使用してブラウザ上で動作するオンライン対戦ゲームを構築する。

### 背景
- 新規プロジェクトのため、アーキテクチャを慎重に設計する必要がある
- TDDアプローチで開発するため、テスタビリティが重要
- ゲームロジック、React UI、Phaserゲーム描画を明確に分離する
- ReactはメニューやUI管理、PhaserはゲームボードとアニメーションのみDOMを担当
- ドメインロジックは両フレームワークから独立

### 制約
- TypeScript strictモード
- 純粋関数型スタイル（イミュータブル）でドメインロジックを実装
- React/Phaserへの依存はpresentationレイヤーのみに限定
- ドメインロジックは標準ライブラリのみに依存（テスト容易性）
- Rollupでバンドル、開発時はVite推奨

## Goals / Non-Goals

### Goals
- ゲームルールを正確に実装
- 高いテストカバレッジ（80%以上、ゲームルールは100%）
- Phaserを使ったインタラクティブなUI
- ドメインロジックとプレゼンテーション層の明確な分離
- リアルタイムなゲーム体験（アニメーション、エフェクト）
- **オンライン対戦機能（WebSocket）を最初から実装**
- プレイヤー毎の視点管理（怪盗Xの位置を隠蔽）

### Non-Goals
- ローカル対戦（情報非対称性が成立しないため不要）
- 永続化/データベース（この段階では不要）
- AIプレイヤー（将来的に検討）
- モバイル最適化（まずはデスクトップブラウザ対応）
- ランキング・マッチング（別の変更で追加）

## Decisions

### 1. レイヤードアーキテクチャ（React + Phaser統合）

**決定**: ドメインロジックを中心に、ReactとPhaserを役割分担

```
# クライアント側
client/
├── domain/              # ドメインロジック（React/Phaser非依存）
│   ├── entities/       # ゲームエンティティ
│   ├── value-objects/  # 値オブジェクト
│   └── services/       # ドメインサービス（ゲームルール）
├── application/         # アプリケーション層（ユースケース）
│   └── usecases/       # ゲーム操作のユースケース
├── presentation/        # プレゼンテーション層
│   ├── react/          # React UIコンポーネント
│   │   ├── components/ # メニュー、情報パネル等
│   │   └── hooks/      # カスタムフック
│   └── phaser/         # Phaserゲーム描画
│       ├── scenes/     # Phaserシーン
│       └── objects/    # ゲームオブジェクト（駒、ボード）
└── infrastructure/      # 外部アダプタ
    └── websocket/      # WebSocketクライアント

# サーバー側
server/
├── domain/              # 同じドメインロジックを共有
├── infrastructure/
│   └── websocket/      # WebSocketサーバー
└── game-rooms/         # ゲームルーム管理
```

**理由**:
- ドメインロジックがReact/Phaserに依存しない（テスト容易）
- Reactで状態管理とUI、Phaserでゲーム描画のみ
- 明確な責任分離（React=UI管理、Phaser=ゲーム描画）
- ドメイン層は純粋関数のみ

**代替案**:
- React のみ（Canvas描画）: ゲームエンジンの恩恵なし
- Phaser のみ: UI管理が複雑化
- 密結合アーキテクチャ: テスト困難、移植性なし

### 2. イミュータブルデータ構造

**決定**: すべてのゲーム状態は不変（Immutable）

```typescript
// 状態更新は新しいオブジェクトを返す
type GameState = Readonly<{
  players: ReadonlyArray<Player>;
  currentTurn: number;
  // ...
}>;

function movePlayer(state: GameState, move: Move): GameState {
  // 新しいGameStateオブジェクトを返す
}
```

**理由**:
- 状態管理が明確（副作用なし）
- デバッグが容易
- 履歴管理が簡単（イベントソーシング）
- 並行処理が安全（将来のネットワーク対応）

**代替案**:
- Mutableアプローチ: シンプルだが、バグの温床になりやすい

### 3. イベントソーシングでゲーム履歴管理

**決定**: ゲームの状態変更をイベントとして記録

```typescript
type GameEvent =
  | { type: 'GAME_STARTED'; players: Player[] }
  | { type: 'PLAYER_MOVED'; playerId: string; from: NodeId; to: NodeId; ticket: MoveTicketType }
  | { type: 'DOUBLE_MOVE_USED'; playerId: string; moves: [
      { from: NodeId; to: NodeId; ticket: MoveTicketType },
      { from: NodeId; to: NodeId; ticket: MoveTicketType }
    ]}
  | { type: 'GAME_ENDED'; winner: 'DETECTIVES' | 'MR_X' };

// イベントの再生で状態を復元
function replayEvents(events: GameEvent[]): GameState;
```

**理由**:
- 完全な監査ログ
- リプレイ機能が容易
- デバッグ・テストが簡単
- ネットワーク同期が簡単（イベントを送信）

**代替案**:
- スナップショットのみ: 履歴が失われる
- フルステート同期: ネットワーク負荷が大きい

### 4. 型安全な交通手段とチケット

**決定**: Union型とリテラル型で型安全性を確保

```typescript
// 交通手段の種類（ボード上のコネクション）
type TransportType = 'TAXI' | 'BUS' | 'UNDERGROUND' | 'FERRY';

// 通常の交通手段（チケットで直接利用可能）
type RegularTransportType = 'TAXI' | 'BUS' | 'UNDERGROUND';

// プレイヤーが保有できるチケットの種類
type TicketType = RegularTransportType | 'BLACK' | 'DOUBLE_MOVE';

// 通常の移動チケット（ダブルムーブで選択可能なチケット）
type MoveTicketType = RegularTransportType | 'BLACK';

// プレイヤーが保有するチケット
type Tickets = {
  readonly [K in TicketType]: number;
};

// ダブルムーブカード使用時は、各移動ごとにチケットを選択
// （事前に2枚選択するのではなく、1回目の移動後に2回目のチケットを選択）
```

**理由**:
- コンパイル時にエラー検出
- IDEの補完が効く
- ランタイムエラーを減らす
- ダブルムーブカードは移動チケットとは別の特殊カードとして扱う
- ダブルムーブ使用時は通常の移動チケット（MoveTicketType）を2枚選択する
- FERRYは交通手段として存在するが、専用チケットはなくブラックチケットでのみ利用可能

### 5. Result型によるエラーハンドリング

**決定**: 例外ではなくResult型を使用

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

type MoveError =
  | { type: 'NOT_CONNECTED'; message: string }
  | { type: 'INVALID_TICKET'; message: string }
  | { type: 'INSUFFICIENT_TICKET'; message: string }
  | { type: 'NOT_YOUR_TURN'; message: string }
  | { type: 'NODE_OCCUPIED'; message: string; occupiedBy: DetectiveId }; // 刑事同士の位置重複禁止

function validateMove(state: GameState, move: Move): Result<void, MoveError> {
  // 刑事の移動の場合、目的地が他の刑事に占有されていないかチェック
  if (isDetective(move.playerId)) {
    const occupyingDetective = getDetectiveAtNode(state, move.destination);
    if (occupyingDetective && occupyingDetective !== move.playerId) {
      return {
        ok: false,
        error: {
          type: 'NODE_OCCUPIED',
          message: 'この位置は既に他の刑事に占有されています',
          occupiedBy: occupyingDetective
        }
      };
    }
  }
  // その他のバリデーション...
}
```

**理由**:
- エラー処理が明示的
- 型システムで網羅性チェック
- 例外より予測可能

**代替案**:
- 例外: TypeScriptでは型安全でない
- nullチェック: エラー情報が失われる

### 6. テストデータビルダーパターン

**決定**: テストで使いやすいビルダーを提供

```typescript
// テストでのゲームボード構築を簡単に
const board = GameBoardBuilder.create()
  .addNode(1)
  .addNode(2)
  .addConnection(1, 2, 'TAXI')
  .build();
```

**理由**:
- テストコードの可読性
- テストデータの再利用
- TDDサイクルを高速化

### 7. React + Phaser統合パターン

**決定**: Reactコンポーネント内にPhaser Gameインスタンスを埋め込み

```typescript
// Reactコンポーネント
function GameContainer() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameState, setGameState] = useState<GameState>(initialState);

  useEffect(() => {
    // Phaser Game初期化
    gameRef.current = new Phaser.Game(config);
    return () => gameRef.current?.destroy(true);
  }, []);

  return (
    <div>
      <div id="phaser-game" /> {/* Phaserがここに描画 */}
      <GameUI state={gameState} onMove={handleMove} />
    </div>
  );
}
```

**理由**:
- ReactがライフサイクルとDOMを管理
- Phaserは専用のcanvasに描画のみ
- 状態はReact側で管理（useState/useReducer）
- UIとゲーム描画の明確な分離

**代替案**:
- Phaserのみでシーン管理: UI構築が煩雑
- React-Phaser統合ライブラリ: 未成熟、カスタマイズ困難

### 8. Phaserシーン設計

**決定**: シンプルな単一シーン構成

```typescript
// シーン構成
- GameScene: ゲームボードとプレイヤー駒の描画のみ
```

**理由**:
- メニュー等のUIはReactで管理するため、Phaserは描画のみ
- シンプルな構成で複雑性を削減
- React側からシーンを制御

**代替案**:
- 複数シーン: ReactとPhaserで責任が重複し複雑化

### 9. WebSocketサーバー選定とアーキテクチャ

**決定**: Node.js + ws ライブラリ、デプロイはRailway/Render

```typescript
// サーバー構成
- Node.js + TypeScript
- ws (WebSocketライブラリ)
- ゲームルームごとに独立した状態管理
- ドメインロジックはクライアントと共有（monorepo）

// デプロイ
- クライアント: Vercel
- サーバー: Railway or Render
- ドメインロジック: npmパッケージとして共有
```

**理由**:
- Node.jsでクライアントとコード共有可能
- wsは軽量で信頼性が高い
- Railway/Renderは無料枠でWebSocket対応
- サーバー側でゲームルール検証（不正防止）

**代替案**:
- Socket.io: 機能過多、wsで十分
- Supabase Realtime: ゲームロジックに不向き
- Firebase: リアルタイムだがコスト高

### 10. ゲームルーム管理

**決定**: メモリ内でゲームルーム管理（Redisは後で）、プライベートマッチ重視

```typescript
type RoomId = string; // 6-8文字の英数字コード（例: "ABC123"）

class GameRoomManager {
  private rooms: Map<RoomId, GameRoom> = new Map();

  createRoom(hostPlayer: Player): RoomId; // ランダムな6-8文字のIDを生成
  joinRoom(roomId: RoomId, player: Player): Result<void>;
  leaveRoom(roomId: RoomId, playerId: PlayerId): void;
  getRoomById(roomId: RoomId): GameRoom | undefined;
}

class GameRoom {
  id: RoomId; // 共有可能なルームID
  gameState: GameState;
  players: Map<PlayerId, WebSocket>;
  hostPlayerId: PlayerId; // ルーム作成者
  isPrivate: boolean = true; // デフォルトでプライベート

  broadcast(event: GameEvent, excludePlayer?: PlayerId): void;
  sendToPlayer(playerId: PlayerId, event: GameEvent): void;
}
```

**理由**:
- シンプルで高速
- 小〜中規模（〜100同時ルーム）なら十分
- 必要になったらRedisに移行可能

**代替案**:
- Redis: 初期段階では過剰
- データベース: リアルタイム性に劣る

### 11. クライアント・サーバー通信プロトコル

**決定**: JSON + イベント駆動メッセージング

```typescript
// クライアント → サーバー
type ClientMessage =
  | { type: 'CREATE_ROOM'; playerName: string } // プライベートルーム作成
  | { type: 'JOIN_ROOM'; roomId: RoomId; playerName: string } // ルームIDで参加
  | { type: 'START_GAME' } // ホストのみ実行可能
  | { type: 'PLAYER_MOVE'; ticket: MoveTicketType; destination: NodeId }
  | { type: 'START_DOUBLE_MOVE' }  // ダブルムーブ開始
  | { type: 'DOUBLE_MOVE_FIRST'; ticket: MoveTicketType; destination: NodeId }  // 1回目の移動
  | { type: 'DOUBLE_MOVE_SECOND'; ticket: MoveTicketType; destination: NodeId } // 2回目の移動
  | { type: 'LEAVE_ROOM' };

// サーバー → クライアント
type ServerMessage =
  | { type: 'ROOM_CREATED'; roomId: RoomId; playerId: PlayerId } // ルームID（6-8文字）を返す
  | { type: 'ROOM_JOINED'; roomId: RoomId; playerId: PlayerId; players: Player[] } // 参加成功
  | { type: 'PLAYER_JOINED'; player: Player } // 他プレイヤーの参加通知
  | { type: 'PLAYER_LEFT'; playerId: PlayerId } // プレイヤー退出通知
  | { type: 'GAME_STARTED'; initialState: GameState; role: 'MR_X' | 'DETECTIVE'; detectives: DetectiveId[] } // 役割と操作する刑事を通知
  | { type: 'GAME_STATE_UPDATED'; state: GameState } // プレイヤー視点でフィルタ済み
  | { type: 'PLAYER_MOVED'; event: PlayerMovedEvent }
  | { type: 'DOUBLE_MOVE_STARTED'; playerId: string } // ダブルムーブ開始通知
  | { type: 'DOUBLE_MOVE_FIRST_COMPLETED'; playerId: string; destination: NodeId } // 1回目完了
  | { type: 'DOUBLE_MOVE_COMPLETED'; playerId: string } // ダブルムーブ完了
  | { type: 'GAME_ENDED'; winner: 'DETECTIVES' | 'MR_X' }
  | { type: 'ERROR'; message: string; code: ErrorCode };

type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NOT_ENOUGH_PLAYERS'
  | 'NOT_HOST'
  | 'INVALID_MOVE'
  | 'NOT_YOUR_TURN'
  | 'NODE_OCCUPIED'; // 刑事同士の位置重複
```

**理由**:
- 型安全（TypeScriptで共有）
- 拡張しやすい
- デバッグしやすい（JSONで可読）

**代替案**:
- Protocol Buffers: この規模では過剰
- MessagePack: 最適化は後で

### 12. ドメインとPresentation層の連携

**決定**: Reactフックとイベント駆動でドメイン層と連携

```typescript
// カスタムフック
function useGameEngine() {
  const [state, setState] = useState(initialGameState);

  const movePlayer = (move: Move) => {
    // ドメイン層: 純粋関数
    const result = validateAndMove(state, move);
    if (result.ok) {
      setState(result.value);
      // Phaserにイベント発火
      gameEvents.emit('PLAYER_MOVED', result.value);
    }
  };

  return { state, movePlayer };
}

// Phaserシーン
class GameScene extends Phaser.Scene {
  create() {
    gameEvents.on('PLAYER_MOVED', (state) => {
      this.animateMove(state);
    });
  }
}
```

**理由**:
- React hooksで状態管理
- ドメインロジックは純粋関数
- Phaserは描画のみ（イベントリスナー）
- 疎結合で各層が独立

**代替案**:
- Redux: この規模では過剰
- 直接呼び出し: テスト困難

## Risks / Trade-offs

### リスク: 過度な抽象化

- **リスク**: アーキテクチャが複雑になりすぎる
- **緩和策**: YAGNIの原則、必要になるまで抽象化しない
- **モニタリング**: コードレビューで複雑度を確認

### リスク: イミュータブルのパフォーマンス

- **リスク**: 大量のオブジェクト生成でメモリ使用量増加
- **緩和策**:
  - 構造共有（Structural Sharing）
  - 必要に応じてImmer.jsなどを検討
- **判断基準**: まずシンプルな実装、ベンチマークで問題が出たら最適化

### トレードオフ: 型安全性 vs 柔軟性

- **選択**: 型安全性を優先
- **トレードオフ**: 一部のダイナミックな操作が難しくなる
- **正当化**: ゲームルールは固定的で、型の恩恵が大きい

## Migration Plan

新規プロジェクトのため、マイグレーション不要。

### 段階的な実装計画

1. **Phase 1**: プロジェクト構成とドメインモデル
   - Monorepo構成（pnpm workspaces）
   - packages/domain: 共有ドメインロジック
   - packages/client: React + Phaser
   - packages/server: Node.js + WebSocket
   - TDDでゲームボード、プレイヤー、チケット実装

2. **Phase 2**: ゲームルールとバリデーション（ドメイン層）
   - TDDで移動ロジック、勝利条件実装
   - Jestでドメインロジックのテスト（100%カバレッジ目標）
   - クライアント・サーバーで同じコード使用

3. **Phase 3**: イベントソーシングと通信プロトコル
   - ゲームイベントの記録と再生機能
   - WebSocketメッセージ型定義（ClientMessage/ServerMessage）
   - イベント駆動の基盤構築

4. **Phase 4**: WebSocketサーバー実装
   - Node.js + ws セットアップ
   - ゲームルーム管理（GameRoomManager）
   - プレイヤー接続・切断処理
   - サーバー側ゲームルール検証

5. **Phase 5**: React基盤とWebSocketクライアント
   - Vite + Reactセットアップ
   - WebSocketクライアント実装（useWebSocket hook）
   - ルーム作成・参加UI
   - 基本的なコンポーネント（メニュー、情報パネル）

6. **Phase 6**: Phaser統合
   - GameSceneでボード描画（シンプルな図形）
   - React + Phaser連携の確立
   - プレイヤー駒の描画（視点に応じた表示制御）

7. **Phase 7**: インタラクションとゲームフロー
   - マウスクリックでノード選択
   - WebSocket経由で移動リクエスト送信
   - サーバーからの状態更新を受信してアニメーション
   - ゲームフロー完成

8. **Phase 8**: デプロイとテスト
   - クライアント: Vercelにデプロイ
   - サーバー: Railway/Renderにデプロイ
   - E2Eテスト（複数ブラウザで対戦）

### ロールバック

- 各Phaseはgitのタグでマーク
- 問題があれば前のPhaseに戻る
- Phase 1-3はネットワーク不要でテスト可能（unit tests）

## Open Questions

1. **Q**: ゲームボードのマップデータをどう管理するか？
   - **A**: AlexElvers/scotland-yard-dataリポジトリを活用
   - ノード座標（1-199）とコネクションデータをJSON形式で管理
   - packages/domainに配置してクライアント・サーバーで共有
   - データソース: https://github.com/AlexElvers/scotland-yard-data

2. **Q**: WebSocketとの統合方法は？
   - **A**: この変更で実装（Phase 4-5）
   - Node.js + ws ライブラリ
   - JSONベースのメッセージング
   - クライアント・サーバーで型定義を共有

3. **Q**: リプレイ機能の詳細は？
   - **A**: まずは基本的なイベント記録のみ、UIは後で

4. **Q**: マルチゲーム対応（複数の並行ゲーム）は？
   - **A**: GameState にゲームIDを追加することで対応可能、必要になったら実装

5. **Q**: Phaserのビジュアル改善はどう進める？
   - **A**: 段階的アプローチ

   **Phase 1（MVP - 現在の計画）**: プログラマティック描画
   - ノード: シンプルな円（色: 白、サイズ: 10px）
   - コネクション: 交通手段ごとの色分け線
     - Taxi: 黄色（#FFD700）
     - Bus: 緑色（#00FF00）
     - Underground: 赤色（#FF0000）
     - Ferry: 青色（#0000FF）
   - プレイヤー駒: 色付きの円
     - 刑事: 青色（#4169E1）
     - 怪盗X: 黒色（#000000）

   **Phase 2（将来）**: ビジュアル強化
   - 選択肢A: SVG背景マップ
     - ロンドン風の地図画像を背景に配置
     - Inkscape/Figmaで作成、またはフリー素材を活用
     - ノードとコネクションは引き続きPhaserで描画
   - 選択肢B: カスタムアセット
     - ノードアイコン: 駅のピクトグラム
     - プレイヤー駒: スプライト画像（帽子、虫眼鏡など）
     - コネクション: テクスチャ付き線
   - 選択肢C: Tiledマップ
     - Tiledエディタでマップ作成
     - タイルセットで背景を構築
     - Phaserのタイルマップ機能で読み込み

   **Phase 3（将来）**: アニメーション・エフェクト
   - 移動アニメーション: イージング、軌跡エフェクト
   - 位置公開エフェクト: フラッシュ、サークル拡大
   - パーティクルエフェクト: 逮捕時、逃走成功時
   - サウンドエフェクト: 移動音、アラート音

   **推奨ツール（従来型）**:
   - ベクター編集: Inkscape（無料）、Figma（無料プラン）
   - ピクセルアート: Aseprite、GIMP
   - タイルマップ: Tiled Map Editor（無料）
   - アセット素材: OpenGameArt.org、itch.io

   **AI生成ツール（2024年最新）**:

   **A. AI SVG生成（ベクターグラフィックス向け）**
   - **Recraft** (https://www.recraft.ai/)
     - 2024年最高評価のAI vectorジェネレーター
     - テキストプロンプトから高品質SVG生成
     - 無料プラン有り
   - **SVGMaker.io** (https://svgmaker.io/)
     - 自然言語でSVG生成・編集
     - デザインスキル不要
     - 無料利用可能
   - **OmniSVG** (https://aiforsvg.com/)
     - 復旦大学開発、テキスト/画像からSVG変換
     - プロフェッショナルな編集可能SVG
   - **SVGDreamer** (オープンソース)
     - GitHub: ximinng/SVGDreamer
     - CVPR 2024発表の最新手法
     - ローカルで実行可能

   **使用例（ゲームボード背景）**:
   ```
   プロンプト例:
   "Stylized London map in vintage board game style,
   simplified street network, warm color palette,
   top-down view, vector illustration,
   retro 1980s aesthetic, Thames river visible"
   ```

   **B. AI画像生成（ラスター画像向け）**
   - **Midjourney**
     - ゲームアセット生成に最適
     - アーティスティックな表現が得意
     - 有料（月額$10〜）
   - **DALL-E 3**
     - 精密な指示に強い
     - ChatGPT Plusで利用可能（月額$20）
   - **Stable Diffusion** (無料)
     - オープンソース
     - ローカル実行可能
     - ControlNet等の拡張機能で制御性向上

   **使用例（プレイヤー駒、UIアイコン）**:
   ```
   プロンプト例:
   "Detective character token for board game,
   top view, blue color scheme, magnifying glass,
   simple flat design, transparent background,
   high contrast, icon style"
   ```

   **C. AI活用ワークフロー（推奨）**

   **ステップ1**: AI画像生成
   - Midjourneyでロンドンマップのコンセプトアート生成
   - 複数バリエーション試行（~10分）

   **ステップ2**: SVG化
   - AI生成画像をSVGMaker.ioでベクター化
   - または、Recraftで直接SVG生成

   **ステップ3**: 調整・編集
   - Inkscape/Figmaで微調整
   - 不要な要素削除、色調整

   **ステップ4**: 最適化
   - SVGOMGで最適化（ファイルサイズ削減）

   **メリット**:
   ✅ デザイナー不要で高品質アセット作成
   ✅ 短時間で複数バリエーション試行
   ✅ SVGなのでスケーラブル
   ✅ コスト効率的（無料〜低コスト）

   **注意点**:
   ⚠️ AI生成物の著作権・ライセンス確認
   ⚠️ 商用利用可能なツールを選択
   ⚠️ 最終的な微調整は必要
   ⚠️ ブランドイメージとの整合性確認

   **D. 座標系に対応したマップ生成（重要）**

   **座標系の理解**:
   - AlexElvers/scotland-yard-dataの座標はピクセル座標
   - フォーマット: `ノード番号 X座標 Y座標 交通手段タイプ`
   - 例: `1 190 40 taxi,bus,underground`
   - 座標系は元のボードゲーム画像に基づく

   **方法1: OpenStreetMapベースのマップ生成**
   - **OSM-ScotlandYard** プロジェクト活用
     - GitHub: Jimmy-Wagner/OSM-ScotlandYard
     - OpenStreetMapデータからScotland Yardマップを自動生成
     - MapBox衛星画像と統合可能
     - 実際のロンドン地図を使用

   **ワークフロー（OSM使用）**:
   ```
   1. OpenStreetMapからロンドン中心部のデータ取得
   2. MapBoxでベース地図画像生成
   3. scotland-yard-dataの座標を地図上にマッピング
   4. SVGレイヤーとして出力
   ```

   **方法2: AI生成 + 座標マッピング**

   **ステップ1**: ベース地図をAI生成
   ```
   Recraftプロンプト:
   "Vintage London street map, simplified, warm sepia tones,
   top-down view, 1980s board game aesthetic,
   aspect ratio 16:9, vector illustration,
   Thames river and major landmarks visible"
   ```

   **ステップ2**: 座標系を正規化
   ```typescript
   // scotland-yard-dataの座標範囲を確認
   const bounds = {
     minX: ..., maxX: ...,
     minY: ..., maxY: ...
   };

   // Phaserキャンバス（1280x720）にマッピング
   function mapCoordinate(dataX: number, dataY: number) {
     const x = ((dataX - bounds.minX) / (bounds.maxX - bounds.minX)) * 1280;
     const y = ((dataY - bounds.minY) / (bounds.maxY - bounds.minY)) * 720;
     return { x, y };
   }
   ```

   **ステップ3**: AI生成マップをPhaser背景に配置
   ```typescript
   // GameScene.ts
   this.add.image(640, 360, 'london-map-background')
     .setOrigin(0.5, 0.5)
     .setAlpha(0.3); // 半透明でノードを見やすく

   // ノードを座標データに基づいて配置
   nodes.forEach(node => {
     const pos = mapCoordinate(node.x, node.y);
     this.add.circle(pos.x, pos.y, 8, 0xFFFFFF);
   });
   ```

   **方法3: プログラマティック生成 + スタイル指定**

   ```typescript
   // ロンドン風スタイルのプログラマティック背景
   class LondonMapBackground {
     generateBackground(scene: Phaser.Scene) {
       // テムズ川を描画
       const river = scene.add.graphics();
       river.lineStyle(20, 0x4A90A4, 0.6);
       river.beginPath();
       river.moveTo(0, 400);
       river.bezierCurveTo(400, 380, 800, 420, 1280, 400);
       river.strokePath();

       // グリッド（街路）を描画
       this.drawStreetGrid(scene);

       // ランドマーク（簡易版）
       this.drawLandmarks(scene);
     }
   }
   ```

   **推奨アプローチ**:

   **Phase 1（MVP）**: プログラマティック生成
   - シンプルな背景（グラデーション、グリッド）
   - scotland-yard-dataの座標をそのまま使用
   - 座標正規化関数を実装

   **Phase 2（改善）**: AI生成マップ + 座標マッピング
   - Recraftでロンドン風背景SVG生成
   - 座標系を調整してフィット
   - 半透明背景としてゲームボードに配置

   **Phase 3（本格版）**: OSM統合
   - OpenStreetMapの実際のロンドン地図使用
   - MapBox APIで高品質レンダリング
   - 完全にリアルな体験

   **座標データの取得と処理**:
   ```bash
   # AlexElvers/scotland-yard-dataをクローン
   git clone https://github.com/AlexElvers/scotland-yard-data.git

   # 座標範囲を計算するスクリプト作成
   # positions.txtから最小/最大座標を抽出
   ```

   **実装優先度**:
   - Phase 1（プログラマティック）→ ゲームロジック完成
   - → Phase 2（AI生成マップ統合）→ Phase 3（OSM統合・オプション）

6. **Q**: レスポンシブ対応は？
   - **A**: まずは固定サイズ（1280x720）、後でスケーリング対応

7. **Q**: デプロイ先はどこ？
   - **A**:
     - クライアント: Vercel（React + Phaser静的ホスティング）
     - サーバー: Railway（推奨）or Render（WebSocket対応）
     - 理由: 無料枠でWebSocket対応、簡単セットアップ
     - データベースは不要（メモリ内ゲームルーム管理）

8. **Q**: Monorepo構成の詳細は？
   - **A**: pnpm workspaces使用
   ```
   scotlandyard/
   ├── packages/
   │   ├── domain/      # 共有ドメインロジック
   │   ├── client/      # React + Phaser
   │   └── server/      # Node.js + WebSocket
   ├── pnpm-workspace.yaml
   └── package.json
   ```
   - 理由: コード共有が簡単、一貫した型定義
