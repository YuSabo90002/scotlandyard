import { PlayerId, NodeId, MoveTicketType, DetectiveId } from './types';
import { Winner } from './game-state';
import { GameEvent } from './game-event';

/**
 * Client to Server Messages
 */

export interface CreateRoomMessage {
  type: 'CREATE_ROOM';
  playerName: string;
  isPrivate: boolean;
}

export interface JoinRoomMessage {
  type: 'JOIN_ROOM';
  roomId: string;
  playerName: string;
}

export interface StartGameMessage {
  type: 'START_GAME';
}

export interface MoveMessage {
  type: 'MOVE';
  destination: NodeId;
  ticket: MoveTicketType;
}

export interface StartDoubleMoveMessage {
  type: 'START_DOUBLE_MOVE';
}

export interface DoubleMoveFirstMessage {
  type: 'DOUBLE_MOVE_FIRST';
  destination: NodeId;
  ticket: MoveTicketType;
}

export interface DoubleMoveSecondMessage {
  type: 'DOUBLE_MOVE_SECOND';
  destination: NodeId;
  ticket: MoveTicketType;
}

export interface LeaveRoomMessage {
  type: 'LEAVE_ROOM';
}

export type ClientMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | StartGameMessage
  | MoveMessage
  | StartDoubleMoveMessage
  | DoubleMoveFirstMessage
  | DoubleMoveSecondMessage
  | LeaveRoomMessage;

/**
 * Server to Client Messages
 */

export interface RoomCreatedMessage {
  type: 'ROOM_CREATED';
  roomId: string;
  playerId: PlayerId;
  playerName: string;
  isHost: boolean;
}

export interface RoomJoinedMessage {
  type: 'ROOM_JOINED';
  roomId: string;
  playerId: PlayerId;
  playerName: string;
  isHost: boolean;
  players: Array<{ id: PlayerId; name: string }>;
}

export interface PlayerJoinedMessage {
  type: 'PLAYER_JOINED';
  playerId: PlayerId;
  playerName: string;
  players: Array<{ id: PlayerId; name: string }>;
}

export interface PlayerLeftMessage {
  type: 'PLAYER_LEFT';
  playerId: PlayerId;
  playerName: string;
  players: Array<{ id: PlayerId; name: string }>;
}

export interface GameStartedMessage {
  type: 'GAME_STARTED';
  mrXId: PlayerId;
  detectiveIds: PlayerId[];
  yourRole: 'MR_X' | 'DETECTIVE';
  yourDetectives?: DetectiveId[]; // Which detectives you control
  mrXStartPosition?: NodeId; // Only sent to Mr. X
  detectiveStartPositions: Record<DetectiveId, NodeId>;
}

export interface GameStateUpdateMessage {
  type: 'GAME_STATE_UPDATE';
  currentTurn: number;
  currentPlayerId: PlayerId;
  mrXMoveCount: number;
  mrXPosition?: NodeId; // Only sent when revealed or to Mr. X
  detectivePositions: Record<DetectiveId, NodeId>;
  yourTickets: Record<string, number>; // Your ticket counts
  events: GameEvent[]; // Recent events
}

export interface MoveAcceptedMessage {
  type: 'MOVE_ACCEPTED';
}

export interface DoubleMoveStartedMessage {
  type: 'DOUBLE_MOVE_STARTED';
}

export interface DoubleMoveFirstAcceptedMessage {
  type: 'DOUBLE_MOVE_FIRST_ACCEPTED';
  intermediatePosition?: NodeId; // Only sent if revealed
}

export interface DoubleMoveSecondAcceptedMessage {
  type: 'DOUBLE_MOVE_SECOND_ACCEPTED';
}

export interface GameEndedMessage {
  type: 'GAME_ENDED';
  winner: Winner;
  reason: 'CAPTURE' | 'MR_X_NO_MOVES' | 'TURN_LIMIT';
  finalMrXPosition: NodeId;
}

export interface ErrorMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

export type ServerMessage =
  | RoomCreatedMessage
  | RoomJoinedMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStartedMessage
  | GameStateUpdateMessage
  | MoveAcceptedMessage
  | DoubleMoveStartedMessage
  | DoubleMoveFirstAcceptedMessage
  | DoubleMoveSecondAcceptedMessage
  | GameEndedMessage
  | ErrorMessage;

/**
 * Error codes
 */
export const ErrorCodes = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  GAME_NOT_STARTED: 'GAME_NOT_STARTED',
  NOT_HOST: 'NOT_HOST',
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  TOO_MANY_PLAYERS: 'TOO_MANY_PLAYERS',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_MOVE: 'INVALID_MOVE',
  INVALID_TICKET: 'INVALID_TICKET',
  NOT_CONNECTED: 'NOT_CONNECTED',
  INSUFFICIENT_TICKET: 'INSUFFICIENT_TICKET',
  NODE_OCCUPIED: 'NODE_OCCUPIED',
  NOT_IN_DOUBLE_MOVE: 'NOT_IN_DOUBLE_MOVE',
  ALREADY_IN_DOUBLE_MOVE: 'ALREADY_IN_DOUBLE_MOVE',
  FIRST_MOVE_NOT_COMPLETED: 'FIRST_MOVE_NOT_COMPLETED',
  FIRST_MOVE_ALREADY_COMPLETED: 'FIRST_MOVE_ALREADY_COMPLETED',
} as const;

/**
 * Message validation helpers
 */

export function isClientMessage(data: unknown): data is ClientMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const msg = data as { type?: string };

  return (
    msg.type === 'CREATE_ROOM' ||
    msg.type === 'JOIN_ROOM' ||
    msg.type === 'START_GAME' ||
    msg.type === 'MOVE' ||
    msg.type === 'START_DOUBLE_MOVE' ||
    msg.type === 'DOUBLE_MOVE_FIRST' ||
    msg.type === 'DOUBLE_MOVE_SECOND' ||
    msg.type === 'LEAVE_ROOM'
  );
}

export function isServerMessage(data: unknown): data is ServerMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const msg = data as { type?: string };

  return (
    msg.type === 'ROOM_CREATED' ||
    msg.type === 'ROOM_JOINED' ||
    msg.type === 'PLAYER_JOINED' ||
    msg.type === 'PLAYER_LEFT' ||
    msg.type === 'GAME_STARTED' ||
    msg.type === 'GAME_STATE_UPDATE' ||
    msg.type === 'MOVE_ACCEPTED' ||
    msg.type === 'DOUBLE_MOVE_STARTED' ||
    msg.type === 'DOUBLE_MOVE_FIRST_ACCEPTED' ||
    msg.type === 'DOUBLE_MOVE_SECOND_ACCEPTED' ||
    msg.type === 'GAME_ENDED' ||
    msg.type === 'ERROR'
  );
}

/**
 * Specific message type guards
 */

export function isCreateRoomMessage(msg: ClientMessage): msg is CreateRoomMessage {
  return msg.type === 'CREATE_ROOM';
}

export function isJoinRoomMessage(msg: ClientMessage): msg is JoinRoomMessage {
  return msg.type === 'JOIN_ROOM';
}

export function isStartGameMessage(msg: ClientMessage): msg is StartGameMessage {
  return msg.type === 'START_GAME';
}

export function isMoveMessage(msg: ClientMessage): msg is MoveMessage {
  return msg.type === 'MOVE';
}

export function isStartDoubleMoveMessage(msg: ClientMessage): msg is StartDoubleMoveMessage {
  return msg.type === 'START_DOUBLE_MOVE';
}

export function isDoubleMoveFirstMessage(msg: ClientMessage): msg is DoubleMoveFirstMessage {
  return msg.type === 'DOUBLE_MOVE_FIRST';
}

export function isDoubleMoveSecondMessage(msg: ClientMessage): msg is DoubleMoveSecondMessage {
  return msg.type === 'DOUBLE_MOVE_SECOND';
}

export function isLeaveRoomMessage(msg: ClientMessage): msg is LeaveRoomMessage {
  return msg.type === 'LEAVE_ROOM';
}
