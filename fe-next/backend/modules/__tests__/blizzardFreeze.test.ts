import { describe, it, expect } from 'vitest';
import { wordBlockedByBlizzardSync } from '../blizzardFreeze';
import type { GameState } from '../gameState/types';

const grid = [['c', 'a'], ['t', 'x']];
const game = (overrides: Record<string, unknown>) =>
  ({ letterGrid: grid, language: 'en', activeRoundEvent: 'blizzard', frozenTiles: [{ row: 0, col: 1 }], ...overrides }) as unknown as GameState;

describe('wordBlockedByBlizzardSync', () => {
  it('blocks a word whose only path crosses a frozen tile', () => {
    expect(wordBlockedByBlizzardSync(game({}), 'cat')).toBe(true);
  });

  it('allows a word that avoids the frozen tiles', () => {
    expect(wordBlockedByBlizzardSync(game({ frozenTiles: [{ row: 1, col: 1 }] }), 'cat')).toBe(false);
  });

  it('blocks nothing outside a blizzard', () => {
    expect(wordBlockedByBlizzardSync(game({ activeRoundEvent: null }), 'cat')).toBe(false);
    expect(wordBlockedByBlizzardSync(undefined, 'cat')).toBe(false);
  });
});
