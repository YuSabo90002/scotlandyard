import { WebSocketServer, WebSocket } from 'ws';
import { GameRoomManager } from './game-room-manager.js';
import type { ClientMessage, ServerMessage } from '@scotland-yard-online/domain';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const wss = new WebSocketServer({ port: PORT });
const roomManager = new GameRoomManager();

// プレイヤーID → WebSocket のマッピング
const playerConnections = new Map<string, WebSocket>();

console.log(`🎮 Scotland Yard WebSocket Server listening on port ${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  let currentPlayerId: string | null = null;
  let currentRoomId: string | null = null;

  console.log('New client connected');

  ws.on('message', (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      console.log('Received message:', message.type, message);

      switch (message.type) {
        case 'CREATE_ROOM': {
          const { playerName } = message;
          const { room, playerId } = roomManager.createRoom(playerName);

          currentPlayerId = playerId;
          currentRoomId = room.getId();
          playerConnections.set(playerId, ws);

          const response: ServerMessage = {
            type: 'ROOM_CREATED',
            roomId: room.getId(),
            playerId,
            playerName,
            isHost: true,
          };
          ws.send(JSON.stringify(response));

          console.log(`Room created: ${room.getId()} by ${playerName}`);
          break;
        }

        case 'JOIN_ROOM': {
          const { roomId, playerName } = message;
          const existingRoom = roomManager.getRoomById(roomId);

          if (!existingRoom) {
            const errorResponse: ServerMessage = {
              type: 'ERROR',
              code: 'ROOM_NOT_FOUND',
              message: 'ルームが見つかりません',
            };
            ws.send(JSON.stringify(errorResponse));
            break;
          }

          if (existingRoom.isFull()) {
            const errorResponse: ServerMessage = {
              type: 'ERROR',
              code: 'ROOM_FULL',
              message: 'ルームが満員です',
            };
            ws.send(JSON.stringify(errorResponse));
            break;
          }

          const { room, playerId } = roomManager.joinRoom(roomId, playerName);
          currentPlayerId = playerId;
          currentRoomId = roomId;
          playerConnections.set(playerId, ws);

          // 参加したプレイヤーに応答
          const joinResponse: ServerMessage = {
            type: 'ROOM_JOINED',
            roomId,
            playerId,
            playerName,
            isHost: room.getHostPlayerId() === playerId,
            players: room.getPlayers().map(p => ({
              id: p.id,
              name: p.name,
            })),
          };
          ws.send(JSON.stringify(joinResponse));

          // 既存のプレイヤーに通知
          const playerJoinedNotification: ServerMessage = {
            type: 'PLAYER_JOINED',
            playerId,
            playerName,
            players: room.getPlayers().map(p => ({
              id: p.id,
              name: p.name,
            })),
          };
          broadcastToRoom(roomId, playerJoinedNotification);

          console.log(`Player ${playerName} joined room ${roomId}`);
          break;
        }

        case 'LEAVE_ROOM': {
          if (!currentRoomId || !currentPlayerId) break;

          const room = roomManager.getRoomById(currentRoomId);
          if (!room) break;

          const playerName = room.getPlayers().find(p => p.id === currentPlayerId)?.name;
          room.removePlayer(currentPlayerId);
          playerConnections.delete(currentPlayerId);

          // 他のプレイヤーに通知
          const notification: ServerMessage = {
            type: 'PLAYER_LEFT',
            playerId: currentPlayerId,
            playerName: playerName || '',
            players: room.getPlayers().map(p => ({
              id: p.id,
              name: p.name,
            })),
          };
          broadcastToRoom(currentRoomId, notification);

          // ルームが空になったら削除
          if (room.getPlayers().length === 0) {
            roomManager.deleteRoom(currentRoomId);
            console.log(`Room ${currentRoomId} deleted (empty)`);
          }

          currentPlayerId = null;
          currentRoomId = null;
          console.log(`Player left room ${currentRoomId}`);
          break;
        }

        case 'START_GAME': {
          if (!currentRoomId || !currentPlayerId) break;

          const room = roomManager.getRoomById(currentRoomId);
          if (!room) break;

          if (room.getHostPlayerId() !== currentPlayerId) {
            const errorResponse: ServerMessage = {
              type: 'ERROR',
              code: 'NOT_HOST',
              message: 'ホストのみがゲームを開始できます',
            };
            ws.send(JSON.stringify(errorResponse));
            break;
          }

          if (room.getPlayers().length < 3) {
            const errorResponse: ServerMessage = {
              type: 'ERROR',
              code: 'NOT_ENOUGH_PLAYERS',
              message: '3人以上のプレイヤーが必要です',
            };
            ws.send(JSON.stringify(errorResponse));
            break;
          }

          room.startGame();

          // 全プレイヤーにゲーム開始を通知
          room.getPlayers().forEach(player => {
            const playerWs = playerConnections.get(player.id);
            if (!playerWs) return;

            const isMrX = player.id === room.getHostPlayerId();
            const gameState = room.getGameState();
            if (!gameState) return;

            const startMessage: ServerMessage = {
              type: 'GAME_STARTED',
              mrXId: gameState.mrX.id,
              detectiveIds: gameState.detectives.map(d => d.id),
              yourRole: isMrX ? 'MR_X' : 'DETECTIVE',
              yourDetectives: isMrX ? undefined : player.detectives,
              mrXStartPosition: isMrX ? gameState.mrX.position : undefined,
              detectiveStartPositions: gameState.detectives.reduce((acc, d) => {
                acc[d.id] = d.position;
                return acc;
              }, {} as Record<string, number>),
            };
            playerWs.send(JSON.stringify(startMessage));

            // Send initial game state update with player names and full state
            const fullGameState = room.getGameStateForPlayer(player.id);
            const updateMessage: ServerMessage = {
              type: 'GAME_STATE_UPDATE',
              gameState: fullGameState,
            };
            playerWs.send(JSON.stringify(updateMessage));
          });

          console.log(`Game started in room ${currentRoomId}`);
          break;
        }

        case 'MOVE': {
          if (!currentRoomId || !currentPlayerId) break;

          const room = roomManager.getRoomById(currentRoomId);
          if (!room) break;

          const { destination, ticket } = message;

          try {
            room.processMove(currentPlayerId, destination, ticket);

            // 全プレイヤーに更新された状態を送信
            room.getPlayers().forEach(player => {
              const playerWs = playerConnections.get(player.id);
              if (!playerWs) return;

              const gameState = room.getGameStateForPlayer(player.id);
              const updateMessage: ServerMessage = {
                type: 'GAME_STATE_UPDATE',
                gameState,
              };
              playerWs.send(JSON.stringify(updateMessage));
            });

            console.log(`Move processed: ${currentPlayerId} -> ${destination} via ${ticket}`);
          } catch (error) {
            const errorResponse: ServerMessage = {
              type: 'ERROR',
              code: 'INVALID_MOVE',
              message: error instanceof Error ? error.message : '移動に失敗しました',
            };
            ws.send(JSON.stringify(errorResponse));
          }
          break;
        }

        case 'START_DOUBLE_MOVE': {
          if (!currentRoomId || !currentPlayerId) break;

          const room = roomManager.getRoomById(currentRoomId);
          if (!room) break;

          try {
            room.startDoubleMove(currentPlayerId);

            // 全プレイヤーに通知
            room.getPlayers().forEach(player => {
              const playerWs = playerConnections.get(player.id);
              if (!playerWs) return;

              const gameState = room.getGameStateForPlayer(player.id);
              const updateMessage: ServerMessage = {
                type: 'DOUBLE_MOVE_STARTED',
                gameState,
              };
              playerWs.send(JSON.stringify(updateMessage));
            });

            console.log(`Double move started by ${currentPlayerId}`);
          } catch (error) {
            const errorResponse: ServerMessage = {
              type: 'ERROR',
              code: 'INVALID_MOVE',
              message: error instanceof Error ? error.message : 'ダブルムーブ開始に失敗しました',
            };
            ws.send(JSON.stringify(errorResponse));
          }
          break;
        }

        case 'DOUBLE_MOVE_FIRST': {
          if (!currentRoomId || !currentPlayerId) break;

          const room = roomManager.getRoomById(currentRoomId);
          if (!room) break;

          const { destination, ticket } = message;

          try {
            room.processDoubleMoveFirst(currentPlayerId, destination, ticket);

            // 全プレイヤーに通知
            room.getPlayers().forEach(player => {
              const playerWs = playerConnections.get(player.id);
              if (!playerWs) return;

              const gameState = room.getGameStateForPlayer(player.id);
              const updateMessage: ServerMessage = {
                type: 'DOUBLE_MOVE_FIRST_COMPLETED',
                gameState,
              };
              playerWs.send(JSON.stringify(updateMessage));
            });

            console.log(`Double move first: ${currentPlayerId} -> ${destination}`);
          } catch (error) {
            const errorResponse: ServerMessage = {
              type: 'ERROR',
              code: 'INVALID_MOVE',
              message: error instanceof Error ? error.message : 'ダブルムーブ（1回目）に失敗しました',
            };
            ws.send(JSON.stringify(errorResponse));
          }
          break;
        }

        case 'DOUBLE_MOVE_SECOND': {
          if (!currentRoomId || !currentPlayerId) break;

          const room = roomManager.getRoomById(currentRoomId);
          if (!room) break;

          const { destination, ticket } = message;

          try {
            room.processDoubleMoveSecond(currentPlayerId, destination, ticket);

            // 全プレイヤーに通知
            room.getPlayers().forEach(player => {
              const playerWs = playerConnections.get(player.id);
              if (!playerWs) return;

              const gameState = room.getGameStateForPlayer(player.id);
              const updateMessage: ServerMessage = {
                type: 'GAME_STATE_UPDATE',
                gameState,
              };
              playerWs.send(JSON.stringify(updateMessage));
            });

            console.log(`Double move completed: ${currentPlayerId} -> ${destination}`);
          } catch (error) {
            const errorResponse: ServerMessage = {
              type: 'ERROR',
              code: 'INVALID_MOVE',
              message: error instanceof Error ? error.message : 'ダブルムーブ（2回目）に失敗しました',
            };
            ws.send(JSON.stringify(errorResponse));
          }
          break;
        }

        default:
          console.log('Unknown message type:', (message as any).type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorResponse: ServerMessage = {
        type: 'ERROR',
        code: 'NOT_CONNECTED',
        message: 'メッセージの処理中にエラーが発生しました',
      };
      ws.send(JSON.stringify(errorResponse));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');

    // 切断時の処理
    if (currentPlayerId && currentRoomId) {
      const room = roomManager.getRoomById(currentRoomId);
      if (room) {
        const playerName = room.getPlayers().find(p => p.id === currentPlayerId)?.name;
        room.removePlayer(currentPlayerId);
        playerConnections.delete(currentPlayerId);

        // 他のプレイヤーに通知
        const notification: ServerMessage = {
          type: 'PLAYER_LEFT',
          playerId: currentPlayerId,
          playerName: playerName || '',
          players: room.getPlayers().map(p => ({
            id: p.id,
            name: p.name,
          })),
        };
        broadcastToRoom(currentRoomId, notification);

        // ルームが空になったら削除
        if (room.getPlayers().length === 0) {
          roomManager.deleteRoom(currentRoomId);
          console.log(`Room ${currentRoomId} deleted (empty)`);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcastToRoom(roomId: string, message: ServerMessage, excludePlayerId?: string) {
  const room = roomManager.getRoomById(roomId);
  if (!room) return;

  room.getPlayers().forEach(player => {
    if (excludePlayerId && player.id === excludePlayerId) return;

    const playerWs = playerConnections.get(player.id);
    if (playerWs && playerWs.readyState === WebSocket.OPEN) {
      playerWs.send(JSON.stringify(message));
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  wss.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  wss.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
