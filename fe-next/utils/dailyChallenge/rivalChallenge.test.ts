import { describe, it, expect } from 'vitest';
import { parseRivalFromParams } from './rivalChallenge';

describe('parseRivalFromParams', () => {
  it('should parse valid rival challenge params', () => {
    const result = parseRivalFromParams({
      whName: 'Alice',
      whEmoji: '🎯',
      whScore: '250',
      whPuzzle: '42',
    }, 42);

    expect(result).toEqual({
      name: 'Alice',
      emoji: '🎯',
      score: 250,
      puzzleNumber: 42,
    });
  });

  it('should return null for missing required params', () => {
    const result = parseRivalFromParams({
      whName: 'Alice',
      whEmoji: '🎯',
      // whScore missing
      whPuzzle: '42',
    }, 42);

    expect(result).toBeNull();
  });

  it('should return null when puzzle number is stale (not today)', () => {
    const result = parseRivalFromParams({
      whName: 'Alice',
      whEmoji: '🎯',
      whScore: '250',
      whPuzzle: '41', // yesterday's puzzle
    }, 42); // today's puzzle

    expect(result).toBeNull();
  });

  it('should handle non-numeric score gracefully', () => {
    const result = parseRivalFromParams({
      whName: 'Alice',
      whEmoji: '🎯',
      whScore: 'invalid',
      whPuzzle: '42',
    }, 42);

    expect(result).toBeNull();
  });

  it('should handle non-numeric puzzle number gracefully', () => {
    const result = parseRivalFromParams({
      whName: 'Alice',
      whEmoji: '🎯',
      whScore: '250',
      whPuzzle: 'invalid',
    }, 42);

    expect(result).toBeNull();
  });

  it('should handle empty name as valid', () => {
    const result = parseRivalFromParams({
      whName: '',
      whEmoji: '🎯',
      whScore: '250',
      whPuzzle: '42',
    }, 42);

    expect(result).toEqual({
      name: '',
      emoji: '🎯',
      score: 250,
      puzzleNumber: 42,
    });
  });

  it('should handle zero score', () => {
    const result = parseRivalFromParams({
      whName: 'Alice',
      whEmoji: '🎯',
      whScore: '0',
      whPuzzle: '42',
    }, 42);

    expect(result).toEqual({
      name: 'Alice',
      emoji: '🎯',
      score: 0,
      puzzleNumber: 42,
    });
  });
});
