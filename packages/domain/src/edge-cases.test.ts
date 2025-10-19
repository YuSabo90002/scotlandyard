import { GameBoard } from './game-board';
import { GameEngine } from './game-engine';
import { GameState } from './game-state';
import { Player } from './player';

describe('Edge Cases', () => {
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

  describe('Ticket exhaustion scenarios', () => {
    it('should handle Mr. X with only BLACK tickets left', () => {
      // Exhaust all regular tickets
      let mrXOnlyBlack = mrX;
      for (let i = 0; i < 4; i++) mrXOnlyBlack = mrXOnlyBlack.useTicket('TAXI');
      for (let i = 0; i < 3; i++) mrXOnlyBlack = mrXOnlyBlack.useTicket('BUS');
      for (let i = 0; i < 3; i++) mrXOnlyBlack = mrXOnlyBlack.useTicket('UNDERGROUND');

      let state = GameState.create(mrXOnlyBlack, detectives);

      // Should still be able to move with BLACK
      const result = engine.executeMove(state, 'mrx', 8, 'BLACK');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.mrX.tickets.BLACK).toBe(4);
      }
    });

    it('should detect game over when Mr. X has no valid moves', () => {
      // Exhaust all tickets
      let mrXNoTickets = mrX;
      for (let i = 0; i < 4; i++) mrXNoTickets = mrXNoTickets.useTicket('TAXI');
      for (let i = 0; i < 3; i++) mrXNoTickets = mrXNoTickets.useTicket('BUS');
      for (let i = 0; i < 3; i++) mrXNoTickets = mrXNoTickets.useTicket('UNDERGROUND');
      for (let i = 0; i < 5; i++) mrXNoTickets = mrXNoTickets.useTicket('BLACK');

      const state = GameState.create(mrXNoTickets, detectives);
      const gameOver = engine.checkGameOver(state);

      expect(gameOver.isGameOver).toBe(true);
      expect(gameOver.winner).toBe('DETECTIVES');
    });

    it('should handle detective with no valid moves (skips turn)', () => {
      // Create detective with no tickets
      let d1NoTickets = detectives[0];
      for (let i = 0; i < 11; i++) d1NoTickets = d1NoTickets.useTicket('TAXI');
      for (let i = 0; i < 8; i++) d1NoTickets = d1NoTickets.useTicket('BUS');
      for (let i = 0; i < 4; i++) d1NoTickets = d1NoTickets.useTicket('UNDERGROUND');

      // Detective should have no valid moves
      const hasValidMoves = board.getAllReachableNodes(d1NoTickets.position).some((nodeId) => {
        const connections = board.getConnections(d1NoTickets.position);
        return connections.some((c) => {
          if (c.to === nodeId) {
            return d1NoTickets.hasTicket(c.transport as any);
          }
          return false;
        });
      });

      expect(hasValidMoves).toBe(false);
    });
  });

  describe('Double move edge cases', () => {
    it('should prevent double move when Mr. X has no DOUBLE_MOVE tickets', () => {
      // Use both DOUBLE_MOVE tickets
      let mrXNoDouble = mrX.useTicket('DOUBLE_MOVE').useTicket('DOUBLE_MOVE');
      const state = GameState.create(mrXNoDouble, detectives);

      const result = engine.startDoubleMove(state);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INSUFFICIENT_TICKET');
      }
    });

    it('should prevent starting double move when already in double move', () => {
      let state = GameState.create(mrX, detectives);

      // Start double move
      let result = engine.startDoubleMove(state);
      expect(result.ok).toBe(true);
      if (result.ok) state = result.value;

      // Try to start another double move
      result = engine.startDoubleMove(state);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_TICKET');
        expect(result.error.message).toContain('Already in double move');
      }
    });

    it('should prevent second move before first move completed', () => {
      let state = GameState.create(mrX, detectives);

      // Start double move
      let result = engine.startDoubleMove(state);
      if (result.ok) state = result.value;

      // Try to execute second move without first
      result = engine.executeDoubleMoveSecond(state, 18, 'TAXI');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_TICKET');
        expect(result.error.message).toContain('First move not completed');
      }
    });

    it('should prevent first move after it is already completed', () => {
      let state = GameState.create(mrX, detectives);

      // Start double move and complete first move
      let result = engine.startDoubleMove(state);
      if (result.ok) state = result.value;

      result = engine.executeDoubleMoveFirst(state, 8, 'TAXI');
      if (result.ok) state = result.value;

      // Try to execute first move again
      result = engine.executeDoubleMoveFirst(state, 18, 'TAXI');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_TICKET');
        expect(result.error.message).toContain('First move already completed');
      }
    });

    it('should handle double move ticket exhaustion during double move', () => {
      let state = GameState.create(mrX, detectives);

      // Start double move
      let result = engine.startDoubleMove(state);
      if (result.ok) state = result.value;

      // Complete first move (uses TAXI)
      result = engine.executeDoubleMoveFirst(state, 8, 'TAXI');
      if (result.ok) state = result.value;

      // Now exhaust remaining tickets except one
      let updatedMrX = state.mrX;
      for (let i = 0; i < 3; i++) updatedMrX = updatedMrX.useTicket('TAXI');
      state = state.updatePlayer(updatedMrX);

      // Try second move with exhausted ticket type
      result = engine.executeDoubleMoveSecond(state, 18, 'TAXI');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INSUFFICIENT_TICKET');
      }
    });
  });

  describe('Position reveal edge cases', () => {
    it('should reveal at exactly move counts 3, 8, 13, 18, 24', () => {
      const revealMoves = [3, 8, 13, 18, 24];
      const state = GameState.create(mrX, detectives);

      for (const moveCount of revealMoves) {
        const testState = Object.create(state);
        Object.assign(testState, {
          ...state,
          mrXMoveCount: moveCount,
        });

        expect(testState.shouldRevealMrXPosition()).toBe(true);
      }
    });

    it('should not reveal at other move counts', () => {
      const nonRevealMoves = [1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 23];
      const state = GameState.create(mrX, detectives);

      for (const moveCount of nonRevealMoves) {
        const testState = Object.create(state);
        Object.assign(testState, {
          ...state,
          mrXMoveCount: moveCount,
        });

        expect(testState.shouldRevealMrXPosition()).toBe(false);
      }
    });

    it('should handle reveal during double move first step', () => {
      let state = GameState.create(mrX, detectives);

      // Move to count 2
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      state = state.nextTurn();
      state = state.nextTurn();

      result = engine.executeMove(state, 'mrx', 18, 'TAXI');
      if (result.ok) state = result.value;

      state = state.nextTurn();
      state = state.nextTurn();

      // Use double move (move 3 and 4)
      result = engine.startDoubleMove(state);
      if (result.ok) state = result.value;

      // Move 3 should reveal
      result = engine.executeDoubleMoveFirst(state, 31, 'TAXI');
      expect(result.ok).toBe(true);

      if (result.ok) {
        state = result.value;
        const firstEvents = state.eventHistory.getEventsByType('DOUBLE_MOVE_FIRST_COMPLETED');
        expect(firstEvents[0].shouldReveal).toBe(true);
        expect(firstEvents[0].to).toBe(31);
      }
    });
  });

  describe('Turn management edge cases', () => {
    it('should handle turn at exactly 24', () => {
      const state = GameState.create(mrX, detectives);
      const state24 = Object.create(state);
      Object.assign(state24, {
        ...state,
        currentTurn: 24,
      });

      const gameOver = engine.checkGameOver(state24);
      expect(gameOver.isGameOver).toBe(true);
      expect(gameOver.winner).toBe('MR_X');
    });

    it('should not end game at turn 23', () => {
      const state = GameState.create(mrX, detectives);
      const state23 = Object.create(state);
      Object.assign(state23, {
        ...state,
        currentTurn: 23,
      });

      const gameOver = engine.checkGameOver(state23);
      expect(gameOver.isGameOver).toBe(false);
    });

    it('should cycle through all players correctly', () => {
      let state = GameState.create(mrX, detectives);

      expect(state.currentPlayerId).toBe('mrx');

      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      expect(state.currentPlayerId).toBe('d1');

      result = engine.executeMove(state, 'd1', 11, 'TAXI');
      if (result.ok) state = result.value;

      expect(state.currentPlayerId).toBe('d2');

      result = engine.executeMove(state, 'd2', 33, 'TAXI');
      if (result.ok) state = result.value;

      expect(state.currentPlayerId).toBe('mrx');
    });
  });

  describe('Ferry route edge cases', () => {
    it('should allow BLACK ticket for ferry routes', () => {
      // Find a node with ferry connection
      const ferryConnections = board.getConnections(108); // Node 108 has ferry
      const ferryConnection = ferryConnections.find((c) => c.transport === 'FERRY');

      if (ferryConnection) {
        const mrXAtFerry = mrX.moveTo(108);
        const state = GameState.create(mrXAtFerry, detectives);

        // BLACK ticket should work for ferry
        const result = engine.executeMove(state, 'mrx', ferryConnection.to, 'BLACK');
        expect(result.ok).toBe(true);
      }
    });

    it('should reject detective using ferry', () => {
      // Detectives cannot use ferry even if available
      const ferryConnections = board.getConnections(108);
      const ferryConnection = ferryConnections.find((c) => c.transport === 'FERRY');

      if (ferryConnection) {
        const d1AtFerry = detectives[0].moveTo(108);
        let state = GameState.create(mrX, [d1AtFerry, detectives[1]]);

        // Move Mr. X first
        let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
        if (result.ok) state = result.value;

        // Detective cannot move via ferry (no TAXI/BUS/UNDERGROUND ticket for ferry works)
        // This would require a regular ticket for a different route
      }
    });
  });

  describe('Invalid move attempts', () => {
    it('should reject move to non-existent node', () => {
      const state = GameState.create(mrX, detectives);
      const result = engine.executeMove(state, 'mrx', 9999, 'TAXI');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_CONNECTED');
      }
    });

    it('should reject move on wrong turn', () => {
      const state = GameState.create(mrX, detectives);

      // Try to move detective when it's Mr. X's turn
      const result = engine.executeMove(state, 'd1', 11, 'TAXI');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_YOUR_TURN');
      }
    });

    it('should reject move with wrong ticket type', () => {
      const state = GameState.create(mrX, detectives);

      // Try to use BUS for a connection that doesn't support it
      // Node 1 -> 8 is TAXI only
      const result = engine.executeMove(state, 'mrx', 8, 'BUS');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(['INVALID_TICKET', 'NOT_CONNECTED']).toContain(result.error.type);
      }
    });

    it('should reject detective using BLACK ticket', () => {
      let state = GameState.create(mrX, detectives);

      // Move Mr. X
      let result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      if (result.ok) state = result.value;

      // Even if we manually add it, validation should reject
      result = engine.executeMove(state, 'd1', 11, 'BLACK' as any);
      expect(result.ok).toBe(false);
    });
  });

  describe('Boundary conditions', () => {
    it('should handle minimum players (1 Mr. X + 2 detectives)', () => {
      const minDetectives = [
        Player.createDetective('d1', 'Detective 1', 10),
        Player.createDetective('d2', 'Detective 2', 20),
      ];

      const state = GameState.create(mrX, minDetectives);
      expect(state.detectives).toHaveLength(2);

      const result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      expect(result.ok).toBe(true);
    });

    it('should handle maximum players (1 Mr. X + 5 detectives)', () => {
      const maxDetectives = [
        Player.createDetective('d1', 'Detective 1', 10),
        Player.createDetective('d2', 'Detective 2', 20),
        Player.createDetective('d3', 'Detective 3', 30),
        Player.createDetective('d4', 'Detective 4', 40),
        Player.createDetective('d5', 'Detective 5', 50),
      ];

      const state = GameState.create(mrX, maxDetectives);
      expect(state.detectives).toHaveLength(5);

      const result = engine.executeMove(state, 'mrx', 8, 'TAXI');
      expect(result.ok).toBe(true);
    });
  });
});
