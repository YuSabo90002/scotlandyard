import { GameBoard } from './game-board';
import { GameState } from './game-state';
import { PlayerId, NodeId, MoveTicketType, Result, MoveError, TransportType } from './types';

export class MoveValidator {
  constructor(private board: GameBoard) {}

  validateMove(
    state: GameState,
    playerId: PlayerId,
    destination: NodeId,
    ticket: MoveTicketType
  ): Result<void, MoveError> {
    // 1. Check if it's the player's turn
    if (state.currentPlayerId !== playerId) {
      return {
        ok: false,
        error: {
          type: 'NOT_YOUR_TURN',
          message: 'It is not your turn',
        },
      };
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

    // 2. Check if player has the ticket
    if (!player.hasTicket(ticket)) {
      return {
        ok: false,
        error: {
          type: 'INSUFFICIENT_TICKET',
          message: `You don't have a ${ticket} ticket`,
        },
      };
    }

    // 3. Check if destination is connected with the specified transport
    const isConnected = this.isValidConnection(
      player.position,
      destination,
      ticket
    );

    if (!isConnected) {
      return {
        ok: false,
        error: {
          type: 'NOT_CONNECTED',
          message: `Node ${destination} is not connected to ${player.position} via ${ticket}`,
        },
      };
    }

    // 4. Check if detective is moving to an occupied node (detective-only rule)
    if (!player.isMrX) {
      const occupyingDetective = state.getDetectiveAt(destination);
      if (occupyingDetective && occupyingDetective.id !== player.id) {
        return {
          ok: false,
          error: {
            type: 'NODE_OCCUPIED',
            message: 'This node is already occupied by another detective',
            occupiedBy: occupyingDetective.id,
          },
        };
      }
    }

    return { ok: true, value: undefined };
  }

  private isValidConnection(
    from: NodeId,
    to: NodeId,
    ticket: MoveTicketType
  ): boolean {
    if (ticket === 'BLACK') {
      // BLACK ticket can be used for any transport type
      const connections = this.board.getConnections(from);
      return connections.some((conn) => conn.to === to);
    }

    // For regular tickets, check specific transport type
    return this.board.isConnected(from, to, ticket as TransportType);
  }
}
