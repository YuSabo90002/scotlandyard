import { useState } from 'react';

export interface RoomWaitingProps {
  roomId: string;
  players: Array<{ id: string; name: string }>;
  isHost: boolean;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function RoomWaiting({ roomId, players, isHost, onStartGame, onLeaveRoom }: RoomWaitingProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID:', err);
    }
  };

  // Safety check for players array
  const safePlayers = players || [];
  const canStartGame = safePlayers.length >= 3 && safePlayers.length <= 6;

  return (
    <div className="room-waiting">
      <div className="room-container">
        <h2>ルーム待機中</h2>

        <div className="room-id-section">
          <div className="room-id-label">ルームID</div>
          <div className="room-id-display">
            <span className="room-id">{roomId}</span>
            <button
              className="copy-button"
              onClick={handleCopyRoomId}
              title="ルームIDをコピー"
            >
              {copied ? '✓ コピー完了' : 'コピー'}
            </button>
          </div>
          <p className="room-id-help">
            このIDを友達に共有してルームに招待しましょう
          </p>
        </div>

        <div className="players-section">
          <h3>参加プレイヤー ({safePlayers.length}/6)</h3>
          <ul className="players-list">
            {safePlayers.map((player, index) => (
              <li key={player.id} className="player-item">
                <span className="player-number">{index + 1}</span>
                <span className="player-name">{player.name}</span>
                {index === 0 && <span className="host-badge">ホスト (Mr. X)</span>}
              </li>
            ))}
          </ul>

          {safePlayers.length < 3 && (
            <div className="info-message">
              ゲームを開始するには最低3人のプレイヤーが必要です
            </div>
          )}

          {safePlayers.length > 6 && (
            <div className="warning-message">
              プレイヤー数が上限(6人)を超えています
            </div>
          )}
        </div>

        <div className="game-info-section">
          <h3>ゲーム開始時の役割分担</h3>
          <div className="role-info">
            <div className="role-item">
              <strong>Mr. X:</strong> ホストプレイヤー (1人)
            </div>
            <div className="role-item">
              <strong>刑事:</strong> {Math.min(5, Math.max(2, safePlayers.length - 1))}人
              {safePlayers.length > 2 && (
                <span className="role-detail">
                  {' '}
                  ({safePlayers.length - 1}人のプレイヤーで分担)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="room-buttons">
          {isHost && (
            <button
              className="menu-button primary"
              onClick={onStartGame}
              disabled={!canStartGame}
            >
              ゲーム開始
            </button>
          )}

          {!isHost && (
            <div className="info-message">
              ホストがゲームを開始するのを待っています...
            </div>
          )}

          <button className="menu-button secondary" onClick={onLeaveRoom}>
            ルームを退出
          </button>
        </div>
      </div>
    </div>
  );
}
