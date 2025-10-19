import { Player } from './player';
import { PlayerId, NodeId } from './types';
import { EventHistory } from './game-event';

export type Winner = 'MR_X' | 'DETECTIVES';

export type DoubleMoveState =
  | { isActive: false }
  | { isActive: true; firstMoveCompleted: boolean; intermediatePosition?: NodeId };

export class GameState {
  readonly mrX: Player;
  readonly detectives: readonly Player[];
  readonly currentTurn: number;
  readonly currentPlayerId: PlayerId;
  readonly mrXMoveCount: number;
  readonly isGameOver: boolean;
  readonly winner?: Winner;
  readonly doubleMoveState: DoubleMoveState;
  readonly eventHistory: EventHistory;

  private constructor(
    mrX: Player,
    detectives: readonly Player[],
    currentTurn: number,
    currentPlayerId: PlayerId,
    mrXMoveCount: number,
    isGameOver: boolean,
    winner?: Winner,
    doubleMoveState: DoubleMoveState = { isActive: false },
    eventHistory?: EventHistory
  ) {
    this.mrX = mrX;
    this.detectives = detectives;
    this.currentTurn = currentTurn;
    this.currentPlayerId = currentPlayerId;
    this.mrXMoveCount = mrXMoveCount;
    this.isGameOver = isGameOver;
    this.winner = winner;
    this.doubleMoveState = doubleMoveState;
    this.eventHistory = eventHistory || new EventHistory();
  }

  static create(mrX: Player, detectives: Player[]): GameState {
    const history = new EventHistory();
    const detectiveStartPositions: Record<PlayerId, NodeId> = {};
    detectives.forEach((d) => {
      detectiveStartPositions[d.id] = d.position;
    });

    history.addEvent({
      type: 'GAME_STARTED',
      timestamp: Date.now(),
      turn: 0,
      mrXId: mrX.id,
      detectiveIds: detectives.map((d) => d.id),
      mrXStartPosition: mrX.position,
      detectiveStartPositions,
    });

    return new GameState(
      mrX,
      detectives,
      0,
      mrX.id,
      0,
      false,
      undefined,
      { isActive: false },
      history
    );
  }

  getCurrentPlayer(): Player | undefined {
    if (this.currentPlayerId === this.mrX.id) {
      return this.mrX;
    }
    return this.detectives.find((d) => d.id === this.currentPlayerId);
  }

  getDetectiveAt(position: NodeId): Player | undefined {
    return this.detectives.find((d) => d.position === position);
  }

  shouldRevealMrXPosition(): boolean {
    const revealTurns = [3, 8, 13, 18, 24];
    return revealTurns.includes(this.mrXMoveCount);
  }

  incrementMrXMoveCount(): GameState {
    return new GameState(
      this.mrX,
      this.detectives,
      this.currentTurn,
      this.currentPlayerId,
      this.mrXMoveCount + 1,
      this.isGameOver,
      this.winner,
      this.doubleMoveState,
      this.eventHistory
    );
  }

  nextTurn(): GameState {
    const allPlayers = [this.mrX, ...this.detectives];
    const currentIndex = allPlayers.findIndex((p) => p.id === this.currentPlayerId);
    const nextIndex = (currentIndex + 1) % allPlayers.length;
    const nextPlayerId = allPlayers[nextIndex].id;

    const newHistory = this.eventHistory.clone();
    newHistory.addEvent({
      type: 'TURN_CHANGED',
      timestamp: Date.now(),
      turn: this.currentTurn + 1,
      currentPlayerId: nextPlayerId,
    });

    return new GameState(
      this.mrX,
      this.detectives,
      this.currentTurn + 1,
      nextPlayerId,
      this.mrXMoveCount,
      this.isGameOver,
      this.winner,
      this.doubleMoveState,
      newHistory
    );
  }

  updatePlayer(player: Player): GameState {
    if (player.id === this.mrX.id) {
      return new GameState(
        player,
        this.detectives,
        this.currentTurn,
        this.currentPlayerId,
        this.mrXMoveCount,
        this.isGameOver,
        this.winner,
        this.doubleMoveState,
        this.eventHistory
      );
    }

    const updatedDetectives = this.detectives.map((d) =>
      d.id === player.id ? player : d
    );

    return new GameState(
      this.mrX,
      updatedDetectives,
      this.currentTurn,
      this.currentPlayerId,
      this.mrXMoveCount,
      this.isGameOver,
      this.winner,
      this.doubleMoveState,
      this.eventHistory
    );
  }

  endGame(winner: Winner): GameState {
    const newHistory = this.eventHistory.clone();

    // Determine reason
    let reason: 'CAPTURE' | 'MR_X_NO_MOVES' | 'TURN_LIMIT' = 'CAPTURE';
    const mrXCaptured = this.detectives.some((d) => d.position === this.mrX.position);
    if (mrXCaptured) {
      reason = 'CAPTURE';
    } else if (this.currentTurn >= 24) {
      reason = 'TURN_LIMIT';
    } else {
      reason = 'MR_X_NO_MOVES';
    }

    newHistory.addEvent({
      type: 'GAME_ENDED',
      timestamp: Date.now(),
      turn: this.currentTurn,
      winner,
      reason,
    });

    return new GameState(
      this.mrX,
      this.detectives,
      this.currentTurn,
      this.currentPlayerId,
      this.mrXMoveCount,
      true,
      winner,
      this.doubleMoveState,
      newHistory
    );
  }

  startDoubleMove(): GameState {
    const newHistory = this.eventHistory.clone();
    newHistory.addEvent({
      type: 'DOUBLE_MOVE_STARTED',
      timestamp: Date.now(),
      turn: this.currentTurn,
      playerId: this.mrX.id,
    });

    return new GameState(
      this.mrX,
      this.detectives,
      this.currentTurn,
      this.currentPlayerId,
      this.mrXMoveCount,
      this.isGameOver,
      this.winner,
      { isActive: true, firstMoveCompleted: false },
      newHistory
    );
  }

  completeFirstMove(intermediatePosition: NodeId): GameState {
    return new GameState(
      this.mrX,
      this.detectives,
      this.currentTurn,
      this.currentPlayerId,
      this.mrXMoveCount,
      this.isGameOver,
      this.winner,
      { isActive: true, firstMoveCompleted: true, intermediatePosition },
      this.eventHistory
    );
  }

  completeDoubleMove(): GameState {
    return new GameState(
      this.mrX,
      this.detectives,
      this.currentTurn,
      this.currentPlayerId,
      this.mrXMoveCount,
      this.isGameOver,
      this.winner,
      { isActive: false },
      this.eventHistory
    );
  }
}
