import { Player } from './player';

describe('Player', () => {
  describe('createMrX', () => {
    it('should create Mr. X with correct initial tickets', () => {
      const mrX = Player.createMrX('player-1', 'Mr. X', 1);

      expect(mrX.id).toBe('player-1');
      expect(mrX.name).toBe('Mr. X');
      expect(mrX.position).toBe(1);
      expect(mrX.isMrX).toBe(true);
      expect(mrX.tickets.TAXI).toBe(4);
      expect(mrX.tickets.BUS).toBe(3);
      expect(mrX.tickets.UNDERGROUND).toBe(3);
      expect(mrX.tickets.BLACK).toBe(5);
      expect(mrX.tickets.DOUBLE_MOVE).toBe(2);
    });
  });

  describe('createDetective', () => {
    it('should create a detective with correct initial tickets', () => {
      const detective = Player.createDetective('player-2', 'Detective Red', 2);

      expect(detective.id).toBe('player-2');
      expect(detective.name).toBe('Detective Red');
      expect(detective.position).toBe(2);
      expect(detective.isMrX).toBe(false);
      expect(detective.tickets.TAXI).toBe(11);
      expect(detective.tickets.BUS).toBe(8);
      expect(detective.tickets.UNDERGROUND).toBe(4);
      expect(detective.tickets.BLACK).toBe(0);
      expect(detective.tickets.DOUBLE_MOVE).toBe(0);
    });
  });

  describe('moveTo', () => {
    it('should update player position', () => {
      const player = Player.createMrX('player-1', 'Mr. X', 1);
      const moved = player.moveTo(10);

      expect(moved.position).toBe(10);
      expect(player.position).toBe(1); // Original is immutable
    });
  });

  describe('useTicket', () => {
    it('should decrease ticket count', () => {
      const player = Player.createMrX('player-1', 'Mr. X', 1);
      const updated = player.useTicket('TAXI');

      expect(updated.tickets.TAXI).toBe(3);
      expect(player.tickets.TAXI).toBe(4); // Original is immutable
    });

    it('should handle using BLACK ticket', () => {
      const player = Player.createMrX('player-1', 'Mr. X', 1);
      const updated = player.useTicket('BLACK');

      expect(updated.tickets.BLACK).toBe(4);
    });

    it('should handle using DOUBLE_MOVE ticket', () => {
      const player = Player.createMrX('player-1', 'Mr. X', 1);
      const updated = player.useTicket('DOUBLE_MOVE');

      expect(updated.tickets.DOUBLE_MOVE).toBe(1);
    });

    it('should not go below zero', () => {
      const detective = Player.createDetective('player-2', 'Detective', 2);
      const updated = detective.useTicket('BLACK'); // Detective has 0 BLACK tickets

      expect(updated.tickets.BLACK).toBe(0);
    });
  });

  describe('hasTicket', () => {
    it('should return true if player has the ticket', () => {
      const player = Player.createMrX('player-1', 'Mr. X', 1);

      expect(player.hasTicket('TAXI')).toBe(true);
      expect(player.hasTicket('BLACK')).toBe(true);
    });

    it('should return false if player does not have the ticket', () => {
      const detective = Player.createDetective('player-2', 'Detective', 2);

      expect(detective.hasTicket('BLACK')).toBe(false);
      expect(detective.hasTicket('DOUBLE_MOVE')).toBe(false);
    });

    it('should return false if ticket count is zero', () => {
      const player = Player.createMrX('player-1', 'Mr. X', 1);
      const noTaxi = player.useTicket('TAXI')
        .useTicket('TAXI')
        .useTicket('TAXI')
        .useTicket('TAXI');

      expect(noTaxi.hasTicket('TAXI')).toBe(false);
    });
  });

  describe('canMove', () => {
    it('should return true if player has any tickets', () => {
      const player = Player.createMrX('player-1', 'Mr. X', 1);

      expect(player.canMove()).toBe(true);
    });

    it('should return false if player has no move tickets', () => {
      // Create a player with no tickets
      const noTickets = Player.createDetective('player-2', 'Detective', 2);
      let depleted = noTickets;

      // Use all TAXI tickets
      for (let i = 0; i < 11; i++) {
        depleted = depleted.useTicket('TAXI');
      }
      // Use all BUS tickets
      for (let i = 0; i < 8; i++) {
        depleted = depleted.useTicket('BUS');
      }
      // Use all UNDERGROUND tickets
      for (let i = 0; i < 4; i++) {
        depleted = depleted.useTicket('UNDERGROUND');
      }

      expect(depleted.canMove()).toBe(false);
    });
  });
});
