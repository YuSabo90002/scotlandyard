/**
 * Generate a random room ID
 * Format: 6-8 alphanumeric characters (uppercase)
 */
export function generateRoomId(length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }

  return result;
}

/**
 * Validate room ID format
 */
export function isValidRoomId(roomId: string): boolean {
  // Must be 6-8 alphanumeric characters (uppercase)
  return /^[A-Z0-9]{6,8}$/.test(roomId);
}

/**
 * Generate a unique room ID that doesn't exist in the provided set
 */
export function generateUniqueRoomId(
  existingIds: Set<string>,
  length: number = 6,
  maxAttempts: number = 100
): string {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const roomId = generateRoomId(length);
    if (!existingIds.has(roomId)) {
      return roomId;
    }
  }

  // If we couldn't generate a unique ID with the current length,
  // try with a longer length
  if (length < 8) {
    return generateUniqueRoomId(existingIds, length + 1, maxAttempts);
  }

  throw new Error('Failed to generate unique room ID');
}
