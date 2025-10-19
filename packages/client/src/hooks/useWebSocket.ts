import { useEffect, useRef, useState, useCallback } from 'react';
import {
  WebSocketClient,
  WebSocketClientEventListener,
} from '../websocket-client';
import { ServerMessage, NodeId, MoveTicketType } from '@scotland-yard-online/domain';

export interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: ServerMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: ServerMessage | null;
  send: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
  createRoom: (playerName: string, isPrivate: boolean) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  startGame: () => void;
  move: (destination: NodeId, ticket: MoveTicketType) => void;
  startDoubleMove: () => void;
  doubleMoveFirst: (destination: NodeId, ticket: MoveTicketType) => void;
  doubleMoveSecond: (destination: NodeId, ticket: MoveTicketType) => void;
  leaveRoom: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    autoConnect = true,
  } = options;

  const clientRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);

  // Store callbacks in refs to avoid re-subscribing on every change
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  // Initialize WebSocket client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new WebSocketClient(url);
    }

    const client = clientRef.current;

    // Set up event listeners
    const handleOpen: WebSocketClientEventListener<'open'> = () => {
      setIsConnected(true);
      onOpenRef.current?.();
    };

    const handleClose: WebSocketClientEventListener<'close'> = () => {
      setIsConnected(false);
      onCloseRef.current?.();
    };

    const handleError: WebSocketClientEventListener<'error'> = (error) => {
      onErrorRef.current?.(error);
    };

    const handleMessage: WebSocketClientEventListener<'message'> = (message) => {
      setLastMessage(message);
      onMessageRef.current?.(message);
    };

    client.on('open', handleOpen);
    client.on('close', handleClose);
    client.on('error', handleError);
    client.on('message', handleMessage);

    // Auto-connect if enabled
    if (autoConnect) {
      client.connect();
    }

    // Cleanup - only disconnect when component unmounts
    return () => {
      client.off('open', handleOpen);
      client.off('close', handleClose);
      client.off('error', handleError);
      client.off('message', handleMessage);
      // Don't disconnect on every re-render, only on unmount
    };
  }, [url, autoConnect]);

  // Memoized action methods
  const connect = useCallback(() => {
    clientRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  const send = useCallback((message: any) => {
    clientRef.current?.send(message);
  }, []);

  const createRoom = useCallback((playerName: string, isPrivate: boolean) => {
    clientRef.current?.createRoom(playerName, isPrivate);
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    clientRef.current?.joinRoom(roomId, playerName);
  }, []);

  const startGame = useCallback(() => {
    clientRef.current?.startGame();
  }, []);

  const move = useCallback((destination: NodeId, ticket: MoveTicketType) => {
    clientRef.current?.move(destination, ticket);
  }, []);

  const startDoubleMove = useCallback(() => {
    clientRef.current?.startDoubleMove();
  }, []);

  const doubleMoveFirst = useCallback((destination: NodeId, ticket: MoveTicketType) => {
    clientRef.current?.doubleMoveFirst(destination, ticket);
  }, []);

  const doubleMoveSecond = useCallback((destination: NodeId, ticket: MoveTicketType) => {
    clientRef.current?.doubleMoveSecond(destination, ticket);
  }, []);

  const leaveRoom = useCallback(() => {
    clientRef.current?.leaveRoom();
  }, []);

  return {
    isConnected,
    lastMessage,
    send,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    startGame,
    move,
    startDoubleMove,
    doubleMoveFirst,
    doubleMoveSecond,
    leaveRoom,
  };
}
