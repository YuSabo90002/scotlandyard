import { GameRoom } from './game-room';

describe('GameRoom', () => {
  describe('constructor', () => {
    it('should create a room with host player', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);

      expect(room.getId()).toBe('ROOM123');
      expect(room.getHostPlayerId()).toBe('p0');
      expect(room.getPlayerCount()).toBe(1);
      expect(room.getPlayer('p0' as any)).toBeDefined();
      expect(room.getPlayer('p0' as any)?.name).toBe('Player 1');
    });

    it('should create public room when isPrivate is false', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', false);

      // No direct access to isPrivate, but we can verify room was created
      expect(room.getId()).toBe('ROOM123');
      expect(room.getPlayerCount()).toBe(1);
    });

    it('should create public room by default', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1');

      expect(room.getId()).toBe('ROOM123');
      expect(room.getPlayerCount()).toBe(1);
    });
  });

  describe('addPlayer', () => {
    it('should add new player to room', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);

      const playerId = room.addPlayer('Player 2');

      expect(room.getPlayerCount()).toBe(2);
      expect(room.getPlayer(playerId)).toBeDefined();
      expect(room.getPlayer(playerId)?.name).toBe('Player 2');
    });

    it('should return unique player IDs', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);

      const id1 = room.addPlayer('Player 2');
      const id2 = room.addPlayer('Player 3');

      expect(id1).not.toBe(id2);
      expect(room.getPlayerCount()).toBe(3);
    });

    it('should throw error when room is full (6 players)', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);

      // Add 5 more players (total 6)
      for (let i = 2; i <= 6; i++) {
        room.addPlayer(`Player ${i}`);
      }

      expect(room.getPlayerCount()).toBe(6);
      expect(() => {
        room.addPlayer('Player 7');
      }).toThrow('Room is full');
    });

    it('should throw error when game already started', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      room.addPlayer('Player 2');
      room.addPlayer('Player 3');

      room.startGame();

      expect(() => {
        room.addPlayer('Player 4');
      }).toThrow('Game already started');
    });
  });

  describe('removePlayer', () => {
    it('should remove player from room', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      const playerId = room.addPlayer('Player 2');

      expect(room.getPlayerCount()).toBe(2);

      room.removePlayer(playerId);

      expect(room.getPlayerCount()).toBe(1);
      expect(room.getPlayer(playerId)).toBeUndefined();
    });

    it('should do nothing when removing non-existent player', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);

      expect(() => {
        room.removePlayer('p999' as any);
      }).not.toThrow();

      expect(room.getPlayerCount()).toBe(1);
    });
  });

  describe('isHost', () => {
    it('should return true for host player', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);

      expect(room.isHost('p0' as any)).toBe(true);
    });

    it('should return false for non-host player', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      const playerId = room.addPlayer('Player 2');

      expect(room.isHost(playerId)).toBe(false);
    });
  });

  describe('canStartGame', () => {
    it('should return false with less than 3 players', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      room.addPlayer('Player 2');

      expect(room.canStartGame()).toBe(false);
    });

    it('should return true with 3 players', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      room.addPlayer('Player 2');
      room.addPlayer('Player 3');

      expect(room.canStartGame()).toBe(true);
    });

    it('should return true with 6 players', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);

      for (let i = 2; i <= 6; i++) {
        room.addPlayer(`Player ${i}`);
      }

      expect(room.canStartGame()).toBe(true);
    });

    it('should return false after game started', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      room.addPlayer('Player 2');
      room.addPlayer('Player 3');

      expect(room.canStartGame()).toBe(true);

      room.startGame();

      expect(room.canStartGame()).toBe(false);
    });
  });

  describe('startGame', () => {
    it('should start game with 3 players', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      room.addPlayer('Player 2');
      room.addPlayer('Player 3');

      room.startGame();

      expect(room.isGameStarted()).toBe(true);
      expect(room.getGameState()).not.toBeNull();
      expect(room.getGameEngine()).not.toBeNull();
    });

    it('should assign Mr. X to host player', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      room.addPlayer('Player 2');
      room.addPlayer('Player 3');

      room.startGame();

      const gameState = room.getGameState();
      expect(gameState?.mrX.id).toBe('p0');
    });

    it('should assign detectives to other players', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      const p2 = room.addPlayer('Player 2');
      const p3 = room.addPlayer('Player 3');

      room.startGame();

      const player2 = room.getPlayer(p2)!;
      const player3 = room.getPlayer(p3)!;

      expect(player2.detectives.length).toBeGreaterThan(0);
      expect(player3.detectives.length).toBeGreaterThan(0);
    });

    it('should throw error when less than 3 players', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      room.addPlayer('Player 2');

      expect(() => {
        room.startGame();
      }).toThrow('Cannot start game');
    });

    it('should throw error when game already started', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      room.addPlayer('Player 2');
      room.addPlayer('Player 3');

      room.startGame();

      expect(() => {
        room.startGame();
      }).toThrow('Cannot start game');
    });
  });

  describe('getPlayers', () => {
    it('should return all players', () => {
      const room = new GameRoom('ROOM123', 'p0' as any, 'Player 1', true);
      room.addPlayer('Player 2');
      room.addPlayer('Player 3');

      const players = room.getPlayers();

      expect(players).toHaveLength(3);
      expect(players[0].name).toBe('Player 1');
    });
  });
});
