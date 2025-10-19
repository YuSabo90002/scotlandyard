import { Node, Connection, NodeId, TransportType } from './types';
import mapData from './data/map-data.json';

interface MapStation {
  id: number;
  x: number;
  y: number;
  transports: string[];
}

interface MapConnection {
  from: number;
  to: number;
  transport: string;
}

interface MapData {
  stations: Record<string, MapStation>;
  connections: MapConnection[];
}

export class GameBoard {
  private nodes: Map<NodeId, Node>;
  private connectionMap: Map<NodeId, Connection[]>;

  private constructor(nodes: Map<NodeId, Node>, connections: Connection[]) {
    this.nodes = nodes;
    this.connectionMap = this.buildConnectionMap(connections);
  }

  static createFromData(): GameBoard {
    const nodes = new Map<NodeId, Node>();
    const data = mapData as unknown as MapData;

    // Load nodes from map data
    Object.entries(data.stations).forEach(([id, station]) => {
      const nodeId = parseInt(id);
      nodes.set(nodeId, {
        id: nodeId,
        x: station.x,
        y: station.y,
        transports: station.transports as TransportType[],
      });
    });

    // Load connections from map data
    const connections: Connection[] = data.connections.map((conn) => ({
      from: conn.from,
      to: conn.to,
      transport: conn.transport as TransportType,
    }));

    return new GameBoard(nodes, connections);
  }

  private buildConnectionMap(connections: Connection[]): Map<NodeId, Connection[]> {
    const map = new Map<NodeId, Connection[]>();

    connections.forEach((conn) => {
      // Add forward connection
      if (!map.has(conn.from)) {
        map.set(conn.from, []);
      }
      map.get(conn.from)!.push(conn);

      // Add backward connection (bidirectional)
      if (!map.has(conn.to)) {
        map.set(conn.to, []);
      }
      map.get(conn.to)!.push({
        from: conn.to,
        to: conn.from,
        transport: conn.transport,
      });
    });

    return map;
  }

  getNode(id: NodeId): Node | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  getConnections(from: NodeId): Connection[] {
    return this.connectionMap.get(from) || [];
  }

  isConnected(from: NodeId, to: NodeId, transport: TransportType): boolean {
    const connections = this.getConnections(from);
    return connections.some((conn) => conn.to === to && conn.transport === transport);
  }

  getReachableNodes(from: NodeId, transport: TransportType): NodeId[] {
    const connections = this.getConnections(from);
    return connections.filter((conn) => conn.transport === transport).map((conn) => conn.to);
  }

  getAllReachableNodes(from: NodeId): NodeId[] {
    const connections = this.getConnections(from);
    return connections.map((conn) => conn.to);
  }
}
