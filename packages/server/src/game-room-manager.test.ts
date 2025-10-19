import { GameRoomManager } from './game-room-manager';

describe('GameRoomManager', () => {
  let manager: GameRoomManager;

  beforeEach(() => {
    manager = new GameRoomManager();
  });

  describe('createRoom', () => {
    it('should create a new room', () => {
      const result = manager.createRoom('Player 1', false);

      expect(result.room).toBeDefined();
      expect(result.playerId).toBe('p0');
      expect(result.room.getId()).toBeDefined();
      expect(result.room.getPlayerCount()).toBe(1);
    });

    it('should generate unique room IDs', () => {
      const room1 = manager.createRoom('Player 1', false);
      const room2 = manager.createRoom('Player 2', false);

      expect(room1.room.getId()).not.toBe(room2.room.getId());
    });

    it('should add room to manager', () => {
      const result = manager.createRoom('Player 1', false);
      const roomId = result.room.getId();

      expect(manager.getRoomById(roomId)).toBe(result.room);
    });
  });

  describe('joinRoom', () => {
    it('should allow player to join existing room', () => {
      const { room } = manager.createRoom('Player 1', false);
      const roomId = room.getId();

      const result = manager.joinRoom(roomId, 'Player 2');

      expect(result.room).toBe(room);
      expect(result.playerId).toBeDefined();
      expect(room.getPlayerCount()).toBe(2);
    });

    it('should throw error when joining non-existent room', () => {
      expect(() => {
        manager.joinRoom('INVALID', 'Player 1');
      }).toThrow('Room not found');
    });
  });

  describe('leaveRoom', () => {
    it('should remove player from room', () => {
      const { room } = manager.createRoom('Player 1', false);
      const roomId = room.getId();
      const { playerId: player2Id } = manager.joinRoom(roomId, 'Player 2');

      expect(room.getPlayerCount()).toBe(2);

      manager.leaveRoom(player2Id);

      expect(room.getPlayerCount()).toBe(1);
    });

    it('should delete room when empty', () => {
      const { room, playerId } = manager.createRoom('Player 1', false);
      const roomId = room.getId();

      manager.leaveRoom(playerId);

      expect(manager.getRoomById(roomId)).toBeUndefined();
    });

    it('should do nothing when player not in any room', () => {
      expect(() => {
        manager.leaveRoom('p999' as any);
      }).not.toThrow();
    });
  });

  describe('getRoomById', () => {
    it('should return room by ID', () => {
      const { room } = manager.createRoom('Player 1', false);
      const roomId = room.getId();

      expect(manager.getRoomById(roomId)).toBe(room);
    });

    it('should return undefined for non-existent room', () => {
      expect(manager.getRoomById('INVALID')).toBeUndefined();
    });
  });

  describe('getRoomByPlayerId', () => {
    it('should return room by player ID', () => {
      const { room, playerId } = manager.createRoom('Player 1', false);

      expect(manager.getRoomByPlayerId(playerId)).toBe(room);
    });

    it('should return undefined for player not in room', () => {
      expect(manager.getRoomByPlayerId('p999' as any)).toBeUndefined();
    });
  });

  describe('deleteRoom', () => {
    it('should remove room from manager', () => {
      const { room } = manager.createRoom('Player 1', false);
      const roomId = room.getId();

      manager.deleteRoom(roomId);

      expect(manager.getRoomById(roomId)).toBeUndefined();
    });

    it('should remove player tracking', () => {
      const { room, playerId } = manager.createRoom('Player 1', false);
      const roomId = room.getId();

      manager.deleteRoom(roomId);

      expect(manager.getRoomByPlayerId(playerId)).toBeUndefined();
    });
  });

  describe('getRooms', () => {
    it('should return all rooms', () => {
      manager.createRoom('Player 1', false);
      manager.createRoom('Player 2', false);

      const rooms = manager.getRooms();

      expect(rooms).toHaveLength(2);
    });
  });

  describe('getRoomCount', () => {
    it('should return number of rooms', () => {
      expect(manager.getRoomCount()).toBe(0);

      manager.createRoom('Player 1', false);
      expect(manager.getRoomCount()).toBe(1);

      manager.createRoom('Player 2', false);
      expect(manager.getRoomCount()).toBe(2);
    });
  });
});
