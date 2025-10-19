import { GameBoard } from './game-board';

describe('GameBoard', () => {
  describe('getNode', () => {
    it('should return a node by ID', () => {
      const board = GameBoard.createFromData();
      const node = board.getNode(1);

      expect(node).toBeDefined();
      expect(node?.id).toBe(1);
    });

    it('should return undefined for non-existent node', () => {
      const board = GameBoard.createFromData();
      const node = board.getNode(999);

      expect(node).toBeUndefined();
    });
  });

  describe('getConnections', () => {
    it('should return connections from a node', () => {
      const board = GameBoard.createFromData();
      const connections = board.getConnections(1);

      expect(connections.length).toBeGreaterThan(0);
    });

    it('should return empty array for node with no connections', () => {
      const board = GameBoard.createFromData();
      const connections = board.getConnections(999);

      expect(connections).toEqual([]);
    });
  });

  describe('isConnected', () => {
    it('should return true for connected nodes', () => {
      const board = GameBoard.createFromData();
      // Node 1 connects to Node 8 via TAXI
      const result = board.isConnected(1, 8, 'TAXI');

      expect(result).toBe(true);
    });

    it('should return false for nodes not connected with specified transport', () => {
      const board = GameBoard.createFromData();
      // Node 1 and Node 8 are not connected via BUS
      const result = board.isConnected(1, 8, 'BUS');

      expect(result).toBe(false);
    });

    it('should return false for non-existent nodes', () => {
      const board = GameBoard.createFromData();
      const result = board.isConnected(1, 999, 'TAXI');

      expect(result).toBe(false);
    });

    it('should handle bidirectional connections', () => {
      const board = GameBoard.createFromData();
      // Node 1 connects to Node 8, and vice versa
      const forward = board.isConnected(1, 8, 'TAXI');
      const backward = board.isConnected(8, 1, 'TAXI');

      expect(forward).toBe(true);
      expect(backward).toBe(true);
    });
  });

  describe('getReachableNodes', () => {
    it('should return all nodes reachable from a node with a specific transport', () => {
      const board = GameBoard.createFromData();
      const reachable = board.getReachableNodes(1, 'TAXI');

      expect(reachable.length).toBeGreaterThan(0);
      expect(reachable).toContain(8);
      expect(reachable).toContain(9);
    });

    it('should return empty array for transport type not available', () => {
      const board = GameBoard.createFromData();
      // Find a node with no FERRY connections (most nodes)
      const reachable = board.getReachableNodes(1, 'FERRY');

      expect(reachable).toEqual([]);
    });
  });

  describe('getAllReachableNodes', () => {
    it('should return all nodes reachable from a node with any transport', () => {
      const board = GameBoard.createFromData();
      const reachable = board.getAllReachableNodes(1);

      expect(reachable.length).toBeGreaterThan(0);
      // Node 1 has connections via TAXI, BUS, and UNDERGROUND
    });
  });

  describe('data validation', () => {
    it('should load exactly 199 nodes', () => {
      const board = GameBoard.createFromData();
      const allNodes = board.getAllNodes();

      expect(allNodes.length).toBe(199);
    });

    it('should have nodes numbered from 1 to 199', () => {
      const board = GameBoard.createFromData();

      for (let i = 1; i <= 199; i++) {
        const node = board.getNode(i);
        expect(node).toBeDefined();
      }
    });
  });
});
