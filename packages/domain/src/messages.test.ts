import {
  isClientMessage,
  isServerMessage,
  isCreateRoomMessage,
  isJoinRoomMessage,
  isMoveMessage,
  isStartDoubleMoveMessage,
  isDoubleMoveFirstMessage,
  isDoubleMoveSecondMessage,
  ErrorCodes,
  ClientMessage,
  ServerMessage,
} from './messages';

describe('Message Validation', () => {
  describe('isClientMessage', () => {
    it('should validate CREATE_ROOM message', () => {
      const msg = {
        type: 'CREATE_ROOM',
        playerName: 'Player 1',
        isPrivate: true,
      };

      expect(isClientMessage(msg)).toBe(true);
    });

    it('should validate JOIN_ROOM message', () => {
      const msg = {
        type: 'JOIN_ROOM',
        roomId: 'ABC123',
        playerName: 'Player 2',
      };

      expect(isClientMessage(msg)).toBe(true);
    });

    it('should validate START_GAME message', () => {
      const msg = {
        type: 'START_GAME',
      };

      expect(isClientMessage(msg)).toBe(true);
    });

    it('should validate MOVE message', () => {
      const msg = {
        type: 'MOVE',
        destination: 10,
        ticket: 'TAXI',
      };

      expect(isClientMessage(msg)).toBe(true);
    });

    it('should validate START_DOUBLE_MOVE message', () => {
      const msg = {
        type: 'START_DOUBLE_MOVE',
      };

      expect(isClientMessage(msg)).toBe(true);
    });

    it('should validate DOUBLE_MOVE_FIRST message', () => {
      const msg = {
        type: 'DOUBLE_MOVE_FIRST',
        destination: 10,
        ticket: 'TAXI',
      };

      expect(isClientMessage(msg)).toBe(true);
    });

    it('should validate DOUBLE_MOVE_SECOND message', () => {
      const msg = {
        type: 'DOUBLE_MOVE_SECOND',
        destination: 20,
        ticket: 'BUS',
      };

      expect(isClientMessage(msg)).toBe(true);
    });

    it('should validate LEAVE_ROOM message', () => {
      const msg = {
        type: 'LEAVE_ROOM',
      };

      expect(isClientMessage(msg)).toBe(true);
    });

    it('should reject invalid message type', () => {
      const msg = {
        type: 'INVALID_TYPE',
      };

      expect(isClientMessage(msg)).toBe(false);
    });

    it('should reject null', () => {
      expect(isClientMessage(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isClientMessage(undefined)).toBe(false);
    });

    it('should reject non-object', () => {
      expect(isClientMessage('string')).toBe(false);
      expect(isClientMessage(123)).toBe(false);
    });
  });

  describe('isServerMessage', () => {
    it('should validate ROOM_CREATED message', () => {
      const msg = {
        type: 'ROOM_CREATED',
        roomId: 'ABC123',
        playerId: 'p1',
        playerName: 'Player 1',
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should validate ROOM_JOINED message', () => {
      const msg = {
        type: 'ROOM_JOINED',
        roomId: 'ABC123',
        playerId: 'p2',
        playerName: 'Player 2',
        players: [
          { id: 'p1', name: 'Player 1' },
          { id: 'p2', name: 'Player 2' },
        ],
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should validate GAME_STARTED message', () => {
      const msg = {
        type: 'GAME_STARTED',
        mrXId: 'p1',
        detectiveIds: ['p2', 'p3'],
        yourRole: 'MR_X',
        mrXStartPosition: 1,
        detectiveStartPositions: { d1: 10, d2: 20 },
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should validate GAME_STATE_UPDATE message', () => {
      const msg = {
        type: 'GAME_STATE_UPDATE',
        currentTurn: 1,
        currentPlayerId: 'p1',
        mrXMoveCount: 1,
        detectivePositions: { d1: 11, d2: 20 },
        yourTickets: { TAXI: 3, BUS: 3 },
        events: [],
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should validate MOVE_ACCEPTED message', () => {
      const msg = {
        type: 'MOVE_ACCEPTED',
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should validate DOUBLE_MOVE_STARTED message', () => {
      const msg = {
        type: 'DOUBLE_MOVE_STARTED',
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should validate DOUBLE_MOVE_FIRST_ACCEPTED message', () => {
      const msg = {
        type: 'DOUBLE_MOVE_FIRST_ACCEPTED',
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should validate DOUBLE_MOVE_SECOND_ACCEPTED message', () => {
      const msg = {
        type: 'DOUBLE_MOVE_SECOND_ACCEPTED',
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should validate GAME_ENDED message', () => {
      const msg = {
        type: 'GAME_ENDED',
        winner: 'DETECTIVES',
        reason: 'CAPTURE',
        finalMrXPosition: 10,
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should validate ERROR message', () => {
      const msg = {
        type: 'ERROR',
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      };

      expect(isServerMessage(msg)).toBe(true);
    });

    it('should reject invalid message type', () => {
      const msg = {
        type: 'INVALID_TYPE',
      };

      expect(isServerMessage(msg)).toBe(false);
    });
  });

  describe('Type guards', () => {
    it('should identify CREATE_ROOM message', () => {
      const msg: ClientMessage = {
        type: 'CREATE_ROOM',
        playerName: 'Player 1',
        isPrivate: true,
      };

      expect(isCreateRoomMessage(msg)).toBe(true);

      if (isCreateRoomMessage(msg)) {
        expect(msg.playerName).toBe('Player 1');
        expect(msg.isPrivate).toBe(true);
      }
    });

    it('should identify JOIN_ROOM message', () => {
      const msg: ClientMessage = {
        type: 'JOIN_ROOM',
        roomId: 'ABC123',
        playerName: 'Player 2',
      };

      expect(isJoinRoomMessage(msg)).toBe(true);

      if (isJoinRoomMessage(msg)) {
        expect(msg.roomId).toBe('ABC123');
        expect(msg.playerName).toBe('Player 2');
      }
    });

    it('should identify MOVE message', () => {
      const msg: ClientMessage = {
        type: 'MOVE',
        destination: 10,
        ticket: 'TAXI',
      };

      expect(isMoveMessage(msg)).toBe(true);

      if (isMoveMessage(msg)) {
        expect(msg.destination).toBe(10);
        expect(msg.ticket).toBe('TAXI');
      }
    });

    it('should identify START_DOUBLE_MOVE message', () => {
      const msg: ClientMessage = {
        type: 'START_DOUBLE_MOVE',
      };

      expect(isStartDoubleMoveMessage(msg)).toBe(true);
    });

    it('should identify DOUBLE_MOVE_FIRST message', () => {
      const msg: ClientMessage = {
        type: 'DOUBLE_MOVE_FIRST',
        destination: 10,
        ticket: 'TAXI',
      };

      expect(isDoubleMoveFirstMessage(msg)).toBe(true);

      if (isDoubleMoveFirstMessage(msg)) {
        expect(msg.destination).toBe(10);
        expect(msg.ticket).toBe('TAXI');
      }
    });

    it('should identify DOUBLE_MOVE_SECOND message', () => {
      const msg: ClientMessage = {
        type: 'DOUBLE_MOVE_SECOND',
        destination: 20,
        ticket: 'BUS',
      };

      expect(isDoubleMoveSecondMessage(msg)).toBe(true);

      if (isDoubleMoveSecondMessage(msg)) {
        expect(msg.destination).toBe(20);
        expect(msg.ticket).toBe('BUS');
      }
    });
  });

  describe('Error codes', () => {
    it('should have all error codes defined', () => {
      expect(ErrorCodes.ROOM_NOT_FOUND).toBe('ROOM_NOT_FOUND');
      expect(ErrorCodes.ROOM_FULL).toBe('ROOM_FULL');
      expect(ErrorCodes.GAME_ALREADY_STARTED).toBe('GAME_ALREADY_STARTED');
      expect(ErrorCodes.NOT_YOUR_TURN).toBe('NOT_YOUR_TURN');
      expect(ErrorCodes.INVALID_MOVE).toBe('INVALID_MOVE');
      expect(ErrorCodes.NOT_IN_DOUBLE_MOVE).toBe('NOT_IN_DOUBLE_MOVE');
    });
  });

  describe('Message structure validation', () => {
    it('should validate complete CREATE_ROOM message structure', () => {
      const msg = {
        type: 'CREATE_ROOM',
        playerName: 'Player 1',
        isPrivate: true,
      };

      expect(isClientMessage(msg)).toBe(true);
      expect(isCreateRoomMessage(msg as ClientMessage)).toBe(true);

      if (isCreateRoomMessage(msg as ClientMessage)) {
        expect(typeof msg.playerName).toBe('string');
        expect(typeof msg.isPrivate).toBe('boolean');
      }
    });

    it('should validate complete MOVE message structure', () => {
      const msg = {
        type: 'MOVE',
        destination: 10,
        ticket: 'TAXI',
      };

      expect(isClientMessage(msg)).toBe(true);
      expect(isMoveMessage(msg as ClientMessage)).toBe(true);

      if (isMoveMessage(msg as ClientMessage)) {
        expect(typeof msg.destination).toBe('number');
        expect(typeof msg.ticket).toBe('string');
      }
    });

    it('should validate ERROR message structure', () => {
      const msg: ServerMessage = {
        type: 'ERROR',
        code: ErrorCodes.ROOM_NOT_FOUND,
        message: 'The specified room was not found',
      };

      expect(isServerMessage(msg)).toBe(true);
      expect(msg.type).toBe('ERROR');

      if (msg.type === 'ERROR') {
        expect(typeof msg.code).toBe('string');
        expect(typeof msg.message).toBe('string');
      }
    });
  });
});
