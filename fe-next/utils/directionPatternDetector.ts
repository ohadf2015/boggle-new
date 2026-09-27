/**
 * Direction Pattern Detector
 *
 * Analyzes word paths on the grid to detect if players are only using
 * simple straight-line directions (horizontal, vertical, or diagonal)
 * without combining directions in a single word.
 *
 * Used to show guidance when players might not realize they can
 * change directions mid-word (e.g., right → down → diagonal).
 */

import type { GridPosition } from '@/types';

export type DirectionType =
  | 'horizontal' // Only left-right movement
  | 'vertical' // Only up-down movement
  | 'diagonal' // Only diagonal movement (same slope)
  | 'mixed' // Direction changes within the word
  | 'single'; // Single cell (no direction)

interface DirectionVector {
  dx: number; // Column difference (-1, 0, or 1)
  dy: number; // Row difference (-1, 0, or 1)
}

/**
 * Get the direction vector between two adjacent cells
 */
function getDirectionVector(
  from: GridPosition,
  to: GridPosition
): DirectionVector {
  return {
    dx: Math.sign(to.col - from.col),
    dy: Math.sign(to.row - from.row),
  };
}

/**
 * Check if two direction vectors represent the same direction type
 * (not necessarily the same direction, but same category)
 */
function isSameDirectionType(
  v1: DirectionVector,
  v2: DirectionVector
): boolean {
  // Both horizontal (no vertical movement)
  if (v1.dy === 0 && v2.dy === 0) return true;

  // Both vertical (no horizontal movement)
  if (v1.dx === 0 && v2.dx === 0) return true;

  // Both diagonal (both have horizontal AND vertical movement)
  if (v1.dx !== 0 && v1.dy !== 0 && v2.dx !== 0 && v2.dy !== 0) return true;

  return false;
}

/**
 * Analyze a word path and determine the direction type
 *
 * @param cells - Array of grid positions representing the word path
 * @returns The direction type of the path
 */
export function analyzePathDirection(cells: GridPosition[]): DirectionType {
  // Single cell or empty - no direction
  if (cells.length <= 1) return 'single';

  // Get all direction vectors between consecutive cells
  const vectors: DirectionVector[] = [];
  for (let i = 0; i < cells.length - 1; i++) {
    const from = cells[i];
    const to = cells[i + 1];
    if (from && to) {
      vectors.push(getDirectionVector(from, to));
    }
  }

  if (vectors.length === 0) return 'single';

  // Check if all vectors are the same direction type
  const firstVector = vectors[0];
  if (!firstVector) return 'single';

  const allSameType = vectors.every((v) => isSameDirectionType(v, firstVector));

  if (!allSameType) return 'mixed';

  // Determine the specific type based on the first vector
  if (firstVector.dy === 0) return 'horizontal';
  if (firstVector.dx === 0) return 'vertical';
  return 'diagonal';
}

/**
 * Check if a path uses only simple straight-line directions
 * (no direction changes within the word)
 *
 * @param cells - Array of grid positions representing the word path
 * @returns true if the path is a simple straight line
 */
export function isSimpleDirectionPath(cells: GridPosition[]): boolean {
  const direction = analyzePathDirection(cells);
  return direction !== 'mixed' && direction !== 'single';
}

/**
 * Check if a path has direction changes (mixed directions)
 *
 * @param cells - Array of grid positions representing the word path
 * @returns true if the path changes direction at least once
 */
export function hasDirectionChange(cells: GridPosition[]): boolean {
  return analyzePathDirection(cells) === 'mixed';
}

/**
 * Get a human-readable description of the direction type
 * Used for debugging and analytics
 */
export function getDirectionDescription(type: DirectionType): string {
  switch (type) {
    case 'horizontal':
      return 'Horizontal (left-right)';
    case 'vertical':
      return 'Vertical (up-down)';
    case 'diagonal':
      return 'Diagonal';
    case 'mixed':
      return 'Mixed (direction changes)';
    case 'single':
      return 'Single cell';
  }
}
