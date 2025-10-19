import {
  GameState,
  GameEngine,
  GameBoard,
  Player,
  PlayerId,
  DetectiveId,
  NodeId,
  MoveTicketType,
} from '@scotland-yard-online/domain';

export interface RoomPlayer {
  id: PlayerId;
  name: string;
  detectives: DetectiveId[]; // Which detectives this player controls
}

export class GameRoom {
  private readonly id: string;
  private readonly hostPlayerId: PlayerId;
  private players: Map<PlayerId, RoomPlayer>;
  private gameState: GameState | null;
  private gameEngine: GameEngine | null;
  private gameBoard: GameBoard | null;
  private nextPlayerId: number = 1;

  constructor(id: string, hostPlayerId: PlayerId, hostName: string, _isPrivate: boolean = false) {
    this.id = id;
    this.hostPlayerId = hostPlayerId;
    this.players = new Map();
    this.gameState = null;
    this.gameEngine = null;
    this.gameBoard = null;

    // Add host as first player
    this.players.set(hostPlayerId, {
      id: hostPlayerId,
      name: hostName,
      detectives: [],
    });
  }

  getId(): string {
    return this.id;
  }

  getHostPlayerId(): PlayerId {
    return this.hostPlayerId;
  }

  isFull(): boolean {
    return this.players.size >= 6;
  }

  addPlayer(name: string): PlayerId {
    if (this.isFull()) {
      throw new Error('Room is full');
    }

    if (this.gameState !== null) {
      throw new Error('Game already started');
    }

    const playerId = `p${this.nextPlayerId++}` as PlayerId;
    this.players.set(playerId, {
      id: playerId,
      name,
      detectives: [],
    });

    return playerId;
  }

  removePlayer(playerId: PlayerId): void {
    this.players.delete(playerId);
  }

  getPlayer(playerId: PlayerId): RoomPlayer | undefined {
    return this.players.get(playerId);
  }

  getPlayers(): RoomPlayer[] {
    return Array.from(this.players.values());
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  isHost(playerId: PlayerId): boolean {
    return playerId === this.hostPlayerId;
  }

  canStartGame(): boolean {
    // Need 3-6 players
    return this.players.size >= 3 && this.players.size <= 6 && this.gameState === null;
  }

  startGame(): void {
    if (!this.canStartGame()) {
      throw new Error('Cannot start game');
    }

    // Initialize game board
    this.gameBoard = GameBoard.createFromData();
    this.gameEngine = new GameEngine(this.gameBoard);

    // Assign roles
    const playerIds = Array.from(this.players.keys());
    const mrXId = playerIds[0]; // First player is Mr. X
    const detectivePlayerIds = playerIds.slice(1); // Rest are detectives

    // Determine number of detectives (2-5)
    const numDetectivePlayers = detectivePlayerIds.length;
    const numDetectives = Math.min(5, Math.max(2, numDetectivePlayers + 1)); // At least 2 detectives

    // Create Mr. X player
    const mrX = Player.createMrX(mrXId, this.players.get(mrXId)!.name, 1);

    // Create detective players
    const detectives: Player[] = [];
    const detectiveIds: DetectiveId[] = [];

    for (let i = 0; i < numDetectives; i++) {
      const detectiveId = `d${i + 1}` as DetectiveId;
      detectiveIds.push(detectiveId);

      // Assign starting positions (different for each detective)
      const startPositions = [10, 20, 30, 40, 50];
      const startPosition = startPositions[i];

      detectives.push(Player.createDetective(detectiveId, `Detective ${i + 1}`, startPosition));
    }

    // Distribute detectives among players
    const detectivesPerPlayer = Math.ceil(numDetectives / numDetectivePlayers);
    detectivePlayerIds.forEach((playerId, index) => {
      const player = this.players.get(playerId)!;
      const startIndex = index * detectivesPerPlayer;
      const endIndex = Math.min(startIndex + detectivesPerPlayer, numDetectives);

      player.detectives = detectiveIds.slice(startIndex, endIndex);
    });

    // Create game state
    this.gameState = GameState.create(mrX, detectives);
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  getGameStateForPlayer(playerId: PlayerId): any {
    if (!this.gameState) {
      return null;
    }

    const player = this.players.get(playerId);
    if (!player) {
      return null;
    }

    // Determine if player is Mr. X or controls detectives
    const isMrX = playerId === this.hostPlayerId; // Host is always Mr. X
    const mrXPlayer = this.gameState.mrX;
    const shouldReveal = this.gameState.shouldRevealMrXPosition();

    return {
      currentTurn: this.gameState.currentTurn,
      currentPlayerId: this.gameState.currentPlayerId,
      mrXMoveCount: this.gameState.mrXMoveCount,
      shouldRevealMrXPosition: shouldReveal, // Include as boolean value instead of method
      // Include full player objects for client rendering
      mrX: {
        id: mrXPlayer.id,
        name: this.players.get(this.hostPlayerId)?.name || 'Mr. X',
        position: isMrX || shouldReveal ? mrXPlayer.position : null,
        tickets: mrXPlayer.tickets,
      },
      detectives: this.gameState.detectives.map(d => ({
        id: d.id,
        name: this.players.get(playerId)?.detectives.includes(d.id)
          ? this.players.get(playerId)?.name || `Detective ${d.id}`
          : `Detective ${d.id}`,
        position: d.position,
        tickets: d.tickets,
      })),
      // Legacy fields for compatibility
      mrXPosition: isMrX || shouldReveal ? mrXPlayer.position : null,
      detectivePositions: this.gameState.detectives.reduce((acc, d) => {
        acc[d.id] = d.position;
        return acc;
      }, {} as Record<DetectiveId, NodeId>),
      yourTickets: isMrX
        ? mrXPlayer.tickets
        : player.detectives.reduce((acc, dId) => {
            const detective = this.gameState!.detectives.find(d => d.id === dId);
            if (detective) {
              Object.assign(acc, detective.tickets);
            }
            return acc;
          }, {}),
      isGameOver: this.gameState.isGameOver,
      winner: this.gameState.winner,
      reason: undefined,
      finalMrXPosition: this.gameState.isGameOver ? mrXPlayer.position : null,
    };
  }

  getGameEngine(): GameEngine | null {
    return this.gameEngine;
  }

  isGameStarted(): boolean {
    return this.gameState !== null;
  }

  processMove(playerId: PlayerId, destination: NodeId, ticket: MoveTicketType): void {
    if (!this.gameState || !this.gameEngine) {
      throw new Error('Game not started');
    }

    const currentPlayer = this.gameState.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    const result = this.gameEngine.executeMove(this.gameState, playerId, destination, ticket);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    this.gameState = result.value;
  }

  startDoubleMove(playerId: PlayerId): void {
    if (!this.gameState || !this.gameEngine) {
      throw new Error('Game not started');
    }

    const currentPlayer = this.gameState.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    const result = this.gameEngine.startDoubleMove(this.gameState);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    this.gameState = result.value;
  }

  processDoubleMoveFirst(playerId: PlayerId, destination: NodeId, ticket: MoveTicketType): void {
    if (!this.gameState || !this.gameEngine) {
      throw new Error('Game not started');
    }

    const currentPlayer = this.gameState.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    const result = this.gameEngine.executeDoubleMoveFirst(this.gameState, destination, ticket);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    this.gameState = result.value;
  }

  processDoubleMoveSecond(playerId: PlayerId, destination: NodeId, ticket: MoveTicketType): void {
    if (!this.gameState || !this.gameEngine) {
      throw new Error('Game not started');
    }

    const currentPlayer = this.gameState.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    const result = this.gameEngine.executeDoubleMoveSecond(this.gameState, destination, ticket);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    this.gameState = result.value;
  }
}
