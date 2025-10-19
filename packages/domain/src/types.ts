// Node and Connection types
export type NodeId = number;

export type TransportType = 'TAXI' | 'BUS' | 'UNDERGROUND' | 'FERRY';
export type RegularTransportType = 'TAXI' | 'BUS' | 'UNDERGROUND';
export type TicketType = RegularTransportType | 'BLACK' | 'DOUBLE_MOVE';
export type MoveTicketType = RegularTransportType | 'BLACK';

export interface Node {
  readonly id: NodeId;
  readonly x: number;
  readonly y: number;
  readonly transports: readonly TransportType[];
}

export interface Connection {
  readonly from: NodeId;
  readonly to: NodeId;
  readonly transport: TransportType;
}

// Player types
export type PlayerId = string;
export type DetectiveId = string;

export interface Tickets {
  readonly TAXI: number;
  readonly BUS: number;
  readonly UNDERGROUND: number;
  readonly BLACK: number;
  readonly DOUBLE_MOVE: number;
}

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly position: NodeId;
  readonly tickets: Tickets;
  readonly isMrX: boolean;
}

// Result type for error handling
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type MoveError =
  | { type: 'NOT_CONNECTED'; message: string }
  | { type: 'INVALID_TICKET'; message: string }
  | { type: 'INSUFFICIENT_TICKET'; message: string }
  | { type: 'NOT_YOUR_TURN'; message: string }
  | { type: 'NODE_OCCUPIED'; message: string; occupiedBy: DetectiveId };
