import { GameEngine } from './game-engine';
import { GameBoard } from './game-board';
import { GameState } from './game-state';
import { Player } from './player';

describe('GameEngine', () => {
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

  describe('executeMove', () => {
    it('should execute valid detective move', () => {
      let state = GameState.create(mrX, detectives);
      state = state.nextTurn(); // Detective's turn

      // Detective 1 at node 10, move to connected node 11
      const result = engine.executeMove(state, 'd1', 11, 'TAXI');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = result.value;
        const movedDetective = newState.detectives.find(d => d.id === 'd1');
        expect(movedDetective?.position).toBe(11);
        expect(movedDetective?.tickets.TAXI).toBe(10); // 11 - 1
        expect(newState.currentPlayerId).toBe('d2'); // Next player's turn
      }
    });

    it('should execute valid Mr. X move and increment move count', () => {
      const state = GameState.create(mrX, detectives);

      // Mr. X at node 1, move to node 8
      const result = engine.executeMove(state, 'mrx', 8, 'TAXI');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = result.value;
        expect(newState.mrX.position).toBe(8);
        expect(newState.mrX.tickets.TAXI).toBe(3); // 4 - 1
        expect(newState.mrXMoveCount).toBe(1);
        expect(newState.currentPlayerId).toBe('d1'); // Next player's turn
      }
    });

    it('should return error for invalid move', () => {
      const state = GameState.create(mrX, detectives);

      // Try to move to unconnected node
      const result = engine.executeMove(state, 'mrx', 999, 'TAXI');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_CONNECTED');
      }
    });

    it('should use BLACK ticket for any transport', () => {
      const state = GameState.create(mrX, detectives);

      // Mr. X uses BLACK ticket for TAXI route
      const result = engine.executeMove(state, 'mrx', 8, 'BLACK');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const newState = result.value;
        expect(newState.mrX.position).toBe(8);
        expect(newState.mrX.tickets.BLACK).toBe(4); // 5 - 1
        expect(newState.mrX.tickets.TAXI).toBe(4); // Unchanged
      }
    });

    it('should detect detective capture of Mr. X', () => {
      let state = GameState.create(mrX, detectives);
      state = state.nextTurn(); // Detective's turn

      // Move Mr. X to node 10 where detective 1 is
      const mrXAtD1Position = mrX.moveTo(10);
      state = state.updatePlayer(mrXAtD1Position);

      // Actually, detectives capture by moving to Mr. X's position
      // Let's set up properly: Mr. X at node 8, detective moves to 8
      state = GameState.create(mrX, detectives);
      const mrXAt8 = mrX.moveTo(8);
      state = state.updatePlayer(mrXAt8);
      state = state.nextTurn(); // Detective's turn

      // Check if detective 1 can reach node 8
      const connections = board.getConnections(10);
      const canReach8 = connections.some(c => c.to === 8);

      if (canReach8) {
        const result = engine.executeMove(state, 'd1', 8, 'TAXI');

        expect(result.ok).toBe(true);
        if (result.ok) {
          const newState = result.value;
          expect(newState.isGameOver).toBe(true);
          expect(newState.winner).toBe('DETECTIVES');
        }
      }
    });

    it('should detect Mr. X has no valid moves', () => {
      // This is complex to set up, so we'll create a simplified scenario
      // Place Mr. X in a position where all adjacent nodes are occupied by detectives
      // and he has no tickets

      const mrXNoTickets = Player.createMrX('mrx', 'Mr. X', 1);
      let depleted = mrXNoTickets;

      // Use all tickets
      for (let i = 0; i < 4; i++) depleted = depleted.useTicket('TAXI');
      for (let i = 0; i < 3; i++) depleted = depleted.useTicket('BUS');
      for (let i = 0; i < 3; i++) depleted = depleted.useTicket('UNDERGROUND');
      for (let i = 0; i < 5; i++) depleted = depleted.useTicket('BLACK');

      const state = GameState.create(depleted, detectives);
      const gameOver = engine.checkGameOver(state);

      expect(gameOver.isGameOver).toBe(true);
      expect(gameOver.winner).toBe('DETECTIVES');
    });
  });

  describe('checkGameOver', () => {
    it('should return not game over for normal state', () => {
      const state = GameState.create(mrX, detectives);
      const result = engine.checkGameOver(state);

      expect(result.isGameOver).toBe(false);
      expect(result.winner).toBeUndefined();
    });

    it('should detect Mr. X victory when reaching turn 24', () => {
      // Create state at turn 24
      let state = GameState.create(mrX, detectives);

      // Advance to turn 24 by creating a new state with currentTurn = 24
      // We need to manually construct this since we can't easily simulate 24 turns
      const StateClass = state.constructor as typeof GameState;
      const turn24State = (StateClass as any).create(mrX, detectives);
      // Access private constructor through object manipulation
      const turn24 = Object.create(turn24State);
      Object.assign(turn24, {
        mrX: mrX,
        detectives: detectives,
        currentTurn: 24,
        currentPlayerId: mrX.id,
        mrXMoveCount: 24,
        isGameOver: false,
        winner: undefined,
        doubleMoveState: { isActive: false }
      });

      const result = engine.checkGameOver(turn24);

      expect(result.isGameOver).toBe(true);
      expect(result.winner).toBe('MR_X');
    });

    it('should not detect Mr. X victory before turn 24', () => {
      let state = GameState.create(mrX, detectives);

      // Create state at turn 23
      const turn23 = Object.create(state);
      Object.assign(turn23, {
        mrX: mrX,
        detectives: detectives,
        currentTurn: 23,
        currentPlayerId: mrX.id,
        mrXMoveCount: 23,
        isGameOver: false,
        winner: undefined,
        doubleMoveState: { isActive: false }
      });

      const result = engine.checkGameOver(turn23);

      expect(result.isGameOver).toBe(false);
      expect(result.winner).toBeUndefined();
    });

    it('should detect detective capture', () => {
      // Mr. X at same position as detective
      const mrXCaptured = mrX.moveTo(10); // Same as detective 1
      const state = GameState.create(mrXCaptured, detectives);
      const result = engine.checkGameOver(state);

      expect(result.isGameOver).toBe(true);
      expect(result.winner).toBe('DETECTIVES');
    });

    it('should detect Mr. X has no valid moves (surrounded)', () => {
      const state = GameState.create(mrX, detectives);

      // Get all reachable nodes from Mr. X position
      const reachableNodes = board.getAllReachableNodes(mrX.position);

      // Move detectives to block all escape routes (if possible)
      let blockedState = state;
      reachableNodes.slice(0, 2).forEach((nodeId, index) => {
        if (detectives[index]) {
          const movedDetective = detectives[index].moveTo(nodeId);
          blockedState = blockedState.updatePlayer(movedDetective);
        }
      });

      // Also make Mr. X have no tickets
      let mrXNoTickets = mrX;
      for (let i = 0; i < 4; i++) mrXNoTickets = mrXNoTickets.useTicket('TAXI');
      for (let i = 0; i < 3; i++) mrXNoTickets = mrXNoTickets.useTicket('BUS');
      for (let i = 0; i < 3; i++) mrXNoTickets = mrXNoTickets.useTicket('UNDERGROUND');
      for (let i = 0; i < 5; i++) mrXNoTickets = mrXNoTickets.useTicket('BLACK');

      blockedState = blockedState.updatePlayer(mrXNoTickets);

      const result = engine.checkGameOver(blockedState);

      expect(result.isGameOver).toBe(true);
      expect(result.winner).toBe('DETECTIVES');
    });
  });
});
