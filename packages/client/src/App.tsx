import { useState, useCallback } from 'react';
import { ServerMessage } from '@scotland-yard-online/domain';
import { useWebSocket } from './hooks/useWebSocket';
import { MainMenu } from './components/MainMenu';
import { RoomWaiting } from './components/RoomWaiting';
import { GameBoard } from './components/GameBoard';
import { Toast, type ToastType } from './components/Toast';

type AppState = 'MENU' | 'WAITING' | 'PLAYING';

interface RoomInfo {
  roomId: string;
  playerName: string;
  players: Array<{ id: string; name: string }>;
  isHost: boolean;
}

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

let toastId = 0;

function App() {
  const [appState, setAppState] = useState<AppState>('MENU');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = toastId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleMessage = useCallback((message: ServerMessage) => {
    console.log('Received message:', message);

    switch (message.type) {
      case 'ROOM_CREATED':
        setRoomInfo({
          roomId: message.roomId,
          playerName: message.playerName,
          players: [{ id: message.playerId, name: message.playerName }],
          isHost: true,
        });
        setAppState('WAITING');
        showToast(`ルーム ${message.roomId} を作成しました`, 'success');
        break;

      case 'ROOM_JOINED':
        setRoomInfo({
          roomId: message.roomId,
          playerName: message.playerName,
          players: message.players,
          isHost: false,
        });
        setAppState('WAITING');
        showToast(`ルーム ${message.roomId} に参加しました`, 'success');
        break;

      case 'PLAYER_JOINED':
        if (roomInfo) {
          setRoomInfo({
            ...roomInfo,
            players: message.players,
          });
          showToast(`${message.playerName} が参加しました`, 'info');
        }
        break;

      case 'PLAYER_LEFT':
        if (roomInfo) {
          setRoomInfo({
            ...roomInfo,
            players: message.players,
          });
          showToast(`${message.playerName} が退出しました`, 'warning');
        }
        break;

      case 'GAME_STARTED':
        // Initialize game state from GAME_STARTED message
        setGameState({
          mrXId: message.mrXId,
          detectiveIds: message.detectiveIds,
          yourRole: message.yourRole,
          yourDetectives: message.yourDetectives,
          mrXStartPosition: message.mrXStartPosition,
          detectiveStartPositions: message.detectiveStartPositions,
          // Set current positions to start positions for GameBoard rendering
          mrXPosition: message.mrXStartPosition,
          detectivePositions: message.detectiveStartPositions,
        });
        // Don't transition to PLAYING yet - wait for GAME_STATE_UPDATE with full player info
        showToast('ゲームが開始されました！', 'success');
        break;

      case 'GAME_STATE_UPDATE':
        // Update game state with latest information
        setGameState((prev: any) => ({
          ...prev,
          ...message.gameState,
        }));
        // Transition to playing screen when we have full game state
        if (appState === 'WAITING') {
          setAppState('PLAYING');
        }
        break;

      case 'MOVE_ACCEPTED':
        // Game state will be updated via GAME_STATE_UPDATE
        break;

      case 'DOUBLE_MOVE_STARTED':
      case 'DOUBLE_MOVE_FIRST_ACCEPTED':
      case 'DOUBLE_MOVE_SECOND_ACCEPTED':
        // Game state updates handled separately
        break;

      case 'GAME_ENDED':
        // Update game state with final information
        setGameState((prev: any) => ({
          ...prev,
          isGameOver: true,
          winner: message.winner,
          reason: message.reason,
          finalMrXPosition: message.finalMrXPosition,
        }));
        const winnerText = message.winner === 'MR_X' ? 'Mr. X の勝利!' : '刑事チームの勝利!';
        showToast(`ゲーム終了: ${winnerText}`, 'success');
        break;

      case 'ERROR':
        showToast(message.message, 'error');
        console.error('Server error:', message.code, message.message);
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  }, [roomInfo, showToast]);

  const { isConnected, createRoom, joinRoom, startGame, move, startDoubleMove, doubleMoveFirst, doubleMoveSecond, leaveRoom } =
    useWebSocket({
      url: WS_URL,
      onMessage: handleMessage,
      onOpen: () => {
        console.log('WebSocket connected');
        showToast('サーバーに接続しました', 'success');
      },
      onClose: () => {
        console.log('WebSocket disconnected');
        showToast('サーバーとの接続が切断されました', 'warning');
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        showToast('接続エラーが発生しました', 'error');
      },
    });

  const handleCreateRoom = (playerName: string, isPrivate: boolean) => {
    createRoom(playerName, isPrivate);
  };

  const handleJoinRoom = (roomId: string, playerName: string) => {
    joinRoom(roomId, playerName);
  };

  const handleStartGame = () => {
    startGame();
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setRoomInfo(null);
    setGameState(null);
    setAppState('MENU');
    showToast('ルームを退出しました', 'info');
  };

  const handleMove = (destination: number, ticket: string) => {
    move(destination, ticket as any);
  };

  const handleStartDoubleMove = () => {
    startDoubleMove();
  };

  const handleDoubleMoveFirst = (destination: number, ticket: string) => {
    doubleMoveFirst(destination, ticket as any);
  };

  const handleDoubleMoveSecond = (destination: number, ticket: string) => {
    doubleMoveSecond(destination, ticket as any);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Scotland Yard Online</h1>
        <div className="connection-status">
          {isConnected ? (
            <span className="connected">接続中</span>
          ) : (
            <span className="disconnected">切断</span>
          )}
        </div>
      </header>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <main className="app-main">
        {appState === 'MENU' && (
          <MainMenu
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            isConnected={isConnected}
          />
        )}

        {appState === 'WAITING' && roomInfo && (
          <RoomWaiting
            roomId={roomInfo.roomId}
            players={roomInfo.players}
            isHost={roomInfo.isHost}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {appState === 'PLAYING' && gameState && (
          <GameBoard
            gameState={gameState}
            onMove={handleMove}
            onStartDoubleMove={handleStartDoubleMove}
            onDoubleMoveFirst={handleDoubleMoveFirst}
            onDoubleMoveSecond={handleDoubleMoveSecond}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>
    </div>
  );
}

export default App;
