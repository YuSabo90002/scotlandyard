import { PlayerId, NodeId, MoveTicketType, TicketType } from './types';
import { Winner } from './game-state';

/**
 * Base event interface
 */
interface BaseEvent {
  timestamp: number;
  turn: number;
}

/**
 * Game started event
 */
export interface GameStartedEvent extends BaseEvent {
  type: 'GAME_STARTED';
  mrXId: PlayerId;
  detectiveIds: PlayerId[];
  mrXStartPosition: NodeId;
  detectiveStartPositions: Record<PlayerId, NodeId>;
}

/**
 * Player moved event
 */
export interface PlayerMovedEvent extends BaseEvent {
  type: 'PLAYER_MOVED';
  playerId: PlayerId;
  from: NodeId;
  to: NodeId | null; // null for Mr. X in non-reveal turns
  ticket: MoveTicketType;
  isMrX: boolean;
  mrXMoveCount?: number; // Only for Mr. X
  shouldReveal: boolean; // Whether Mr. X position should be revealed
}

/**
 * Double move started event
 */
export interface DoubleMoveStartedEvent extends BaseEvent {
  type: 'DOUBLE_MOVE_STARTED';
  playerId: PlayerId;
}

/**
 * Double move first completed event
 */
export interface DoubleMoveFirstCompletedEvent extends BaseEvent {
  type: 'DOUBLE_MOVE_FIRST_COMPLETED';
  playerId: PlayerId;
  from: NodeId;
  to: NodeId | null; // null if not revealed
  ticket: MoveTicketType;
  mrXMoveCount: number;
  shouldReveal: boolean;
}

/**
 * Double move second completed event
 */
export interface DoubleMoveSecondCompletedEvent extends BaseEvent {
  type: 'DOUBLE_MOVE_SECOND_COMPLETED';
  playerId: PlayerId;
  from: NodeId;
  to: NodeId | null; // null if not revealed
  ticket: MoveTicketType;
  mrXMoveCount: number;
  shouldReveal: boolean;
}

/**
 * Turn changed event
 */
export interface TurnChangedEvent extends BaseEvent {
  type: 'TURN_CHANGED';
  currentPlayerId: PlayerId;
}

/**
 * Game ended event
 */
export interface GameEndedEvent extends BaseEvent {
  type: 'GAME_ENDED';
  winner: Winner;
  reason: 'CAPTURE' | 'MR_X_NO_MOVES' | 'TURN_LIMIT';
}

/**
 * Ticket used event
 */
export interface TicketUsedEvent extends BaseEvent {
  type: 'TICKET_USED';
  playerId: PlayerId;
  ticket: TicketType;
}

/**
 * Union type of all game events
 */
export type GameEvent =
  | GameStartedEvent
  | PlayerMovedEvent
  | DoubleMoveStartedEvent
  | DoubleMoveFirstCompletedEvent
  | DoubleMoveSecondCompletedEvent
  | TurnChangedEvent
  | GameEndedEvent
  | TicketUsedEvent;

/**
 * Event history container
 */
export class EventHistory {
  private events: GameEvent[] = [];

  addEvent(event: GameEvent): void {
    this.events.push(event);
  }

  getEvents(): readonly GameEvent[] {
    return this.events;
  }

  getEventsByType<T extends GameEvent['type']>(
    type: T
  ): readonly Extract<GameEvent, { type: T }>[] {
    return this.events.filter((e) => e.type === type) as Extract<
      GameEvent,
      { type: T }
    >[];
  }

  getEventsByPlayer(playerId: PlayerId): readonly GameEvent[] {
    return this.events.filter(
      (e) =>
        ('playerId' in e && e.playerId === playerId) ||
        ('mrXId' in e && e.mrXId === playerId) ||
        ('detectiveIds' in e && e.detectiveIds.includes(playerId))
    );
  }

  getEventsByTurn(turn: number): readonly GameEvent[] {
    return this.events.filter((e) => e.turn === turn);
  }

  clear(): void {
    this.events = [];
  }

  clone(): EventHistory {
    const newHistory = new EventHistory();
    newHistory.events = [...this.events];
    return newHistory;
  }
}
