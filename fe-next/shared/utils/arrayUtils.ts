/**
 * Array Utilities
 * Shared array manipulation functions
 *
 * Consolidates duplicated shuffle patterns from 20+ files that used:
 * .sort(() => Math.random() - 0.5)
 */

/**
 * Fisher-Yates shuffle algorithm
 * Properly shuffles an array with uniform distribution
 *
 * Note: The commonly used .sort(() => Math.random() - 0.5) pattern
 * does NOT produce uniform distribution. This implementation is correct.
 *
 * @param array - Array to shuffle (will be mutated)
 * @returns The same array, shuffled in place
 *
 * @example
 * const arr = [1, 2, 3, 4, 5];
 * shuffle(arr); // arr is now shuffled
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Create a shuffled copy of an array without mutating the original
 *
 * @param array - Array to shuffle
 * @returns New shuffled array
 *
 * @example
 * const original = [1, 2, 3, 4, 5];
 * const shuffled = shuffleCopy(original);
 * // original is unchanged, shuffled is a new array
 */
export function shuffleCopy<T>(array: T[]): T[] {
  return shuffle([...array]);
}

/**
 * Pick a random element from an array
 *
 * @param array - Array to pick from
 * @returns Random element or undefined if array is empty
 */
export function pickRandom<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Pick N random elements from an array without replacement
 *
 * @param array - Array to pick from
 * @param n - Number of elements to pick
 * @returns Array of picked elements
 */
export function pickRandomN<T>(array: T[], n: number): T[] {
  if (n >= array.length) return shuffleCopy(array);
  const copy = [...array];
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}
