import { GameEngine } from './game-engine';
import { GameBoard } from './game-board';
import { GameState } from './game-state';
import { Player } from './player';

describe('DoubleMove', () => {
  let board: GameBoard;
  let engine: GameEngine;
  let mrX: Player;
  let detectives: Player[];

  beforeEach(() => {
    board = GameBoard.createFromData();
    engine = new GameEngine(board);
    mrX = Player.createMrX('mrx', 'Mr. X', 1);
    detectives = [
      Player.createDetective('d1', 'Detective 1', 10),
    ];
  });

  describe('startDoubleMove', () => {
    it('should start double move and consume DOUBLE_MOVE ticket', () => {
      const state = GameState.create(mrX, detectives);

      const result = engine.startDoubleMove(state);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = result.value;
        expect(newState.mrX.tickets.DOUBLE_MOVE).toBe(1); // 2 - 1
        expect(newState.doubleMoveState.isActive).toBe(true);
        if (newState.doubleMoveState.isActive) {
          expect(newState.doubleMoveState.firstMoveCompleted).toBe(false);
        }
      }
    });

    it('should reject double move if Mr. X has no DOUBLE_MOVE tickets', () => {
      let mrXNoDouble = mrX;
      mrXNoDouble = mrXNoDouble.useTicket('DOUBLE_MOVE');
      mrXNoDouble = mrXNoDouble.useTicket('DOUBLE_MOVE');

      const state = GameState.create(mrXNoDouble, detectives);
      const result = engine.startDoubleMove(state);

      expect(result.ok).toBe(false);
    });

    it('should reject double move if not Mr. X turn', () => {
      const state = GameState.create(mrX, detectives).nextTurn(); // Detective's turn

      const result = engine.startDoubleMove(state);

      expect(result.ok).toBe(false);
    });

    it('should reject double move if already in double move', () => {
      const state = GameState.create(mrX, detectives);

      const result1 = engine.startDoubleMove(state);
      expect(result1.ok).toBe(true);

      if (result1.ok) {
        const result2 = engine.startDoubleMove(result1.value);
        expect(result2.ok).toBe(false);
      }
    });
  });

  describe('executeDoubleMoveFirst', () => {
    it('should execute first move of double move', () => {
      const state = GameState.create(mrX, detectives);
      const doubleMoveStarted = engine.startDoubleMove(state);

      expect(doubleMoveStarted.ok).toBe(true);
      if (doubleMoveStarted.ok) {
        // Mr. X at node 1, move to node 8
        const result = engine.executeDoubleMoveFirst(doubleMoveStarted.value, 8, 'TAXI');

        expect(result.ok).toBe(true);
        if (result.ok) {
          const newState = result.value;
          expect(newState.mrX.position).toBe(8);
          expect(newState.mrX.tickets.TAXI).toBe(3); // 4 - 1
          expect(newState.mrXMoveCount).toBe(1);
          expect(newState.doubleMoveState.isActive).toBe(true);
          if (newState.doubleMoveState.isActive) {
            expect(newState.doubleMoveState.firstMoveCompleted).toBe(true);
            expect(newState.doubleMoveState.intermediatePosition).toBe(8);
          }
          expect(newState.currentPlayerId).toBe('mrx'); // Still Mr. X's turn
        }
      }
    });

    it('should reveal position on move count 3 during first move', () => {
      let state = GameState.create(mrX, detectives);

      // Move Mr. X to move count 2
      state = state.incrementMrXMoveCount();
      state = state.incrementMrXMoveCount();

      const doubleMoveStarted = engine.startDoubleMove(state);
      expect(doubleMoveStarted.ok).toBe(true);

      if (doubleMoveStarted.ok) {
        const result = engine.executeDoubleMoveFirst(doubleMoveStarted.value, 8, 'TAXI');

        expect(result.ok).toBe(true);
        if (result.ok) {
          const newState = result.value;
          expect(newState.mrXMoveCount).toBe(3);
          expect(newState.shouldRevealMrXPosition()).toBe(true);
        }
      }
    });
  });

  describe('executeDoubleMoveSecond', () => {
    it('should execute second move and complete double move', () => {
      const state = GameState.create(mrX, detectives);

      const doubleMoveStarted = engine.startDoubleMove(state);
      expect(doubleMoveStarted.ok).toBe(true);

      if (doubleMoveStarted.ok) {
        const firstMove = engine.executeDoubleMoveFirst(doubleMoveStarted.value, 8, 'TAXI');
        expect(firstMove.ok).toBe(true);

        if (firstMove.ok) {
          // Now at node 8, move to connected node (e.g., node 18)
          const result = engine.executeDoubleMoveSecond(firstMove.value, 18, 'TAXI');

          expect(result.ok).toBe(true);
          if (result.ok) {
            const newState = result.value;
            expect(newState.mrX.position).toBe(18);
            expect(newState.mrX.tickets.TAXI).toBe(2); // 3 - 1
            expect(newState.mrXMoveCount).toBe(2);
            expect(newState.doubleMoveState.isActive).toBe(false);
            expect(newState.currentPlayerId).toBe('d1'); // Next player's turn
          }
        }
      }
    });

    it('should reject second move if first move not completed', () => {
      const state = GameState.create(mrX, detectives);

      const doubleMoveStarted = engine.startDoubleMove(state);
      expect(doubleMoveStarted.ok).toBe(true);

      if (doubleMoveStarted.ok) {
        // Try to execute second move without completing first
        const result = engine.executeDoubleMoveSecond(doubleMoveStarted.value, 8, 'TAXI');

        expect(result.ok).toBe(false);
      }
    });

    it('should validate second move from intermediate position', () => {
      const state = GameState.create(mrX, detectives);

      const doubleMoveStarted = engine.startDoubleMove(state);
      expect(doubleMoveStarted.ok).toBe(true);

      if (doubleMoveStarted.ok) {
        const firstMove = engine.executeDoubleMoveFirst(doubleMoveStarted.value, 8, 'TAXI');
        expect(firstMove.ok).toBe(true);

        if (firstMove.ok) {
          // Try to move to unconnected node from node 8
          const result = engine.executeDoubleMoveSecond(firstMove.value, 999, 'TAXI');

          expect(result.ok).toBe(false);
        }
      }
    });
  });

  describe('double move integration', () => {
    it('should complete full double move sequence', () => {
      let state = GameState.create(mrX, detectives);

      // Start double move
      const start = engine.startDoubleMove(state);
      expect(start.ok).toBe(true);
      if (!start.ok) return;

      state = start.value;
      expect(state.mrX.tickets.DOUBLE_MOVE).toBe(1);

      // First move: 1 -> 8
      const first = engine.executeDoubleMoveFirst(state, 8, 'TAXI');
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      state = first.value;
      expect(state.mrX.position).toBe(8);
      expect(state.mrXMoveCount).toBe(1);

      // Second move: 8 -> 18
      const second = engine.executeDoubleMoveSecond(state, 18, 'TAXI');
      expect(second.ok).toBe(true);
      if (!second.ok) return;

      state = second.value;
      expect(state.mrX.position).toBe(18);
      expect(state.mrXMoveCount).toBe(2);
      expect(state.doubleMoveState.isActive).toBe(false);
      expect(state.currentPlayerId).toBe('d1');
    });
  });
});
