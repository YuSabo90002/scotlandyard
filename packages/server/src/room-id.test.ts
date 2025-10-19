import { generateRoomId, isValidRoomId, generateUniqueRoomId } from './room-id';

describe('Room ID Generation', () => {
  describe('generateRoomId', () => {
    it('should generate room ID with default length 6', () => {
      const roomId = generateRoomId();
      expect(roomId).toHaveLength(6);
    });

    it('should generate room ID with custom length', () => {
      const roomId = generateRoomId(8);
      expect(roomId).toHaveLength(8);
    });

    it('should only contain uppercase alphanumeric characters', () => {
      for (let i = 0; i < 100; i++) {
        const roomId = generateRoomId();
        expect(roomId).toMatch(/^[A-Z0-9]+$/);
      }
    });

    it('should generate different IDs on consecutive calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateRoomId());
      }
      // With high probability, we should have many unique IDs
      expect(ids.size).toBeGreaterThan(90);
    });
  });

  describe('isValidRoomId', () => {
    it('should validate correct room IDs', () => {
      expect(isValidRoomId('ABC123')).toBe(true);
      expect(isValidRoomId('ABCDEF')).toBe(true);
      expect(isValidRoomId('123456')).toBe(true);
      expect(isValidRoomId('AB12CD34')).toBe(true);
    });

    it('should reject room IDs that are too short', () => {
      expect(isValidRoomId('ABC12')).toBe(false);
      expect(isValidRoomId('A')).toBe(false);
    });

    it('should reject room IDs that are too long', () => {
      expect(isValidRoomId('ABCDEFGHI')).toBe(false);
      expect(isValidRoomId('ABC123456789')).toBe(false);
    });

    it('should reject room IDs with lowercase characters', () => {
      expect(isValidRoomId('abc123')).toBe(false);
      expect(isValidRoomId('AbC123')).toBe(false);
    });

    it('should reject room IDs with special characters', () => {
      expect(isValidRoomId('ABC-123')).toBe(false);
      expect(isValidRoomId('ABC_123')).toBe(false);
      expect(isValidRoomId('ABC 123')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidRoomId('')).toBe(false);
    });
  });

  describe('generateUniqueRoomId', () => {
    it('should generate unique ID not in existing set', () => {
      const existingIds = new Set(['ABC123', 'DEF456', 'GHI789']);
      const newId = generateUniqueRoomId(existingIds);

      expect(existingIds.has(newId)).toBe(false);
      expect(isValidRoomId(newId)).toBe(true);
    });

    it('should generate ID with default length 6', () => {
      const existingIds = new Set<string>();
      const newId = generateUniqueRoomId(existingIds);

      expect(newId).toHaveLength(6);
    });

    it('should generate ID with custom length', () => {
      const existingIds = new Set<string>();
      const newId = generateUniqueRoomId(existingIds, 8);

      expect(newId).toHaveLength(8);
    });

    it('should increase length when running out of IDs', () => {
      // Create a set with all possible 2-character IDs (for testing)
      const existingIds = new Set<string>();
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

      // Fill up length-2 space
      for (let i = 0; i < characters.length; i++) {
        for (let j = 0; j < characters.length; j++) {
          existingIds.add(characters[i] + characters[j]);
        }
      }

      // Should generate length-3 ID
      const newId = generateUniqueRoomId(existingIds, 2);
      expect(newId.length).toBeGreaterThan(2);
      expect(existingIds.has(newId)).toBe(false);
    });

    it('should throw error if cannot generate unique ID', () => {
      const existingIds = new Set<string>();

      // Mock Math.random to always return the same ID
      const originalRandom = Math.random;
      Math.random = () => 0;

      // Fill the set with the ID that would be generated
      existingIds.add('AAAAAAAA'); // 8 A's

      expect(() => {
        generateUniqueRoomId(existingIds, 8, 10);
      }).toThrow('Failed to generate unique room ID');

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should handle empty existing IDs set', () => {
      const existingIds = new Set<string>();
      const newId = generateUniqueRoomId(existingIds);

      expect(isValidRoomId(newId)).toBe(true);
    });

    it('should eventually find a unique ID with high collision rate', () => {
      const existingIds = new Set<string>();

      // Add 50% of possible 6-character IDs (simulating high collision)
      for (let i = 0; i < 1000; i++) {
        existingIds.add(generateRoomId(6));
      }

      const newId = generateUniqueRoomId(existingIds);
      expect(existingIds.has(newId)).toBe(false);
      expect(isValidRoomId(newId)).toBe(true);
    });
  });
});
