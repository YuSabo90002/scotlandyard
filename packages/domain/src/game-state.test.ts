import { GameState } from './game-state';
import { Player } from './player';

describe('GameState', () => {
  describe('create', () => {
    it('should create initial game state with 1 Mr. X and 5 detectives', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
        Player.createDetective('d2', 'Detective 2', 20),
        Player.createDetective('d3', 'Detective 3', 30),
        Player.createDetective('d4', 'Detective 4', 40),
        Player.createDetective('d5', 'Detective 5', 50),
      ];

      const state = GameState.create(mrX, detectives);

      expect(state.mrX).toEqual(mrX);
      expect(state.detectives).toHaveLength(5);
      expect(state.currentTurn).toBe(0);
      expect(state.mrXMoveCount).toBe(0);
      expect(state.isGameOver).toBe(false);
      expect(state.winner).toBeUndefined();
    });

    it('should set Mr. X as the first player', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
      ];

      const state = GameState.create(mrX, detectives);

      expect(state.currentPlayerId).toBe('mrx');
    });
  });

  describe('getCurrentPlayer', () => {
    it('should return Mr. X on first turn', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
      ];

      const state = GameState.create(mrX, detectives);
      const current = state.getCurrentPlayer();

      expect(current?.id).toBe('mrx');
    });

    it('should return detective after Mr. X turn', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
      ];

      const state = GameState.create(mrX, detectives);
      const nextState = state.nextTurn();
      const current = nextState.getCurrentPlayer();

      expect(current?.id).toBe('d1');
    });
  });

  describe('getDetectiveAt', () => {
    it('should return detective at specified position', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
        Player.createDetective('d2', 'Detective 2', 20),
      ];

      const state = GameState.create(mrX, detectives);
      const detective = state.getDetectiveAt(10);

      expect(detective?.id).toBe('d1');
    });

    it('should return undefined if no detective at position', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
      ];

      const state = GameState.create(mrX, detectives);
      const detective = state.getDetectiveAt(999);

      expect(detective).toBeUndefined();
    });
  });

  describe('shouldRevealMrXPosition', () => {
    it('should return false for move counts that are not reveal turns', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
      ];

      const state = GameState.create(mrX, detectives);

      expect(state.shouldRevealMrXPosition()).toBe(false);
    });

    it('should return true for move count 3', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
      ];

      let state = GameState.create(mrX, detectives);

      // Simulate 3 Mr. X moves
      state = state.incrementMrXMoveCount();
      state = state.incrementMrXMoveCount();
      state = state.incrementMrXMoveCount();

      expect(state.mrXMoveCount).toBe(3);
      expect(state.shouldRevealMrXPosition()).toBe(true);
    });

    it('should return true for move counts 3, 8, 13, 18, 24', () => {
      const revealTurns = [3, 8, 13, 18, 24];

      revealTurns.forEach((turn) => {
        const mrX = Player.createMrX('mrx', 'Mr. X', 1);
        const detectives = [
          Player.createDetective('d1', 'Detective 1', 10),
        ];

        let state = GameState.create(mrX, detectives);

        for (let i = 0; i < turn; i++) {
          state = state.incrementMrXMoveCount();
        }

        expect(state.shouldRevealMrXPosition()).toBe(true);
      });
    });
  });

  describe('nextTurn', () => {
    it('should move to next player in rotation', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
        Player.createDetective('d2', 'Detective 2', 20),
      ];

      let state = GameState.create(mrX, detectives);

      expect(state.currentPlayerId).toBe('mrx');

      state = state.nextTurn();
      expect(state.currentPlayerId).toBe('d1');

      state = state.nextTurn();
      expect(state.currentPlayerId).toBe('d2');

      state = state.nextTurn();
      expect(state.currentPlayerId).toBe('mrx');
    });
  });

  describe('updatePlayer', () => {
    it('should update Mr. X', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
      ];

      const state = GameState.create(mrX, detectives);
      const movedMrX = mrX.moveTo(50);
      const updated = state.updatePlayer(movedMrX);

      expect(updated.mrX.position).toBe(50);
      expect(state.mrX.position).toBe(1); // Original is immutable
    });

    it('should update detective', () => {
      const mrX = Player.createMrX('mrx', 'Mr. X', 1);
      const detectives = [
        Player.createDetective('d1', 'Detective 1', 10),
        Player.createDetective('d2', 'Detective 2', 20),
      ];

      const state = GameState.create(mrX, detectives);
      const movedDetective = detectives[0].moveTo(15);
      const updated = state.updatePlayer(movedDetective);

      expect(updated.detectives[0].position).toBe(15);
      expect(state.detectives[0].position).toBe(10); // Original is immutable
    });
  });
});
