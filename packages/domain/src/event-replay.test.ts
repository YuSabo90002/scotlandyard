import { GameBoard } from './game-board';
import { GameEngine } from './game-engine';
import { GameState } from './game-state';
import { Player } from './player';

describe('Event Replay', () => {
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
    ];
  });

  describe('Event recording during gameplay', () => {
    it('should record GAME_STARTED event on creation', () => {
      const state = GameState.create(mrX, detectives);

      const events = state.eventHistory.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('GAME_STARTED');

      const startEvent = events[0];
      if (startEvent.type === 'GAME_STARTED') {
        expect(startEvent.mrXId).toBe('mrx');
        expect(startEvent.detectiveIds).toEqual(['d1', 'd2']);
        expect(startEvent.mrXStartPosition).toBe(1);
        expect(startEvent.detectiveStartPositions).toEqual({
          d1: 10,
          d2: 20,
        });
      }
    });

    it('should record PLAYER_MOVED event after move', () => {
      let state = GameState.create(mrX, detectives);

      // Mr. X moves
      const result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      expect(result.ok).toBe(true);

      if (result.ok) {
        state = result.value;
        const moveEvents = state.eventHistory.getEventsByType('PLAYER_MOVED');
        expect(moveEvents).toHaveLength(1);

        const moveEvent = moveEvents[0];
        expect(moveEvent.playerId).toBe('mrx');
        expect(moveEvent.from).toBe(1);
        expect(moveEvent.to).toBeNull(); // Not revealed
        expect(moveEvent.ticket).toBe('TAXI');
        expect(moveEvent.isMrX).toBe(true);
        expect(moveEvent.mrXMoveCount).toBe(1);
        expect(moveEvent.shouldReveal).toBe(false);
      }
    });

    it('should record TURN_CHANGED event after move', () => {
      let state = GameState.create(mrX, detectives);

      const result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      expect(result.ok).toBe(true);

      if (result.ok) {
        state = result.value;
        const turnEvents = state.eventHistory.getEventsByType('TURN_CHANGED');
        expect(turnEvents).toHaveLength(1);

        const turnEvent = turnEvents[0];
        expect(turnEvent.currentPlayerId).toBe('d1');
      }
    });

    it('should record revealed position at move count 3', () => {
      let state = GameState.create(mrX, detectives);

      // Move 1: Node 1 -> 8 (TAXI)
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) state = result.value;

      // Detective moves
      state = state.nextTurn(); // Skip to d2
      state = state.nextTurn(); // Back to Mr. X

      // Move 2: Node 8 -> 18 (TAXI)
      result = engine.executeMove(state, 'mrx', 18, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) state = result.value;

      state = state.nextTurn();
      state = state.nextTurn();

      // Move 3: Node 18 -> 31 (TAXI) - should reveal
      result = engine.executeMove(state, 'mrx', 31, 'TAXI');
      expect(result.ok).toBe(true);

      if (result.ok) {
        state = result.value;
        const moveEvents = state.eventHistory.getEventsByType('PLAYER_MOVED');
        const move3Event = moveEvents[2];

        expect(move3Event.mrXMoveCount).toBe(3);
        expect(move3Event.shouldReveal).toBe(true);
        expect(move3Event.to).toBe(31); // Revealed position
      }
    });

    it('should record DOUBLE_MOVE events', () => {
      let state = GameState.create(mrX, detectives);

      // Start double move
      let result = engine.startDoubleMove(state);
      expect(result.ok).toBe(true);
      if (result.ok) state = result.value;

      const doubleMoveStartEvents = state.eventHistory.getEventsByType('DOUBLE_MOVE_STARTED');
      expect(doubleMoveStartEvents).toHaveLength(1);

      // Execute first move
      result = engine.executeDoubleMoveFirst(state, 8, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) state = result.value;

      const firstEvents = state.eventHistory.getEventsByType('DOUBLE_MOVE_FIRST_COMPLETED');
      expect(firstEvents).toHaveLength(1);
      expect(firstEvents[0].from).toBe(1);
      expect(firstEvents[0].to).toBeNull(); // Not revealed
      expect(firstEvents[0].ticket).toBe('TAXI');

      // Execute second move
      result = engine.executeDoubleMoveSecond(state, 18, 'TAXI');
      expect(result.ok).toBe(true);
      if (result.ok) state = result.value;

      const secondEvents = state.eventHistory.getEventsByType('DOUBLE_MOVE_SECOND_COMPLETED');
      expect(secondEvents).toHaveLength(1);
      expect(secondEvents[0].from).toBe(8);
      expect(secondEvents[0].to).toBeNull(); // Not revealed
      expect(secondEvents[0].ticket).toBe('TAXI');
    });

    it('should record GAME_ENDED event', () => {
      let state = GameState.create(mrX, detectives);

      // Move Mr. X to detective position for capture
      const mrXAt10 = mrX.moveTo(10);
      state = state.updatePlayer(mrXAt10);
      state = state.nextTurn();

      // Check game over
      const gameOverCheck = engine.checkGameOver(state);
      expect(gameOverCheck.isGameOver).toBe(true);

      // End game
      state = state.endGame(gameOverCheck.winner!);

      const endEvents = state.eventHistory.getEventsByType('GAME_ENDED');
      expect(endEvents).toHaveLength(1);

      const endEvent = endEvents[0];
      expect(endEvent.winner).toBe('DETECTIVES');
      expect(endEvent.reason).toBe('CAPTURE');
    });
  });

  describe('Event filtering', () => {
    it('should filter events by player', () => {
      let state = GameState.create(mrX, detectives);

      // Mr. X move
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      // Detective 1 move
      result = engine.executeMove(state, 'd1', 11, 'TAXI');
      if (result.ok) state = result.value;

      const mrXEvents = state.eventHistory.getEventsByPlayer('mrx');
      const d1Events = state.eventHistory.getEventsByPlayer('d1');

      // Mr. X should have GAME_STARTED, PLAYER_MOVED
      expect(mrXEvents.length).toBeGreaterThanOrEqual(2);

      // D1 should have GAME_STARTED, PLAYER_MOVED
      expect(d1Events.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter events by turn', () => {
      let state = GameState.create(mrX, detectives);

      const turn0Events = state.eventHistory.getEventsByTurn(0);
      expect(turn0Events).toHaveLength(1);
      expect(turn0Events[0].type).toBe('GAME_STARTED');

      // Execute a move
      const result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) {
        state = result.value;
        const turn1Events = state.eventHistory.getEventsByTurn(state.currentTurn);
        expect(turn1Events.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Complete game flow with events', () => {
    it('should record complete game sequence', () => {
      let state = GameState.create(mrX, detectives);
      expect(state.eventHistory.getEvents()).toHaveLength(1);

      // Mr. X move
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      // Detective 1 move
      result = engine.executeMove(state, 'd1', 11, 'TAXI');
      if (result.ok) state = result.value;

      // Detective 2 move
      result = engine.executeMove(state, 'd2', 33, 'TAXI');
      if (result.ok) state = result.value;

      // Should have: GAME_STARTED, PLAYER_MOVED x3, TURN_CHANGED x3
      const allEvents = state.eventHistory.getEvents();
      expect(allEvents.length).toBeGreaterThan(6);

      const moveEvents = state.eventHistory.getEventsByType('PLAYER_MOVED');
      expect(moveEvents).toHaveLength(3);

      const turnEvents = state.eventHistory.getEventsByType('TURN_CHANGED');
      expect(turnEvents).toHaveLength(3);
    });
  });
});
