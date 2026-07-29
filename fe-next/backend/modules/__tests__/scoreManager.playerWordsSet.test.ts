/**
 * scoreManager - playerWordsSet O(1) lookup tests
 * TDD: RED phase — these tests must fail before the implementation
 */

import {
  addPlayerWord,
  playerHasWord,
  resetScoresForNewRound,
  addPlayerEventBonus,
  type ScoreGameBase,
} from '../scoreManager';

function makeGame(overrides: Partial<ScoreGameBase> = {}): ScoreGameBase {
  return {
    users: { alice: { username: 'alice', isHost: false, isBot: false } as any },
    playerScores: { alice: 0 },
    playerWords: { alice: [] },
    playerWordDetails: { alice: [] },
    playerAchievements: { alice: [] },
    playerCombos: { alice: 0 },
    firstWordFound: false,
    firstFinderMap: {},
    ...overrides,
  };
}

describe('scoreManager - playerWordsSet (O(1) lookup)', () => {
  describe('addPlayerWord - Set maintenance', () => {
    it('should create playerWordsSet on game if missing and add word', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'hello');
      expect((game as any).playerWordsSet).toBeDefined();
      expect((game as any).playerWordsSet['alice']).toBeInstanceOf(Set);
      expect((game as any).playerWordsSet['alice'].has('hello')).toBe(true);
    });

    it('should add normalized (lowercase) word to the Set', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'HELLO');
      expect((game as any).playerWordsSet['alice'].has('hello')).toBe(true);
    });

    it('should not add duplicate word to the Set', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'hello');
      addPlayerWord(game, 'alice', 'hello');
      expect((game as any).playerWordsSet['alice'].size).toBe(1);
    });

    it('should initialize Set for a new user on first word add', () => {
      const game = makeGame();
      addPlayerWord(game, 'bob', 'world');
      expect((game as any).playerWordsSet['bob']).toBeInstanceOf(Set);
      expect((game as any).playerWordsSet['bob'].has('world')).toBe(true);
    });

    it('should keep Set in sync with playerWords array', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'cat');
      addPlayerWord(game, 'alice', 'dog');
      addPlayerWord(game, 'alice', 'bird');
      const set = (game as any).playerWordsSet['alice'] as Set<string>;
      expect(set.size).toBe(game.playerWords['alice'].length);
      for (const w of game.playerWords['alice']) {
        expect(set.has(w)).toBe(true);
      }
    });
  });

  describe('playerHasWord - uses Set for O(1) lookup', () => {
    it('should return true when word is in the Set', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'hello');
      expect(playerHasWord(game, 'alice', 'hello')).toBe(true);
    });

    it('should return false when word is not in the Set', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'hello');
      expect(playerHasWord(game, 'alice', 'world')).toBe(false);
    });

    it('should be case-insensitive', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'hello');
      expect(playerHasWord(game, 'alice', 'HELLO')).toBe(true);
    });

    it('should return false for empty playerWordsSet', () => {
      const game = makeGame();
      expect(playerHasWord(game, 'alice', 'hello')).toBe(false);
    });

    it('should use Set.has() - Set on game should contain queried word', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'test');
      // Manually verify Set is present and correctly populated
      const set = (game as any).playerWordsSet?.['alice'] as Set<string>;
      expect(set).toBeDefined();
      expect(set.has('test')).toBe(true);
      expect(playerHasWord(game, 'alice', 'test')).toBe(true);
    });

    it('should work when playerWordsSet does not exist (fallback to array)', () => {
      // Game without Set — backward compatibility
      const game = makeGame();
      game.playerWords['alice'] = ['fallback'];
      // No playerWordsSet set — should still return true via array fallback
      expect(playerHasWord(game, 'alice', 'fallback')).toBe(true);
    });
  });

  describe('resetScoresForNewRound - clears playerWordsSet', () => {
    it('should clear playerWordsSet entries on reset', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'hello');
      expect((game as any).playerWordsSet['alice'].size).toBe(1);

      resetScoresForNewRound(game);

      // After reset, all words cleared
      const set = (game as any).playerWordsSet?.['alice'];
      if (set) {
        expect(set.size).toBe(0);
      } else {
        // playerWordsSet re-initialized as empty sets per user in users
        expect(game.playerWords['alice']).toEqual([]);
      }
    });

    it('should initialize empty Sets for each user after reset', () => {
      const game = makeGame();
      addPlayerWord(game, 'alice', 'hello');
      resetScoresForNewRound(game);

      // playerWordsSet should exist with empty set for alice
      expect((game as any).playerWordsSet).toBeDefined();
      expect((game as any).playerWordsSet['alice']).toBeInstanceOf(Set);
      expect((game as any).playerWordsSet['alice'].size).toBe(0);
    });
  });

  describe('addPlayerEventBonus / round reset', () => {
    it('accumulates event bonuses per player', () => {
      const game = makeGame();
      addPlayerEventBonus(game, 'alice', 5);
      addPlayerEventBonus(game, 'alice', 3);
      expect(game.playerEventBonuses?.['alice']).toBe(8);
    });

    it('ignores zero/undefined amounts (no Redis-thrash, no NaN)', () => {
      const game = makeGame();
      addPlayerEventBonus(game, 'alice', 0);
      expect(game.playerEventBonuses?.['alice']).toBeUndefined();
    });

    it('clears playerEventBonuses on a new round so bonuses do not bleed across rounds', () => {
      const game = makeGame();
      addPlayerEventBonus(game, 'alice', 12);
      expect(game.playerEventBonuses?.['alice']).toBe(12);

      resetScoresForNewRound(game);

      expect(game.playerEventBonuses?.['alice']).toBeFalsy();
    });
  });
});
