import { GameBoard } from './game-board';
import { GameEngine } from './game-engine';
import { GameState } from './game-state';
import { Player } from './player';

describe('Integration Tests - Complete Game Flow', () => {
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
      Player.createDetective('d2', 'Detective 2', 20),
      Player.createDetective('d3', 'Detective 3', 30),
    ];
  });

  describe('Complete game from start to finish', () => {
    it('should handle full game sequence with multiple turns', () => {
      let state = GameState.create(mrX, detectives);

      // Verify initial state
      expect(state.currentTurn).toBe(0);
      expect(state.currentPlayerId).toBe('mrx');
      expect(state.mrXMoveCount).toBe(0);
      expect(state.isGameOver).toBe(false);

      // Turn 1: Mr. X moves
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.mrX.position).toBe(8);
        expect(state.mrXMoveCount).toBe(1);
        expect(state.currentPlayerId).toBe('d1');
      }

      // Turn 1: Detective 1 moves
      result = engine.executeMove(state, 'd1', 11, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.detectives[0].position).toBe(11);
        expect(state.currentPlayerId).toBe('d2');
      }

      // Turn 1: Detective 2 moves
      result = engine.executeMove(state, 'd2', 33, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.detectives[1].position).toBe(33);
        expect(state.currentPlayerId).toBe('d3');
      }

      // Turn 1: Detective 3 moves
      result = engine.executeMove(state, 'd3', 42, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.detectives[2].position).toBe(42);
        expect(state.currentPlayerId).toBe('mrx');
        expect(state.currentTurn).toBe(4); // After all players moved
      }

      // Turn 2: Mr. X moves again
      result = engine.executeMove(state, 'mrx', 18, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.mrX.position).toBe(18);
        expect(state.mrXMoveCount).toBe(2);
        expect(state.shouldRevealMrXPosition()).toBe(false);
      }

      // Verify event history
      const moveEvents = state.eventHistory.getEventsByType('PLAYER_MOVED');
      expect(moveEvents.length).toBeGreaterThanOrEqual(5);

      const turnEvents = state.eventHistory.getEventsByType('TURN_CHANGED');
      expect(turnEvents.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle game until Mr. X position reveal at move 3', () => {
      let state = GameState.create(mrX, detectives);

      // Execute moves until Mr. X has moved 3 times
      // Move 1
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      // Detectives move
      state = state.nextTurn();
      state = state.nextTurn();
      state = state.nextTurn();

      // Move 2
      result = engine.executeMove(state, 'mrx', 18, 'TAXI');
      if (result.ok) state = result.value;

      // Detectives move
      state = state.nextTurn();
      state = state.nextTurn();
      state = state.nextTurn();

      // Move 3 - should reveal
      result = engine.executeMove(state, 'mrx', 31, 'TAXI');
      expect(result.ok).toBe(true);

      if (result.ok) {
        state = result.value;
        expect(state.mrXMoveCount).toBe(3);
        expect(state.shouldRevealMrXPosition()).toBe(true);

        // Check event has revealed position
        const moveEvents = state.eventHistory.getEventsByType('PLAYER_MOVED');
        const move3Event = moveEvents.find((e) => e.mrXMoveCount === 3);
        expect(move3Event).toBeDefined();
        expect(move3Event?.shouldReveal).toBe(true);
        expect(move3Event?.to).toBe(31);
      }
    });

    it('should handle detective capture win condition', () => {
      let state = GameState.create(mrX, detectives);

      // Move Mr. X to node 11
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      result = engine.executeMove(state, 'd1', 11, 'TAXI');
      if (result.ok) state = result.value;

      state = state.nextTurn();
      state = state.nextTurn();

      // Move Mr. X to node 11 where detective is
      const mrXMovedTo11 = state.mrX.moveTo(11);
      state = state.updatePlayer(mrXMovedTo11);

      // Now detective tries to move to 11
      result = engine.executeMove(state, 'mrx', 11, 'TAXI');

      // Check if game ended due to capture
      const gameOver = engine.checkGameOver(state);
      expect(gameOver.isGameOver).toBe(true);
      expect(gameOver.winner).toBe('DETECTIVES');
    });

    it('should handle Mr. X escape win condition (turn limit)', () => {
      let state = GameState.create(mrX, detectives);

      // Simulate reaching turn 24
      const stateAt24 = Object.create(state);
      Object.assign(stateAt24, {
        mrX: mrX,
        detectives: detectives,
        currentTurn: 24,
        currentPlayerId: mrX.id,
        mrXMoveCount: 24,
        isGameOver: false,
        winner: undefined,
        doubleMoveState: { isActive: false },
        eventHistory: state.eventHistory,
      });

      const gameOver = engine.checkGameOver(stateAt24);
      expect(gameOver.isGameOver).toBe(true);
      expect(gameOver.winner).toBe('MR_X');

      // End game and check event
      const finalState = stateAt24.endGame('MR_X');
      const endEvents = finalState.eventHistory.getEventsByType('GAME_ENDED');
      expect(endEvents).toHaveLength(1);
      expect(endEvents[0].winner).toBe('MR_X');
      expect(endEvents[0].reason).toBe('TURN_LIMIT');
    });
  });

  describe('Double move integration', () => {
    it('should handle complete double move sequence', () => {
      let state = GameState.create(mrX, detectives);

      // Start double move
      let result = engine.startDoubleMove(state);
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.doubleMoveState.isActive).toBe(true);

        // Check event
        const startEvents = state.eventHistory.getEventsByType('DOUBLE_MOVE_STARTED');
        expect(startEvents).toHaveLength(1);
      }

      // First move
      result = engine.executeDoubleMoveFirst(state, 8, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.mrX.position).toBe(8);
        expect(state.mrXMoveCount).toBe(1);
        expect(state.doubleMoveState.isActive).toBe(true);
        if (state.doubleMoveState.isActive) {
          expect(state.doubleMoveState.firstMoveCompleted).toBe(true);
        }

        // Check event
        const firstEvents = state.eventHistory.getEventsByType('DOUBLE_MOVE_FIRST_COMPLETED');
        expect(firstEvents).toHaveLength(1);
      }

      // Second move
      result = engine.executeDoubleMoveSecond(state, 18, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.mrX.position).toBe(18);
        expect(state.mrXMoveCount).toBe(2);
        expect(state.doubleMoveState.isActive).toBe(false);
        expect(state.currentPlayerId).toBe('d1'); // Turn changed

        // Check event
        const secondEvents = state.eventHistory.getEventsByType('DOUBLE_MOVE_SECOND_COMPLETED');
        expect(secondEvents).toHaveLength(1);
      }

      // Check tickets consumed
      expect(state.mrX.tickets.DOUBLE_MOVE).toBe(1); // 2 - 1
      expect(state.mrX.tickets.TAXI).toBe(2); // 4 - 2
    });

    it('should handle double move with position reveal at move 3', () => {
      let state = GameState.create(mrX, detectives);

      // Move once normally
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      // Skip detectives
      state = state.nextTurn();
      state = state.nextTurn();
      state = state.nextTurn();

      // Now use double move (moves 2 and 3)
      result = engine.startDoubleMove(state);
      if (result.ok) state = result.value;

      // Move 2
      result = engine.executeDoubleMoveFirst(state, 18, 'TAXI');
      if (result.ok) state = result.value;

      expect(state.mrXMoveCount).toBe(2);

      // Move 3 - should reveal
      result = engine.executeDoubleMoveSecond(state, 31, 'TAXI');
      expect(result.ok).toBe(true);

      if (result.ok) {
        state = result.value;
        expect(state.mrXMoveCount).toBe(3);

        const secondEvents = state.eventHistory.getEventsByType('DOUBLE_MOVE_SECOND_COMPLETED');
        expect(secondEvents).toHaveLength(1);
        expect(secondEvents[0].shouldReveal).toBe(true);
        expect(secondEvents[0].to).toBe(31);
      }
    });

    it('should handle double move with BLACK tickets', () => {
      let state = GameState.create(mrX, detectives);

      // Start double move with BLACK tickets
      let result = engine.startDoubleMove(state);
      if (result.ok) state = result.value;

      // First move with BLACK
      result = engine.executeDoubleMoveFirst(state, 8, 'BLACK');
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.mrX.tickets.BLACK).toBe(4); // 5 - 1
        expect(state.mrX.tickets.TAXI).toBe(4); // Unchanged
      }

      // Second move with BLACK
      result = engine.executeDoubleMoveSecond(state, 18, 'BLACK');
      expect(result.ok).toBe(true);
      if (result.ok) {
        state = result.value;
        expect(state.mrX.tickets.BLACK).toBe(3); // 4 - 1
        expect(state.mrX.tickets.DOUBLE_MOVE).toBe(1);
      }
    });
  });

  describe('Ticket management integration', () => {
    it('should track ticket usage throughout game', () => {
      let state = GameState.create(mrX, detectives);

      // Initial tickets
      expect(state.mrX.tickets.TAXI).toBe(4);
      expect(state.mrX.tickets.BUS).toBe(3);
      expect(state.mrX.tickets.BLACK).toBe(5);

      // Use TAXI
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) {
        state = result.value;
        expect(state.mrX.tickets.TAXI).toBe(3);
      }

      state = state.nextTurn();
      state = state.nextTurn();
      state = state.nextTurn();

      // Use BUS
      result = engine.executeMove(state, 'mrx', 19, 'BUS');
      if (result.ok) {
        state = result.value;
        expect(state.mrX.tickets.BUS).toBe(2);
      }

      state = state.nextTurn();
      state = state.nextTurn();
      state = state.nextTurn();

      // Use BLACK
      result = engine.executeMove(state, 'mrx', 32, 'BLACK');
      if (result.ok) {
        state = result.value;
        expect(state.mrX.tickets.BLACK).toBe(4);
      }
    });

    it('should prevent moves when tickets exhausted', () => {
      let state = GameState.create(mrX, detectives);

      // Exhaust all TAXI tickets
      let mrXNoTaxi = mrX;
      for (let i = 0; i < 4; i++) {
        mrXNoTaxi = mrXNoTaxi.useTicket('TAXI');
      }
      state = state.updatePlayer(mrXNoTaxi);

      // Try to move with TAXI
      const result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INSUFFICIENT_TICKET');
      }
    });
  });

  describe('Detective position overlap prevention', () => {
    it('should prevent detective from moving to occupied position', () => {
      // Create detectives at positions that can both reach position 22
      const d1 = Player.createDetective('d1', 'Detective 1', 11);
      const d2 = Player.createDetective('d2', 'Detective 2', 23);
      let state = GameState.create(mrX, [d1, d2]);

      // Mr. X moves
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      // Detective 1 moves to position 22
      result = engine.executeMove(state, 'd1', 22, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) state = result.value;

      // Detective 2 tries to move to position 22 (occupied by d1)
      // Node 23 connects to 22 via TAXI
      result = engine.executeMove(state, 'd2', 22, 'TAXI');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NODE_OCCUPIED');
      }
    });
  });

  describe('Event history integration', () => {
    it('should maintain complete event history throughout game', () => {
      let state = GameState.create(mrX, detectives);

      // Should have GAME_STARTED
      expect(state.eventHistory.getEvents()).toHaveLength(1);
      expect(state.eventHistory.getEvents()[0].type).toBe('GAME_STARTED');

      // Execute several moves
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      result = engine.executeMove(state, 'd1', 11, 'TAXI');
      if (result.ok) state = result.value;

      result = engine.executeMove(state, 'd2', 33, 'TAXI');
      if (result.ok) state = result.value;

      // Check events accumulated
      const allEvents = state.eventHistory.getEvents();
      expect(allEvents.length).toBeGreaterThan(1);

      const moveEvents = state.eventHistory.getEventsByType('PLAYER_MOVED');
      expect(moveEvents).toHaveLength(3);

      const turnEvents = state.eventHistory.getEventsByType('TURN_CHANGED');
      expect(turnEvents).toHaveLength(3);
    });

    it('should filter events by player correctly', () => {
      let state = GameState.create(mrX, detectives);

      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      result = engine.executeMove(state, 'd1', 11, 'TAXI');
      if (result.ok) state = result.value;

      const mrXEvents = state.eventHistory.getEventsByPlayer('mrx');
      const d1Events = state.eventHistory.getEventsByPlayer('d1');

      // Mr. X should have GAME_STARTED and PLAYER_MOVED
      expect(mrXEvents.length).toBeGreaterThanOrEqual(2);

      // D1 should have GAME_STARTED and PLAYER_MOVED
      expect(d1Events.length).toBeGreaterThanOrEqual(2);
    });
  });
});
