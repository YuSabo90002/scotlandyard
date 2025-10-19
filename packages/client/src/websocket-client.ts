import {
  ClientMessage,
  ServerMessage,
  NodeId,
  MoveTicketType,
} from '@scotland-yard-online/domain';

export type WebSocketClientEventMap = {
  open: Event;
  close: CloseEvent;
  error: Event;
  message: ServerMessage;
};

export type WebSocketClientEventListener<K extends keyof WebSocketClientEventMap> = (
  event: WebSocketClientEventMap[K]
) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<keyof WebSocketClientEventMap, Set<WebSocketClientEventListener<any>>> =
    new Map();
  private reconnectTimeout: number | null = null;
  private shouldReconnect: boolean = true;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Attempting to connect to WebSocket:', this.url);
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener('open', (event) => {
      console.log('WebSocket connected');
      this.emit('open', event);

      // Clear reconnect timeout
      if (this.reconnectTimeout !== null) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    });

    this.ws.addEventListener('close', (event) => {
      console.log('WebSocket closed');
      this.emit('close', event);

      // Attempt reconnection
      if (this.shouldReconnect) {
        this.reconnectTimeout = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          this.connect();
        }, 3000);
      }
    });

    this.ws.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
      console.error('WebSocket URL:', this.url);
      console.error('WebSocket readyState:', this.ws?.readyState);
      this.emit('error', event);
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        this.emit('message', message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  // Convenience methods for sending specific messages
  createRoom(playerName: string, isPrivate: boolean): void {
    this.send({
      type: 'CREATE_ROOM',
      playerName,
      isPrivate,
    });
  }

  joinRoom(roomId: string, playerName: string): void {
    this.send({
      type: 'JOIN_ROOM',
      roomId,
      playerName,
    });
  }

  startGame(): void {
    this.send({
      type: 'START_GAME',
    });
  }

  move(destination: NodeId, ticket: MoveTicketType): void {
    this.send({
      type: 'MOVE',
      destination,
      ticket,
    });
  }

  startDoubleMove(): void {
    this.send({
      type: 'START_DOUBLE_MOVE',
    });
  }

  doubleMoveFirst(destination: NodeId, ticket: MoveTicketType): void {
    this.send({
      type: 'DOUBLE_MOVE_FIRST',
      destination,
      ticket,
    });
  }

  doubleMoveSecond(destination: NodeId, ticket: MoveTicketType): void {
    this.send({
      type: 'DOUBLE_MOVE_SECOND',
      destination,
      ticket,
    });
  }

  leaveRoom(): void {
    this.send({
      type: 'LEAVE_ROOM',
    });
  }

  // Event listener management
  on<K extends keyof WebSocketClientEventMap>(
    event: K,
    listener: WebSocketClientEventListener<K>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<K extends keyof WebSocketClientEventMap>(
    event: K,
    listener: WebSocketClientEventListener<K>
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit<K extends keyof WebSocketClientEventMap>(
    event: K,
    data: WebSocketClientEventMap[K]
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
