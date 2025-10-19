// Client-side map utilities using the domain package
import { GameBoard, type TransportType } from '@scotland-yard-online/domain';

let gameBoardInstance: GameBoard | null = null;

function getGameBoard(): GameBoard {
  if (!gameBoardInstance) {
    gameBoardInstance = GameBoard.createFromData();
  }
  return gameBoardInstance;
}

export type { TransportType };

/**
 * Get all nodes reachable from a given position using a specific transport type
 */
export function getReachableNodes(
  fromNode: number,
  transportType: TransportType
): number[] {
  const gameBoard = getGameBoard();
  return gameBoard.getReachableNodes(fromNode, transportType);
}

/**
 * Get all nodes reachable from a given position using any transport type (for BLACK ticket)
 */
export function getAllReachableNodes(fromNode: number): number[] {
  const gameBoard = getGameBoard();
  return gameBoard.getAllReachableNodes(fromNode);
}

/**
 * Check if two nodes are connected by a specific transport type
 */
export function areNodesConnected(
  fromNode: number,
  toNode: number,
  transportType: TransportType
): boolean {
  const gameBoard = getGameBoard();
  return gameBoard.isConnected(fromNode, toNode, transportType);
}
