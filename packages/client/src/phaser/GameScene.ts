import Phaser from 'phaser';
import type { TransportType, NodeId } from '@scotland-yard-online/domain';

interface MapStation {
  x: number;
  y: number;
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

// Transport colors
const TRANSPORT_COLORS = {
  TAXI: 0xFFD700,      // Gold
  BUS: 0x32CD32,       // Green
  UNDERGROUND: 0xFF4500, // Red
  FERRY: 0x1E90FF,     // Blue
};

const TRANSPORT_LINE_WIDTH = {
  TAXI: 2,
  BUS: 3,
  UNDERGROUND: 4,
  FERRY: 3,
};

export class GameScene extends Phaser.Scene {
  private mapData: MapData | null = null;
  private nodeGraphics: Map<NodeId, Phaser.GameObjects.Graphics>;
  private nodeTexts: Map<NodeId, Phaser.GameObjects.Text>;
  private connectionGraphics: Phaser.GameObjects.Graphics;
  private playerPieces: Map<string, Phaser.GameObjects.Graphics>;

  // Scale and offset for map rendering
  private readonly SCALE = 1.5;
  private readonly OFFSET_X = 50;
  private readonly OFFSET_Y = 50;
  private readonly NODE_RADIUS = 8;

  constructor() {
    super({ key: 'GameScene' });
    this.nodeGraphics = new Map();
    this.nodeTexts = new Map();
    this.playerPieces = new Map();
    this.connectionGraphics = null as any;
  }

  preload() {
    // Load map data using Phaser's loader
    this.load.json('mapData', '/map-data.json');
  }

  create() {
    // Get map data from cache
    this.mapData = this.cache.json.get('mapData');

    if (!this.mapData) {
      console.error('Map data not loaded');
      return;
    }

    console.log('Map data loaded successfully:', {
      stationCount: Object.keys(this.mapData.stations).length,
      connectionCount: this.mapData.connections.length
    });

    // Set background color
    this.cameras.main.setBackgroundColor('#f0f0f0');

    // Calculate map bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const station of Object.values(this.mapData.stations)) {
      const x = station.x * this.SCALE + this.OFFSET_X;
      const y = station.y * this.SCALE + this.OFFSET_Y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    console.log('Map bounds:', { minX, maxX, minY, maxY });

    // Draw connections first (so they appear behind nodes)
    this.drawConnections();

    // Draw nodes
    this.drawNodes();

    // Set initial zoom to fit the map
    this.cameras.main.setZoom(0.4);

    // Center camera on the map center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    this.cameras.main.centerOn(centerX, centerY);

    // Enable camera dragging with bounds based on actual map size
    const padding = 200;
    this.cameras.main.setBounds(
      minX - padding,
      minY - padding,
      maxX - minX + padding * 2,
      maxY - minY + padding * 2
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.cameras.main.scrollX -= pointer.velocity.x / this.cameras.main.zoom;
        this.cameras.main.scrollY -= pointer.velocity.y / this.cameras.main.zoom;
      }
    });

    // Enable zoom with mouse wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      const zoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.2, 2);
      this.cameras.main.setZoom(newZoom);
    });
  }

  private drawConnections() {
    if (!this.mapData) return;

    this.connectionGraphics = this.add.graphics();

    for (const connection of this.mapData.connections) {
      const station1 = this.mapData.stations[connection.from.toString()];
      const station2 = this.mapData.stations[connection.to.toString()];

      if (!station1 || !station2) {
        console.warn(`Missing station data for connection: ${connection.from} -> ${connection.to}`);
        continue;
      }

      const x1 = station1.x * this.SCALE + this.OFFSET_X;
      const y1 = station1.y * this.SCALE + this.OFFSET_Y;
      const x2 = station2.x * this.SCALE + this.OFFSET_X;
      const y2 = station2.y * this.SCALE + this.OFFSET_Y;

      // Map transport type
      let transportType: TransportType = connection.transport as TransportType;
      if (connection.transport === 'water') {
        transportType = 'FERRY';
      }

      const color = TRANSPORT_COLORS[transportType] || 0x808080;
      const lineWidth = TRANSPORT_LINE_WIDTH[transportType] || 2;

      this.connectionGraphics.lineStyle(lineWidth, color, 0.6);
      this.connectionGraphics.lineBetween(x1, y1, x2, y2);
    }
  }

  private drawNodes() {
    if (!this.mapData) return;

    for (const [nodeIdStr, station] of Object.entries(this.mapData.stations)) {
      const nodeId = parseInt(nodeIdStr) as NodeId;
      const x = station.x * this.SCALE + this.OFFSET_X;
      const y = station.y * this.SCALE + this.OFFSET_Y;

      // Draw node circle
      const graphics = this.add.graphics();
      graphics.fillStyle(0xFFFFFF, 1);
      graphics.fillCircle(x, y, this.NODE_RADIUS);
      graphics.lineStyle(2, 0x333333, 1);
      graphics.strokeCircle(x, y, this.NODE_RADIUS);

      // Make node interactive
      const hitArea = new Phaser.Geom.Circle(x, y, this.NODE_RADIUS + 5);
      graphics.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

      graphics.on('pointerover', () => {
        graphics.clear();
        graphics.fillStyle(0xFFFF00, 1);
        graphics.fillCircle(x, y, this.NODE_RADIUS);
        graphics.lineStyle(2, 0x333333, 1);
        graphics.strokeCircle(x, y, this.NODE_RADIUS);
      });

      graphics.on('pointerout', () => {
        graphics.clear();
        graphics.fillStyle(0xFFFFFF, 1);
        graphics.fillCircle(x, y, this.NODE_RADIUS);
        graphics.lineStyle(2, 0x333333, 1);
        graphics.strokeCircle(x, y, this.NODE_RADIUS);
      });

      graphics.on('pointerdown', () => {
        this.handleNodeClick(nodeId);
      });

      this.nodeGraphics.set(nodeId, graphics);

      // Draw node label
      const text = this.add.text(x, y, nodeId.toString(), {
        fontSize: '10px',
        color: '#000000',
        fontStyle: 'bold',
      });
      text.setOrigin(0.5, 0.5);
      this.nodeTexts.set(nodeId, text);
    }
  }

  private handleNodeClick(nodeId: NodeId) {
    console.log('Node clicked:', nodeId);
    this.events.emit('nodeClicked', nodeId);
  }

  public highlightNodes(nodeIds: NodeId[]) {
    if (!this.mapData) return;

    // Reset all nodes first
    for (const [nodeId, graphics] of this.nodeGraphics.entries()) {
      const station = this.mapData.stations[nodeId.toString()];
      if (!station) continue;

      const x = station.x * this.SCALE + this.OFFSET_X;
      const y = station.y * this.SCALE + this.OFFSET_Y;

      graphics.clear();
      graphics.fillStyle(0xFFFFFF, 1);
      graphics.fillCircle(x, y, this.NODE_RADIUS);
      graphics.lineStyle(2, 0x333333, 1);
      graphics.strokeCircle(x, y, this.NODE_RADIUS);
    }

    // Highlight specified nodes
    for (const nodeId of nodeIds) {
      const graphics = this.nodeGraphics.get(nodeId);
      const station = this.mapData.stations[nodeId.toString()];
      if (!graphics || !station) continue;

      const x = station.x * this.SCALE + this.OFFSET_X;
      const y = station.y * this.SCALE + this.OFFSET_Y;

      graphics.clear();
      graphics.fillStyle(0x00FF00, 0.7);
      graphics.fillCircle(x, y, this.NODE_RADIUS + 2);
      graphics.lineStyle(3, 0x00FF00, 1);
      graphics.strokeCircle(x, y, this.NODE_RADIUS + 2);
    }
  }

  public drawPlayerPiece(playerId: string, nodeId: NodeId, color: number, isMrX: boolean = false) {
    if (!this.mapData) return;

    const station = this.mapData.stations[nodeId.toString()];
    if (!station) {
      console.warn(`Station ${nodeId} not found`);
      return;
    }

    const x = station.x * this.SCALE + this.OFFSET_X;
    const y = station.y * this.SCALE + this.OFFSET_Y;

    // Remove existing piece if any
    const existingPiece = this.playerPieces.get(playerId);
    if (existingPiece) {
      existingPiece.destroy();
    }

    // Draw new piece
    const piece = this.add.graphics();

    if (isMrX) {
      // Draw Mr. X as a black square
      piece.fillStyle(color, 1);
      piece.fillRect(x - 10, y - 10, 20, 20);
      piece.lineStyle(2, 0xFFFFFF, 1);
      piece.strokeRect(x - 10, y - 10, 20, 20);
    } else {
      // Draw detective as a colored circle
      piece.fillStyle(color, 1);
      piece.fillCircle(x, y, 12);
      piece.lineStyle(2, 0xFFFFFF, 1);
      piece.strokeCircle(x, y, 12);
    }

    this.playerPieces.set(playerId, piece);
  }

  public removePlayerPiece(playerId: string) {
    const piece = this.playerPieces.get(playerId);
    if (piece) {
      piece.destroy();
      this.playerPieces.delete(playerId);
    }
  }

  public clearAllPlayerPieces() {
    for (const piece of this.playerPieces.values()) {
      piece.destroy();
    }
    this.playerPieces.clear();
  }

  public animatePlayerMove(playerId: string, fromNodeId: NodeId, toNodeId: NodeId, color: number, isMrX: boolean = false, onComplete?: () => void) {
    if (!this.mapData) {
      if (onComplete) onComplete();
      return;
    }

    const fromStation = this.mapData.stations[fromNodeId.toString()];
    const toStation = this.mapData.stations[toNodeId.toString()];

    if (!fromStation || !toStation) {
      console.warn(`Station not found: ${fromNodeId} or ${toNodeId}`);
      if (onComplete) onComplete();
      return;
    }

    const fromX = fromStation.x * this.SCALE + this.OFFSET_X;
    const fromY = fromStation.y * this.SCALE + this.OFFSET_Y;
    const toX = toStation.x * this.SCALE + this.OFFSET_X;
    const toY = toStation.y * this.SCALE + this.OFFSET_Y;

    // Get or create piece
    let piece = this.playerPieces.get(playerId);
    if (!piece) {
      piece = this.add.graphics();
      this.playerPieces.set(playerId, piece);
    }

    // Animate movement
    this.tweens.add({
      targets: piece,
      x: toX - fromX,
      y: toY - fromY,
      duration: 1000,
      ease: 'Power2',
      onUpdate: () => {
        piece!.clear();
        const currentX = fromX + piece!.x;
        const currentY = fromY + piece!.y;

        if (isMrX) {
          piece!.fillStyle(color, 1);
          piece!.fillRect(currentX - 10, currentY - 10, 20, 20);
          piece!.lineStyle(2, 0xFFFFFF, 1);
          piece!.strokeRect(currentX - 10, currentY - 10, 20, 20);
        } else {
          piece!.fillStyle(color, 1);
          piece!.fillCircle(currentX, currentY, 12);
          piece!.lineStyle(2, 0xFFFFFF, 1);
          piece!.strokeCircle(currentX, currentY, 12);
        }
      },
      onComplete: () => {
        this.drawPlayerPiece(playerId, toNodeId, color, isMrX);
        if (onComplete) onComplete();
      },
    });
  }
}
