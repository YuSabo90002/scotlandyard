import { Player as IPlayer, PlayerId, NodeId, Tickets, TicketType } from './types';

export class Player implements IPlayer {
  readonly id: PlayerId;
  readonly name: string;
  readonly position: NodeId;
  readonly tickets: Tickets;
  readonly isMrX: boolean;

  private constructor(
    id: PlayerId,
    name: string,
    position: NodeId,
    tickets: Tickets,
    isMrX: boolean
  ) {
    this.id = id;
    this.name = name;
    this.position = position;
    this.tickets = tickets;
    this.isMrX = isMrX;
  }

  static createMrX(id: PlayerId, name: string, position: NodeId): Player {
    return new Player(id, name, position, {
      TAXI: 4,
      BUS: 3,
      UNDERGROUND: 3,
      BLACK: 5,
      DOUBLE_MOVE: 2,
    }, true);
  }

  static createDetective(id: PlayerId, name: string, position: NodeId): Player {
    return new Player(id, name, position, {
      TAXI: 11,
      BUS: 8,
      UNDERGROUND: 4,
      BLACK: 0,
      DOUBLE_MOVE: 0,
    }, false);
  }

  moveTo(newPosition: NodeId): Player {
    return new Player(
      this.id,
      this.name,
      newPosition,
      this.tickets,
      this.isMrX
    );
  }

  useTicket(ticketType: TicketType): Player {
    const newTickets = {
      ...this.tickets,
      [ticketType]: Math.max(0, this.tickets[ticketType] - 1),
    };

    return new Player(
      this.id,
      this.name,
      this.position,
      newTickets,
      this.isMrX
    );
  }

  hasTicket(ticketType: TicketType): boolean {
    return this.tickets[ticketType] > 0;
  }

  canMove(): boolean {
    // A player can move if they have at least one move ticket (TAXI, BUS, UNDERGROUND, or BLACK)
    return this.hasTicket('TAXI') ||
      this.hasTicket('BUS') ||
      this.hasTicket('UNDERGROUND') ||
      this.hasTicket('BLACK');
  }
}
