import { GameBoard } from './game-board';
import { GameState, Winner } from './game-state';
import { MoveValidator } from './move-validator';
import { PlayerId, NodeId, MoveTicketType, Result, MoveError } from './types';
import {
  PlayerMovedEvent,
  DoubleMoveFirstCompletedEvent,
  DoubleMoveSecondCompletedEvent
} from './game-event';

export class GameEngine {
  private validator: MoveValidator;

  constructor(private board: GameBoard) {
    this.validator = new MoveValidator(board);
  }

  executeMove(
    state: GameState,
    playerId: PlayerId,
    destination: NodeId,
    ticket: MoveTicketType
  ): Result<GameState, MoveError> {
    // Validate the move
    const validation = this.validator.validateMove(state, playerId, destination, ticket);
    if (!validation.ok) {
      return validation;
    }

    const player = state.getCurrentPlayer();
    if (!player) {
      return {
        ok: false,
        error: {
          type: 'INVALID_TICKET',
          message: 'Player not found',
        },
      };
    }

    // Execute the move
    const movedPlayer = player.moveTo(destination).useTicket(ticket);
    let newState = state.updatePlayer(movedPlayer);

    const fromPosition = player.position;

    // Increment Mr. X move count if it's Mr. X
    if (player.isMrX) {
      newState = newState.incrementMrXMoveCount();
    }

    // Record move event
    const shouldReveal = player.isMrX ? newState.shouldRevealMrXPosition() : false;
    const moveEvent: PlayerMovedEvent = {
      type: 'PLAYER_MOVED',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      playerId: player.id,
      from: fromPosition,
      to: player.isMrX && !shouldReveal ? null : destination,
      ticket,
      isMrX: player.isMrX,
      mrXMoveCount: player.isMrX ? newState.mrXMoveCount : undefined,
      shouldReveal,
    };

    newState.eventHistory.addEvent(moveEvent);

    // Check for game over conditions
    const gameOverCheck = this.checkGameOver(newState);
    if (gameOverCheck.isGameOver) {
      newState = newState.endGame(gameOverCheck.winner!);
      return { ok: true, value: newState };
    }

    // Move to next turn
    newState = newState.nextTurn();

    return { ok: true, value: newState };
  }

  checkGameOver(state: GameState): { isGameOver: boolean; winner?: Winner } {
    // Check if detective captured Mr. X
    const mrXCaptured = state.detectives.some((d) => d.position === state.mrX.position);
    if (mrXCaptured) {
      return { isGameOver: true, winner: 'DETECTIVES' };
    }

    // Check if Mr. X has no valid moves
    if (state.currentPlayerId === state.mrX.id) {
      const hasValidMoves = this.hasAnyValidMove(state, state.mrX.id);
      if (!hasValidMoves) {
        return { isGameOver: true, winner: 'DETECTIVES' };
      }
    }

    // Check if Mr. X escaped (turn limit reached)
    if (state.currentTurn >= 24) {
      return { isGameOver: true, winner: 'MR_X' };
    }

    return { isGameOver: false };
  }

  startDoubleMove(state: GameState): Result<GameState, MoveError> {
    // Check if it's Mr. X's turn
    if (state.currentPlayerId !== state.mrX.id) {
      return {
        ok: false,
        error: {
          type: 'NOT_YOUR_TURN',
          message: 'Only Mr. X can use double move',
        },
      };
    }

    // Check if already in double move
    if (state.doubleMoveState.isActive) {
      return {
        ok: false,
        error: {
          type: 'INVALID_TICKET',
          message: 'Already in double move',
        },
      };
    }

    // Check if Mr. X has DOUBLE_MOVE ticket
    if (!state.mrX.hasTicket('DOUBLE_MOVE')) {
      return {
        ok: false,
        error: {
          type: 'INSUFFICIENT_TICKET',
          message: 'No DOUBLE_MOVE tickets available',
        },
      };
    }

    // Consume DOUBLE_MOVE ticket and start double move
    const mrXWithoutDouble = state.mrX.useTicket('DOUBLE_MOVE');
    let newState = state.updatePlayer(mrXWithoutDouble);
    newState = newState.startDoubleMove();

    return { ok: true, value: newState };
  }

  executeDoubleMoveFirst(
    state: GameState,
    destination: NodeId,
    ticket: MoveTicketType
  ): Result<GameState, MoveError> {
    // Check if in double move
    if (!state.doubleMoveState.isActive) {
      return {
        ok: false,
        error: {
          type: 'INVALID_TICKET',
          message: 'Not in double move',
        },
      };
    }

    // Check if first move already completed
    if (state.doubleMoveState.firstMoveCompleted) {
      return {
        ok: false,
        error: {
          type: 'INVALID_TICKET',
          message: 'First move already completed',
        },
      };
    }

    // Validate and execute the move
    const validation = this.validator.validateMove(state, state.mrX.id, destination, ticket);
    if (!validation.ok) {
      return validation;
    }

    const fromPosition = state.mrX.position;

    // Execute the move
    const movedMrX = state.mrX.moveTo(destination).useTicket(ticket);
    let newState = state.updatePlayer(movedMrX);

    // Increment move count
    newState = newState.incrementMrXMoveCount();

    // Record double move first event
    const shouldReveal = newState.shouldRevealMrXPosition();
    const firstEvent: DoubleMoveFirstCompletedEvent = {
      type: 'DOUBLE_MOVE_FIRST_COMPLETED',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      playerId: state.mrX.id,
      from: fromPosition,
      to: shouldReveal ? destination : null,
      ticket,
      mrXMoveCount: newState.mrXMoveCount,
      shouldReveal,
    };

    newState.eventHistory.addEvent(firstEvent);

    // Mark first move as completed with intermediate position
    newState = newState.completeFirstMove(destination);

    return { ok: true, value: newState };
  }

  executeDoubleMoveSecond(
    state: GameState,
    destination: NodeId,
    ticket: MoveTicketType
  ): Result<GameState, MoveError> {
    // Check if in double move
    if (!state.doubleMoveState.isActive) {
      return {
        ok: false,
        error: {
          type: 'INVALID_TICKET',
          message: 'Not in double move',
        },
      };
    }

    // Check if first move completed
    if (!state.doubleMoveState.firstMoveCompleted) {
      return {
        ok: false,
        error: {
          type: 'INVALID_TICKET',
          message: 'First move not completed',
        },
      };
    }

    // Validate and execute the move
    const validation = this.validator.validateMove(state, state.mrX.id, destination, ticket);
    if (!validation.ok) {
      return validation;
    }

    const fromPosition = state.mrX.position;

    // Execute the move
    const movedMrX = state.mrX.moveTo(destination).useTicket(ticket);
    let newState = state.updatePlayer(movedMrX);

    // Increment move count
    newState = newState.incrementMrXMoveCount();

    // Record double move second event
    const shouldReveal = newState.shouldRevealMrXPosition();
    const secondEvent: DoubleMoveSecondCompletedEvent = {
      type: 'DOUBLE_MOVE_SECOND_COMPLETED',
      timestamp: Date.now(),
      turn: newState.currentTurn,
      playerId: state.mrX.id,
      from: fromPosition,
      to: shouldReveal ? destination : null,
      ticket,
      mrXMoveCount: newState.mrXMoveCount,
      shouldReveal,
    };

    newState.eventHistory.addEvent(secondEvent);

    // Complete double move
    newState = newState.completeDoubleMove();

    // Check for game over
    const gameOverCheck = this.checkGameOver(newState);
    if (gameOverCheck.isGameOver) {
      newState = newState.endGame(gameOverCheck.winner!);
      return { ok: true, value: newState };
    }

    // Move to next turn
    newState = newState.nextTurn();

    return { ok: true, value: newState };
  }

  private hasAnyValidMove(state: GameState, playerId: PlayerId): boolean {
    const player = playerId === state.mrX.id ? state.mrX : state.detectives.find(d => d.id === playerId);
    if (!player) {
      return false;
    }

    const reachableNodes = this.board.getAllReachableNodes(player.position);

    // Check if player can move to any reachable node with any available ticket
    for (const nodeId of reachableNodes) {
      // Try each ticket type
      const ticketTypes: MoveTicketType[] = ['TAXI', 'BUS', 'UNDERGROUND', 'BLACK'];

      for (const ticket of ticketTypes) {
        if (player.hasTicket(ticket)) {
          const validation = this.validator.validateMove(state, playerId, nodeId, ticket);
          if (validation.ok) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
