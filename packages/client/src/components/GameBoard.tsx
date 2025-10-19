import { useEffect, useState, useRef, useCallback } from 'react';
import { usePhaser } from '../hooks/usePhaser';
import { phaserConfig } from '../phaser/config';
import { GameScene } from '../phaser/GameScene';
import { getReachableNodes, getAllReachableNodes, type TransportType } from '../utils/map-utils';

export interface GameBoardProps {
  gameState: any; // Will be properly typed later
  onMove: (destination: number, ticket: string) => void;
  onStartDoubleMove: () => void;
  onDoubleMoveFirst: (destination: number, ticket: string) => void;
  onDoubleMoveSecond: (destination: number, ticket: string) => void;
  onLeaveRoom: () => void;
}

export function GameBoard({
  gameState,
  onMove,
  onStartDoubleMove,
  onDoubleMoveFirst,
  onDoubleMoveSecond,
  onLeaveRoom,
}: GameBoardProps) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [reachableNodes, setReachableNodes] = useState<number[]>([]);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const game = usePhaser({ config: phaserConfig, containerRef: gameContainerRef });

  // Handle node click from Phaser
  const handleNodeClick = useCallback((nodeId: number) => {
    console.log('Node clicked from Phaser:', nodeId);

    // Only allow selecting reachable nodes
    if (reachableNodes.length > 0 && !reachableNodes.includes(nodeId)) {
      console.log('Node is not reachable');
      return;
    }

    setSelectedNode(nodeId);
  }, [reachableNodes]);

  // Set up Phaser event listeners
  useEffect(() => {
    if (!game) return;

    const scene = game.scene.getScene('GameScene') as GameScene;
    if (!scene) return;

    scene.events.on('nodeClicked', handleNodeClick);

    return () => {
      scene.events.off('nodeClicked', handleNodeClick);
    };
  }, [game, handleNodeClick]);

  // Update player pieces when game state changes
  useEffect(() => {
    if (!game || !gameState) return;

    const scene = game.scene.getScene('GameScene') as GameScene;
    if (!scene) return;

    // Clear existing pieces
    scene.clearAllPlayerPieces();

    // Draw Mr. X (if position is known)
    if (gameState.mrXPosition) {
      scene.drawPlayerPiece('mrx', gameState.mrXPosition, 0x000000, true);
    }

    // Draw detectives
    if (gameState.detectivePositions) {
      const detectiveColors = [0xFF0000, 0x0000FF, 0x00FF00, 0xFFFF00, 0xFF00FF];
      let colorIndex = 0;

      for (const [detectiveId, position] of Object.entries(gameState.detectivePositions)) {
        const color = detectiveColors[colorIndex % detectiveColors.length];
        scene.drawPlayerPiece(detectiveId, position as number, color, false);
        colorIndex++;
      }
    }
  }, [game, gameState]);

  // Calculate reachable nodes when ticket is selected
  useEffect(() => {
    if (!gameState || !selectedTicket) {
      setReachableNodes([]);
      return;
    }

    // Get current player's position
    let currentPosition: number | null = null;

    if (gameState.yourRole === 'MR_X' && gameState.mrXPosition) {
      currentPosition = gameState.mrXPosition;
    } else if (gameState.yourRole === 'DETECTIVE' && gameState.detectivePositions && gameState.yourDetectives) {
      // Use the first detective's position for simplicity
      const firstDetective = gameState.yourDetectives[0];
      if (firstDetective && gameState.detectivePositions[firstDetective]) {
        currentPosition = gameState.detectivePositions[firstDetective];
      }
    }

    if (currentPosition === null) {
      setReachableNodes([]);
      return;
    }

    // Calculate reachable nodes
    try {
      let reachable: number[];

      if (selectedTicket === 'BLACK') {
        reachable = getAllReachableNodes(currentPosition!);
      } else {
        reachable = getReachableNodes(currentPosition!, selectedTicket as TransportType);
      }

      setReachableNodes(reachable);
    } catch (error) {
      console.error('Failed to calculate reachable nodes:', error);
      setReachableNodes([]);
    }
  }, [gameState, selectedTicket]);

  // Highlight reachable nodes in Phaser
  useEffect(() => {
    if (!game) return;

    const scene = game.scene.getScene('GameScene') as GameScene;
    if (!scene) return;

    scene.highlightNodes(reachableNodes);
  }, [game, reachableNodes]);

  useEffect(() => {
    console.log('Game state updated:', gameState);
  }, [gameState]);

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  const currentPlayer = gameState.currentPlayerId;
  const mrX = gameState.mrX;
  const detectives = gameState.detectives || [];
  const isGameOver = gameState.isGameOver;
  const winner = gameState.winner;
  const doubleMoveState = gameState.doubleMoveState;

  const handleMove = () => {
    if (selectedNode !== null && selectedTicket !== null) {
      if (doubleMoveState?.isActive) {
        if (!doubleMoveState.firstMoveCompleted) {
          onDoubleMoveFirst(selectedNode, selectedTicket);
        } else {
          onDoubleMoveSecond(selectedNode, selectedTicket);
        }
      } else {
        onMove(selectedNode, selectedTicket);
      }

      // Reset selection
      setSelectedNode(null);
      setSelectedTicket(null);
    }
  };

  const handleTicketSelect = (ticket: string) => {
    setSelectedTicket(ticket);
    setSelectedNode(null); // Reset node selection when changing ticket
  };

  return (
    <div className="game-board">
      <div className="game-layout">
        {/* Left Panel - Game Info */}
        <aside className="game-sidebar left">
          <div className="game-info-panel">
            <h3>ゲーム情報</h3>

            <div className="turn-info">
              <div className="info-row">
                <span className="label">現在のターン:</span>
                <span className="value">{gameState.currentTurn || 1}</span>
              </div>
              <div className="info-row">
                <span className="label">Mr. Xの移動回数:</span>
                <span className="value">{gameState.mrXMoveCount || 0}</span>
              </div>
              <div className="info-row">
                <span className="label">次の位置公開:</span>
                <span className="value highlight">
                  {(() => {
                    const moveCount = gameState.mrXMoveCount || 0;
                    const revealMoves = [3, 8, 13, 18, 24];
                    const nextReveal = revealMoves.find(m => m > moveCount);
                    return nextReveal ? `${nextReveal}手目` : '公開なし';
                  })()}
                </span>
              </div>
              <div className="info-row">
                <span className="label">現在のプレイヤー:</span>
                <span className="value current-player">{currentPlayer || '待機中'}</span>
              </div>
            </div>

            {doubleMoveState?.isActive && (
              <div className="double-move-indicator">
                <strong>ダブルムーブ実行中</strong>
                {doubleMoveState.firstMoveCompleted ? (
                  <span>2手目を選択してください</span>
                ) : (
                  <span>1手目を選択してください</span>
                )}
              </div>
            )}

            {isGameOver && (
              <div className="game-over-panel">
                <h3>🎮 ゲーム終了</h3>
                <p className="winner">
                  {winner === 'MR_X' ? '🎩 Mr. X の勝利!' : '🔍 刑事チームの勝利!'}
                </p>
                {gameState.reason && (
                  <p className="win-reason">
                    {gameState.reason === 'CAPTURE' && '刑事がMr. Xを捕獲しました'}
                    {gameState.reason === 'MR_X_NO_MOVES' && 'Mr. Xが移動不可能になりました'}
                    {gameState.reason === 'TURN_LIMIT' && 'Mr. Xが24ターン逃げ切りました'}
                  </p>
                )}
                {gameState.finalMrXPosition && (
                  <p className="final-position">
                    最終位置: ノード {gameState.finalMrXPosition}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="player-info-panel">
            <h3>Mr. X</h3>
            <div className="player-card mrx">
              <div className="player-name">{mrX.name}</div>
              <div className="player-position">
                位置: {gameState.yourRole === 'MR_X' || gameState.shouldRevealMrXPosition ? mrX.position : '???'}
              </div>
              <div className="tickets">
                <div className="ticket-item">TAXI: {mrX.tickets.TAXI}</div>
                <div className="ticket-item">BUS: {mrX.tickets.BUS}</div>
                <div className="ticket-item">UNDERGROUND: {mrX.tickets.UNDERGROUND}</div>
                <div className="ticket-item">BLACK: {mrX.tickets.BLACK}</div>
                <div className="ticket-item">DOUBLE: {mrX.tickets.DOUBLE_MOVE}</div>
              </div>
            </div>
          </div>

          <div className="detectives-panel">
            <h3>刑事</h3>
            {detectives.map((detective: any) => (
              <div key={detective.id} className="player-card detective">
                <div className="player-name">{detective.name}</div>
                <div className="player-position">位置: {detective.position}</div>
                <div className="tickets">
                  <div className="ticket-item">TAXI: {detective.tickets.TAXI}</div>
                  <div className="ticket-item">BUS: {detective.tickets.BUS}</div>
                  <div className="ticket-item">UNDERGROUND: {detective.tickets.UNDERGROUND}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center - Map (Phaser Canvas) */}
        <main className="game-canvas">
          <div ref={gameContainerRef} className="phaser-container"></div>
        </main>

        {/* Right Panel - Controls */}
        <aside className="game-sidebar right">
          <div className="controls-panel">
            <h3>移動コントロール</h3>

            <div className="control-section">
              <label>目的地ノード:</label>
              <input
                type="number"
                value={selectedNode ?? ''}
                onChange={(e) => setSelectedNode(Number(e.target.value))}
                placeholder="ノード番号"
                min="1"
                max="199"
                disabled
                title="マップ上のノードをクリックして選択してください"
              />
              {selectedTicket && reachableNodes.length > 0 && (
                <div className="info-text">
                  {reachableNodes.length}個の移動可能なノードがハイライトされています
                </div>
              )}
            </div>

            <div className="control-section">
              <label>チケット:</label>
              <div className="ticket-buttons">
                <button
                  className={`ticket-button ${selectedTicket === 'TAXI' ? 'selected' : ''}`}
                  onClick={() => handleTicketSelect('TAXI')}
                >
                  TAXI {gameState.yourTickets?.TAXI ? `(${gameState.yourTickets.TAXI})` : ''}
                </button>
                <button
                  className={`ticket-button ${selectedTicket === 'BUS' ? 'selected' : ''}`}
                  onClick={() => handleTicketSelect('BUS')}
                >
                  BUS {gameState.yourTickets?.BUS ? `(${gameState.yourTickets.BUS})` : ''}
                </button>
                <button
                  className={`ticket-button ${selectedTicket === 'UNDERGROUND' ? 'selected' : ''}`}
                  onClick={() => handleTicketSelect('UNDERGROUND')}
                >
                  UNDERGROUND {gameState.yourTickets?.UNDERGROUND ? `(${gameState.yourTickets.UNDERGROUND})` : ''}
                </button>
                {gameState.yourRole === 'MR_X' && (
                  <button
                    className={`ticket-button ${selectedTicket === 'BLACK' ? 'selected' : ''}`}
                    onClick={() => handleTicketSelect('BLACK')}
                  >
                    BLACK {gameState.yourTickets?.BLACK ? `(${gameState.yourTickets.BLACK})` : ''}
                  </button>
                )}
              </div>
            </div>

            <div className="control-section">
              <button
                className="action-button primary"
                onClick={handleMove}
                disabled={selectedNode === null || selectedTicket === null || isGameOver}
              >
                移動を実行
              </button>
            </div>

            {gameState.yourRole === 'MR_X' && !doubleMoveState?.isActive && (
              <div className="control-section">
                <button
                  className="action-button special"
                  onClick={onStartDoubleMove}
                  disabled={isGameOver || mrX.tickets.DOUBLE_MOVE === 0}
                >
                  ダブルムーブ開始
                </button>
              </div>
            )}

            <div className="control-section">
              <button className="action-button secondary" onClick={onLeaveRoom}>
                ゲームを退出
              </button>
            </div>
          </div>

          <div className="event-log-panel">
            <h3>イベントログ</h3>
            <div className="event-log">
              {gameState.eventHistory?.getEvents().slice(-10).reverse().map((event: any, index: number) => (
                <div key={index} className="event-item">
                  <span className="event-type">{event.type}</span>
                  {event.playerId && <span className="event-player">({event.playerId})</span>}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
