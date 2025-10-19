import { useState } from 'react';

export interface MainMenuProps {
  onCreateRoom: (playerName: string, isPrivate: boolean) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
  isConnected: boolean;
}

export function MainMenu({ onCreateRoom, onJoinRoom, isConnected }: MainMenuProps) {
  const [mode, setMode] = useState<'NONE' | 'CREATE' | 'JOIN'>('NONE');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onCreateRoom(playerName.trim(), isPrivate);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && roomId.trim()) {
      onJoinRoom(roomId.trim().toUpperCase(), playerName.trim());
    }
  };

  if (mode === 'NONE') {
    return (
      <div className="main-menu">
        <div className="menu-container">
          <h2>スコットランドヤード オンライン</h2>
          <p className="menu-description">
            1人のMr. X vs 2-5人の刑事による追跡ゲーム
          </p>

          {!isConnected && (
            <div className="warning-message">
              サーバーに接続していません。接続を待っています...
            </div>
          )}

          <div className="menu-buttons">
            <button
              className="menu-button primary"
              onClick={() => setMode('CREATE')}
              disabled={!isConnected}
            >
              ルームを作成
            </button>
            <button
              className="menu-button secondary"
              onClick={() => setMode('JOIN')}
              disabled={!isConnected}
            >
              ルームに参加
            </button>
          </div>

          <div className="game-info">
            <h3>ゲーム情報</h3>
            <ul>
              <li>プレイヤー数: 3-6人</li>
              <li>Mr. X: 1人 (ホストプレイヤー)</li>
              <li>刑事: 2-5人 (残りのプレイヤーで分担)</li>
              <li>ゲーム時間: 約30-60分</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'CREATE') {
    return (
      <div className="main-menu">
        <div className="menu-container">
          <h2>ルームを作成</h2>

          <form onSubmit={handleCreateRoom} className="menu-form">
            <div className="form-group">
              <label htmlFor="playerName">プレイヤー名</label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="名前を入力"
                maxLength={20}
                required
              />
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                プライベートルーム (ルームIDを知っている人のみ参加可能)
              </label>
            </div>

            <div className="form-buttons">
              <button type="submit" className="menu-button primary">
                作成
              </button>
              <button
                type="button"
                className="menu-button secondary"
                onClick={() => setMode('NONE')}
              >
                戻る
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // mode === 'JOIN'
  return (
    <div className="main-menu">
      <div className="menu-container">
        <h2>ルームに参加</h2>

        <form onSubmit={handleJoinRoom} className="menu-form">
          <div className="form-group">
            <label htmlFor="roomId">ルームID</label>
            <input
              type="text"
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="例: ABC123"
              maxLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="playerNameJoin">プレイヤー名</label>
            <input
              type="text"
              id="playerNameJoin"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="名前を入力"
              maxLength={20}
              required
            />
          </div>

          <div className="form-buttons">
            <button type="submit" className="menu-button primary">
              参加
            </button>
            <button
              type="button"
              className="menu-button secondary"
              onClick={() => setMode('NONE')}
            >
              戻る
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
