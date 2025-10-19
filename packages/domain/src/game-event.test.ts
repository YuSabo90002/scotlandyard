import { EventHistory, GameEvent } from './game-event';

describe('EventHistory', () => {
  let history: EventHistory;

  beforeEach(() => {
    history = new EventHistory();
  });

  describe('addEvent and getEvents', () => {
    it('should add and retrieve events', () => {
      const event: GameEvent = {
        type: 'GAME_STARTED',
        timestamp: Date.now(),
        turn: 0,
        mrXId: 'mrx',
        detectiveIds: ['d1', 'd2'],
        mrXStartPosition: 1,
        detectiveStartPositions: { d1: 10, d2: 20 },
      };

      history.addEvent(event);

      const events = history.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    it('should maintain event order', () => {
      const event1: GameEvent = {
        type: 'PLAYER_MOVED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'mrx',
        from: 1,
        to: null,
        ticket: 'TAXI',
        isMrX: true,
        mrXMoveCount: 1,
        shouldReveal: false,
      };

      const event2: GameEvent = {
        type: 'TURN_CHANGED',
        timestamp: Date.now(),
        turn: 1,
        currentPlayerId: 'd1',
      };

      history.addEvent(event1);
      history.addEvent(event2);

      const events = history.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(event1);
      expect(events[1]).toEqual(event2);
    });
  });

  describe('getEventsByType', () => {
    it('should filter events by type', () => {
      const moveEvent: GameEvent = {
        type: 'PLAYER_MOVED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'mrx',
        from: 1,
        to: 8,
        ticket: 'TAXI',
        isMrX: true,
        mrXMoveCount: 1,
        shouldReveal: false,
      };

      const turnEvent: GameEvent = {
        type: 'TURN_CHANGED',
        timestamp: Date.now(),
        turn: 1,
        currentPlayerId: 'd1',
      };

      history.addEvent(moveEvent);
      history.addEvent(turnEvent);

      const moveEvents = history.getEventsByType('PLAYER_MOVED');
      expect(moveEvents).toHaveLength(1);
      expect(moveEvents[0]).toEqual(moveEvent);

      const turnEvents = history.getEventsByType('TURN_CHANGED');
      expect(turnEvents).toHaveLength(1);
      expect(turnEvents[0]).toEqual(turnEvent);
    });

    it('should return empty array for non-existent event type', () => {
      const events = history.getEventsByType('GAME_ENDED');
      expect(events).toHaveLength(0);
    });
  });

  describe('getEventsByPlayer', () => {
    it('should filter events by player ID', () => {
      const mrXEvent: GameEvent = {
        type: 'PLAYER_MOVED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'mrx',
        from: 1,
        to: null,
        ticket: 'TAXI',
        isMrX: true,
        mrXMoveCount: 1,
        shouldReveal: false,
      };

      const d1Event: GameEvent = {
        type: 'PLAYER_MOVED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'd1',
        from: 10,
        to: 11,
        ticket: 'TAXI',
        isMrX: false,
        shouldReveal: false,
      };

      history.addEvent(mrXEvent);
      history.addEvent(d1Event);

      const mrXEvents = history.getEventsByPlayer('mrx');
      expect(mrXEvents).toHaveLength(1);
      expect(mrXEvents[0]).toEqual(mrXEvent);

      const d1Events = history.getEventsByPlayer('d1');
      expect(d1Events).toHaveLength(1);
      expect(d1Events[0]).toEqual(d1Event);
    });

    it('should include GAME_STARTED event for all players', () => {
      const startEvent: GameEvent = {
        type: 'GAME_STARTED',
        timestamp: Date.now(),
        turn: 0,
        mrXId: 'mrx',
        detectiveIds: ['d1', 'd2'],
        mrXStartPosition: 1,
        detectiveStartPositions: { d1: 10, d2: 20 },
      };

      history.addEvent(startEvent);

      const mrXEvents = history.getEventsByPlayer('mrx');
      expect(mrXEvents).toHaveLength(1);
      expect(mrXEvents[0]).toEqual(startEvent);

      const d1Events = history.getEventsByPlayer('d1');
      expect(d1Events).toHaveLength(1);
      expect(d1Events[0]).toEqual(startEvent);
    });
  });

  describe('getEventsByTurn', () => {
    it('should filter events by turn number', () => {
      const turn1Event1: GameEvent = {
        type: 'PLAYER_MOVED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'mrx',
        from: 1,
        to: 8,
        ticket: 'TAXI',
        isMrX: true,
        mrXMoveCount: 1,
        shouldReveal: false,
      };

      const turn1Event2: GameEvent = {
        type: 'TURN_CHANGED',
        timestamp: Date.now(),
        turn: 1,
        currentPlayerId: 'd1',
      };

      const turn2Event: GameEvent = {
        type: 'PLAYER_MOVED',
        timestamp: Date.now(),
        turn: 2,
        playerId: 'd1',
        from: 10,
        to: 11,
        ticket: 'TAXI',
        isMrX: false,
        shouldReveal: false,
      };

      history.addEvent(turn1Event1);
      history.addEvent(turn1Event2);
      history.addEvent(turn2Event);

      const turn1Events = history.getEventsByTurn(1);
      expect(turn1Events).toHaveLength(2);
      expect(turn1Events[0]).toEqual(turn1Event1);
      expect(turn1Events[1]).toEqual(turn1Event2);

      const turn2Events = history.getEventsByTurn(2);
      expect(turn2Events).toHaveLength(1);
      expect(turn2Events[0]).toEqual(turn2Event);
    });
  });

  describe('clear', () => {
    it('should clear all events', () => {
      const event: GameEvent = {
        type: 'PLAYER_MOVED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'mrx',
        from: 1,
        to: 8,
        ticket: 'TAXI',
        isMrX: true,
        mrXMoveCount: 1,
        shouldReveal: false,
      };

      history.addEvent(event);
      expect(history.getEvents()).toHaveLength(1);

      history.clear();
      expect(history.getEvents()).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const event: GameEvent = {
        type: 'PLAYER_MOVED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'mrx',
        from: 1,
        to: 8,
        ticket: 'TAXI',
        isMrX: true,
        mrXMoveCount: 1,
        shouldReveal: false,
      };

      history.addEvent(event);

      const cloned = history.clone();
      expect(cloned.getEvents()).toHaveLength(1);
      expect(cloned.getEvents()[0]).toEqual(event);

      // Add to cloned should not affect original
      const newEvent: GameEvent = {
        type: 'TURN_CHANGED',
        timestamp: Date.now(),
        turn: 1,
        currentPlayerId: 'd1',
      };

      cloned.addEvent(newEvent);

      expect(cloned.getEvents()).toHaveLength(2);
      expect(history.getEvents()).toHaveLength(1);
    });
  });

  describe('Double move events', () => {
    it('should record double move events', () => {
      const startEvent: GameEvent = {
        type: 'DOUBLE_MOVE_STARTED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'mrx',
      };

      const firstEvent: GameEvent = {
        type: 'DOUBLE_MOVE_FIRST_COMPLETED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'mrx',
        from: 1,
        to: null,
        ticket: 'TAXI',
        mrXMoveCount: 1,
        shouldReveal: false,
      };

      const secondEvent: GameEvent = {
        type: 'DOUBLE_MOVE_SECOND_COMPLETED',
        timestamp: Date.now(),
        turn: 1,
        playerId: 'mrx',
        from: 8,
        to: null,
        ticket: 'BUS',
        mrXMoveCount: 2,
        shouldReveal: false,
      };

      history.addEvent(startEvent);
      history.addEvent(firstEvent);
      history.addEvent(secondEvent);

      const doubleMoveEvents = history.getEventsByPlayer('mrx');
      expect(doubleMoveEvents).toHaveLength(3);
      expect(doubleMoveEvents[0].type).toBe('DOUBLE_MOVE_STARTED');
      expect(doubleMoveEvents[1].type).toBe('DOUBLE_MOVE_FIRST_COMPLETED');
      expect(doubleMoveEvents[2].type).toBe('DOUBLE_MOVE_SECOND_COMPLETED');
    });
  });
});
