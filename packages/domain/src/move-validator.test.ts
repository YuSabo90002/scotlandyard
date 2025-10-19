import { MoveValidator } from './move-validator';
import { GameBoard } from './game-board';
import { GameState } from './game-state';
import { Player } from './player';

describe('MoveValidator', () => {
  let board: GameBoard;
  let mrX: Player;
  let detectives: Player[];

  beforeEach(() => {
    board = GameBoard.createFromData();
    mrX = Player.createMrX('mrx', 'Mr. X', 1);
    detectives = [
      Player.createDetective('d1', 'Detective 1', 10),
      Player.createDetective('d2', 'Detective 2', 20),
    ];
  });

  describe('validateMove', () => {
    it('should accept valid move with correct ticket', () => {
      const state = GameState.create(mrX, detectives);
      const validator = new MoveValidator(board);

      // Node 1 connects to Node 8 via TAXI
      const result = validator.validateMove(state, mrX.id, 8, 'TAXI');

      expect(result.ok).toBe(true);
    });

    it('should reject move to unconnected node', () => {
      const state = GameState.create(mrX, detectives);
      const validator = new MoveValidator(board);

      // Node 1 does not connect to Node 100
      const result = validator.validateMove(state, mrX.id, 100, 'TAXI');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_CONNECTED');
      }
    });

    it('should reject move with wrong transport type', () => {
      const state = GameState.create(mrX, detectives);
      const validator = new MoveValidator(board);

      // Node 1 connects to Node 8 via TAXI, not BUS
      const result = validator.validateMove(state, mrX.id, 8, 'BUS');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_CONNECTED');
      }
    });

    it('should reject move without required ticket', () => {
      const state = GameState.create(mrX, detectives);
      const validator = new MoveValidator(board);

      // Use all TAXI tickets
      let updatedMrX = mrX;
      for (let i = 0; i < 4; i++) {
        updatedMrX = updatedMrX.useTicket('TAXI');
      }
      const updatedState = state.updatePlayer(updatedMrX);

      const result = validator.validateMove(updatedState, mrX.id, 8, 'TAXI');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INSUFFICIENT_TICKET');
      }
    });

    it('should reject move when not player turn', () => {
      const state = GameState.create(mrX, detectives);
      const validator = new MoveValidator(board);

      // Try to move detective when it's Mr. X's turn
      const result = validator.validateMove(state, 'd1', 11, 'TAXI');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_YOUR_TURN');
      }
    });

    it('should reject detective move to occupied node', () => {
      // Detective 1 at node 10, Detective 2 at node 20
      // Try to move Detective 1 to node 21, which is connected to node 20
      const state = GameState.create(mrX, detectives).nextTurn(); // Now detective's turn
      const validator = new MoveValidator(board);

      // Check if node 10 connects to node 21
      const connections = board.getConnections(10);
      const canReach21 = connections.some(c => c.to === 21);

      if (canReach21) {
        // Move Detective 2 to node 21 first
        const movedD2 = detectives[1].moveTo(21);
        const stateWithD2At21 = state.updatePlayer(movedD2);

        // Now try to move Detective 1 to node 21
        const result = validator.validateMove(stateWithD2At21, 'd1', 21, 'TAXI');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('NODE_OCCUPIED');
        }
      }
    });

    it('should allow Mr. X to move to any connected node regardless of detective positions', () => {
      const state = GameState.create(mrX, detectives);
      const validator = new MoveValidator(board);

      // Move a detective to node 8
      const movedDetective = detectives[0].moveTo(8);
      const stateWithDetectiveAt8 = state.updatePlayer(movedDetective);

      // Mr. X should still be able to move to node 8 (this will capture)
      const result = validator.validateMove(stateWithDetectiveAt8, mrX.id, 8, 'TAXI');

      expect(result.ok).toBe(true);
    });

    it('should allow BLACK ticket for any transport type', () => {
      const state = GameState.create(mrX, detectives);
      const validator = new MoveValidator(board);

      // Node 1 connects to Node 46 via UNDERGROUND
      // Mr. X should be able to use BLACK ticket instead
      const result = validator.validateMove(state, mrX.id, 46, 'BLACK');

      expect(result.ok).toBe(true);
    });

    it('should allow BLACK ticket for FERRY routes', () => {
      const state = GameState.create(mrX, detectives);
      const validator = new MoveValidator(board);

      // Move Mr. X to a node with FERRY connection (node 108)
      const mrXAt108 = mrX.moveTo(108);
      const stateWithMrXAt108 = state.updatePlayer(mrXAt108);

      // Node 108 connects to Node 115 via FERRY
      const result = validator.validateMove(stateWithMrXAt108, mrX.id, 115, 'BLACK');

      expect(result.ok).toBe(true);
    });

    it('should reject detective using BLACK ticket', () => {
      const state = GameState.create(mrX, detectives).nextTurn(); // Detective's turn
      const validator = new MoveValidator(board);

      const result = validator.validateMove(state, 'd1', 11, 'BLACK');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INSUFFICIENT_TICKET');
      }
    });
  });
});
