/**
 * Grid Validator Tests
 *
 * Tests for grid path validation utilities that check whether
 * words/paths of specific lengths exist on a letter grid.
 */

import { hasPathOfLength, hasWordPath } from '../gridValidator';

describe('hasPathOfLength', () => {
  it('should return true when a path of the given length exists', () => {
    // 3x3 grid - any adjacent path of length 3 should exist
    const grid = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I'],
    ];
    expect(hasPathOfLength(grid, 3)).toBe(true);
  });

  it('should return true for path length 1 on any non-empty grid', () => {
    const grid = [['A']];
    expect(hasPathOfLength(grid, 1)).toBe(true);
  });

  it('should return false when grid is too small for requested length', () => {
    // 1x1 grid cannot have a path of length 2
    const grid = [['A']];
    expect(hasPathOfLength(grid, 2)).toBe(false);
  });

  it('should return false for empty grid', () => {
    expect(hasPathOfLength([], 1)).toBe(false);
  });

  it('should find long paths using adjacency (including diagonals)', () => {
    // 4x4 grid should support paths up to length 16
    const grid = [
      ['A', 'B', 'C', 'D'],
      ['E', 'F', 'G', 'H'],
      ['I', 'J', 'K', 'L'],
      ['M', 'N', 'O', 'P'],
    ];
    // Path of length 5 should be easily found
    expect(hasPathOfLength(grid, 5)).toBe(true);
  });

  it('should return false when path length exceeds total cells', () => {
    const grid = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    // 2x2 grid has 4 cells, can't have path of length 5
    expect(hasPathOfLength(grid, 5)).toBe(false);
  });

  it('should not reuse tiles in the path', () => {
    // 2x2 grid, max non-repeating path is 4
    const grid = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    expect(hasPathOfLength(grid, 4)).toBe(true);
    expect(hasPathOfLength(grid, 5)).toBe(false);
  });
});

describe('hasWordPath', () => {
  it('should find a simple horizontal word', () => {
    // Flat grid representation: ['C','A','T','X'], gridSize=2
    // Grid:  C A
    //        T X
    // C-A-T requires C(0,0)->A(0,1)->T(1,0) — A and T are adjacent diagonally? No.
    // Actually (0,1) and (1,0) are diagonal neighbors. So C->A->T works.
    const flatGrid = ['C', 'A', 'T', 'X'];
    expect(hasWordPath(flatGrid, 2, 'CAT')).toBe(true);
  });

  it('should return false when word cannot be formed', () => {
    const flatGrid = ['A', 'B', 'C', 'D'];
    expect(hasWordPath(flatGrid, 2, 'ZZZ')).toBe(false);
  });

  it('should not reuse the same tile', () => {
    // Grid: A B
    //       C D
    // 'ABA' would require reusing A at (0,0)
    const flatGrid = ['A', 'B', 'C', 'D'];
    expect(hasWordPath(flatGrid, 2, 'ABA')).toBe(false);
  });

  it('should handle single letter words', () => {
    const flatGrid = ['A', 'B', 'C', 'D'];
    expect(hasWordPath(flatGrid, 2, 'A')).toBe(true);
    expect(hasWordPath(flatGrid, 2, 'Z')).toBe(false);
  });

  it('should be case-insensitive', () => {
    const flatGrid = ['A', 'D', 'V', 'E', 'N', 'T', 'U', 'R', 'E'];
    // 3x3 grid
    expect(hasWordPath(flatGrid, 3, 'advent')).toBe(false); // probably no valid path
    // But a simple case test:
    const simpleGrid = ['C', 'A', 'T', 'X'];
    expect(hasWordPath(simpleGrid, 2, 'cat')).toBe(true);
  });

  it('should find word using diagonal adjacency', () => {
    // Grid: A X
    //       X B
    // A(0,0) -> B(1,1) are diagonal neighbors
    const flatGrid = ['A', 'X', 'X', 'B'];
    expect(hasWordPath(flatGrid, 2, 'AB')).toBe(true);
  });

  it('should handle word longer than grid size', () => {
    // 2x2 grid, 4 cells max
    const flatGrid = ['A', 'B', 'C', 'D'];
    expect(hasWordPath(flatGrid, 2, 'ABCDE')).toBe(false);
  });

  it('should find ADVENTURE on a grid that contains it as a valid path', () => {
    // 4x4 grid with ADVENTURE embedded as adjacent path
    // A D V E
    // X X X N
    // X X T U
    // X E R X
    const flatGrid = [
      'A', 'D', 'V', 'E',
      'X', 'X', 'X', 'N',
      'X', 'X', 'T', 'U',
      'X', 'E', 'R', 'X',
    ];
    // Path: A(0,0)->D(0,1)->V(0,2)->E(0,3)->N(1,3)->T(2,2)->U(2,3)->R(3,2)->E(3,1)
    // Check adjacency: E(0,3)->N(1,3) yes, N(1,3)->T(2,2) yes (diagonal), T(2,2)->U(2,3) yes, U(2,3)->R(3,2) yes (diagonal), R(3,2)->E(3,1) yes
    expect(hasWordPath(flatGrid, 4, 'ADVENTURE')).toBe(true);
  });

  it('should return false for ADVENTURE on a grid without valid path', () => {
    // 4x4 grid with letters of ADVENTURE but not in adjacent path
    const flatGrid = [
      'A', 'X', 'X', 'D',
      'X', 'X', 'X', 'X',
      'V', 'X', 'X', 'E',
      'X', 'N', 'T', 'U',
    ];
    // A(0,0) and D(0,3) are not adjacent
    expect(hasWordPath(flatGrid, 4, 'ADVENTURE')).toBe(false);
  });
});
