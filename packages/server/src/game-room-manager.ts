import { GameRoom } from './game-room';
import { PlayerId } from '@scotland-yard-online/domain';
import { generateUniqueRoomId } from './room-id';

export class GameRoomManager {
  private rooms: Map<string, GameRoom>;
  private playerToRoom: Map<PlayerId, string>; // Track which room each player is in

  constructor() {
    this.rooms = new Map();
    this.playerToRoom = new Map();
  }

  createRoom(hostName: string, isPrivate: boolean = false): { room: GameRoom; playerId: PlayerId } {
    // Generate unique room ID
    const existingIds = new Set(this.rooms.keys());
    const roomId = generateUniqueRoomId(existingIds);

    // Generate host player ID
    const hostPlayerId = 'p0' as PlayerId;

    // Create room
    const room = new GameRoom(roomId, hostPlayerId, hostName, isPrivate);
    this.rooms.set(roomId, room);
    this.playerToRoom.set(hostPlayerId, roomId);

    return { room, playerId: hostPlayerId };
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      // Remove all players from tracking
      room.getPlayers().forEach((player) => {
        this.playerToRoom.delete(player.id);
      });

      this.rooms.delete(roomId);
    }
  }

  getRoomById(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayerId(playerId: PlayerId): GameRoom | undefined {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) {
      return undefined;
    }
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, playerName: string): { room: GameRoom; playerId: PlayerId } {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Add player to room (returns new player ID)
    const playerId = room.addPlayer(playerName);
    this.playerToRoom.set(playerId, roomId);

    return { room, playerId };
  }

  leaveRoom(playerId: PlayerId): void {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) {
      return;
    }

    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(playerId);

      // If room is empty, delete it
      if (room.getPlayerCount() === 0) {
        this.rooms.delete(roomId);
      }
    }

    this.playerToRoom.delete(playerId);
  }

  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      // Remove all players from tracking
      room.getPlayers().forEach((player) => {
        this.playerToRoom.delete(player.id);
      });

      this.rooms.delete(roomId);
    }
  }

  getRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  getRoomCount(): number {
    return this.rooms.size;
  }
}
