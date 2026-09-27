/**
 * Tests for Achievement Manager
 * Focuses on lifetime achievements that were previously impossible to earn
 */

import {
  checkLifetimeAchievements,
  LIFETIME_ACHIEVEMENT_THRESHOLDS,
  checkLiveAchievements,
  awardFinalAchievements,
  ACHIEVEMENT_ICONS,
  type UserStats,
} from '../achievementManager';
import type { Game, WordDetail } from '@/shared/types/game';

type GameStub = Partial<Game> & {
  playerCombos?: Record<string, number>;
  startTime?: number;
  gameDuration?: number;
};

function buildGame(overrides: GameStub = {}): Game {
  return {
    minWordLength: 2,
    playerAchievements: {},
    playerWordDetails: {},
    users: {},
    ...overrides,
  } as Game;
}

describe('checkLifetimeAchievements', () => {
  describe('games played achievements', () => {
    it('should award VETERAN at 50 games', () => {
      const stats: UserStats = { gamesPlayed: 50 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'VETERAN' })
      );
    });

    it('should award CENTURION at 100 games', () => {
      const stats: UserStats = { gamesPlayed: 100 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CENTURION' })
      );
    });

    it('should not award VETERAN at 49 games', () => {
      const stats: UserStats = { gamesPlayed: 49 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).not.toContainEqual(
        expect.objectContaining({ key: 'VETERAN' })
      );
    });

    it('should award both VETERAN and CENTURION at 100 games if neither exists', () => {
      const stats: UserStats = { gamesPlayed: 100 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'VETERAN' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CENTURION' })
      );
    });
  });

  describe('words found achievements', () => {
    it('should award WORD_COLLECTOR at 1000 words', () => {
      const stats: UserStats = { totalWordsFound: 1000 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'WORD_COLLECTOR' })
      );
    });

    it('should award WORD_HOARDER at 5000 words', () => {
      const stats: UserStats = { totalWordsFound: 5000 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'WORD_HOARDER' })
      );
    });
  });

  describe('games won achievements', () => {
    it('should award CHAMPION at 25 wins', () => {
      const stats: UserStats = { gamesWon: 25 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CHAMPION' })
      );
    });

    it('should award LEGEND at 100 wins', () => {
      const stats: UserStats = { gamesWon: 100 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'LEGEND' })
      );
    });
  });

  describe('total score achievements', () => {
    it('should award POINT_MASTER at 10000 points', () => {
      const stats: UserStats = { totalScore: 10000 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'POINT_MASTER' })
      );
    });

    it('should award POINT_KING at 50000 points', () => {
      const stats: UserStats = { totalScore: 50000 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'POINT_KING' })
      );
    });
  });

  describe('unique days played achievements', () => {
    it('should award DEDICATION at 7 unique days', () => {
      const stats: UserStats = { uniqueDaysPlayed: 7 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'DEDICATION' })
      );
    });

    it('should award LOYAL_PLAYER at 30 unique days', () => {
      const stats: UserStats = { uniqueDaysPlayed: 30 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'LOYAL_PLAYER' })
      );
    });

    it('should not award DEDICATION at 6 unique days', () => {
      const stats: UserStats = { uniqueDaysPlayed: 6 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      expect(newAchievements).not.toContainEqual(
        expect.objectContaining({ key: 'DEDICATION' })
      );
    });
  });

  describe('existing achievements handling', () => {
    it('should not re-award achievements that already exist', () => {
      const stats: UserStats = { gamesPlayed: 100 };
      const existingAchievements = ['VETERAN', 'CENTURION'];
      const newAchievements = checkLifetimeAchievements(stats, existingAchievements);

      expect(newAchievements).toHaveLength(0);
    });

    it('should only award achievements not in existing list', () => {
      const stats: UserStats = { gamesPlayed: 100 };
      const existingAchievements = ['VETERAN'];
      const newAchievements = checkLifetimeAchievements(stats, existingAchievements);

      expect(newAchievements).toHaveLength(1);
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CENTURION' })
      );
    });
  });

  describe('multiple achievements at once', () => {
    it('should award multiple lifetime achievements when thresholds are met', () => {
      const stats: UserStats = {
        gamesPlayed: 100,
        gamesWon: 25,
        totalWordsFound: 1000,
        totalScore: 10000,
        uniqueDaysPlayed: 7,
      };
      const newAchievements = checkLifetimeAchievements(stats, []);

      // Should get VETERAN, CENTURION, CHAMPION, WORD_COLLECTOR, POINT_MASTER, DEDICATION
      expect(newAchievements.length).toBeGreaterThanOrEqual(6);
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'VETERAN' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CENTURION' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'CHAMPION' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'WORD_COLLECTOR' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'POINT_MASTER' })
      );
      expect(newAchievements).toContainEqual(
        expect.objectContaining({ key: 'DEDICATION' })
      );
    });
  });

  describe('achievement icons', () => {
    it('should include correct icons with achievements', () => {
      const stats: UserStats = { gamesPlayed: 50 };
      const newAchievements = checkLifetimeAchievements(stats, []);

      const veteran = newAchievements.find(a => a.key === 'VETERAN');
      expect(veteran?.icon).toBe('🎖️');
    });
  });
});

describe('checkLiveAchievements — new achievements', () => {
  describe('EARLY_BIRD', () => {
    it('awards on first valid word within 2 seconds', () => {
      const game = buildGame({
        playerWordDetails: {
          alice: [{ word: 'cat', validated: true, timeSinceStart: 1.5 } as WordDetail],
        },
      });

      const result = checkLiveAchievements(game, 'alice', 'cat', 1.5);

      expect(result).toContainEqual(expect.objectContaining({ key: 'EARLY_BIRD' }));
    });

    it('does not award after 2 seconds', () => {
      const game = buildGame({
        playerWordDetails: {
          alice: [{ word: 'cat', validated: true, timeSinceStart: 2.5 } as WordDetail],
        },
      });

      const result = checkLiveAchievements(game, 'alice', 'cat', 2.5);

      expect(result).not.toContainEqual(expect.objectContaining({ key: 'EARLY_BIRD' }));
    });

    it('does not double-award', () => {
      const game = buildGame({
        playerAchievements: { alice: ['EARLY_BIRD'] },
        playerWordDetails: {
          alice: [{ word: 'cat', validated: true, timeSinceStart: 1.5 } as WordDetail],
        },
      });

      const result = checkLiveAchievements(game, 'alice', 'cat', 1.5);

      expect(result).not.toContainEqual(expect.objectContaining({ key: 'EARLY_BIRD' }));
    });
  });

  describe('PALINDROME_HUNTER', () => {
    it('awards when player submits a palindrome of 4+ letters', () => {
      const game = buildGame({
        playerWordDetails: {
          alice: [{ word: 'level', validated: true, timeSinceStart: 5 } as WordDetail],
        },
      });

      const result = checkLiveAchievements(game, 'alice', 'level', 5);

      expect(result).toContainEqual(expect.objectContaining({ key: 'PALINDROME_HUNTER' }));
    });

    it('rejects 3-letter palindromes', () => {
      const game = buildGame({
        playerWordDetails: {
          alice: [{ word: 'pop', validated: true, timeSinceStart: 5 } as WordDetail],
        },
      });

      const result = checkLiveAchievements(game, 'alice', 'pop', 5);

      expect(result).not.toContainEqual(expect.objectContaining({ key: 'PALINDROME_HUNTER' }));
    });

    it('rejects non-palindromes', () => {
      const game = buildGame({
        playerWordDetails: {
          alice: [{ word: 'hello', validated: true, timeSinceStart: 5 } as WordDetail],
        },
      });

      const result = checkLiveAchievements(game, 'alice', 'hello', 5);

      expect(result).not.toContainEqual(expect.objectContaining({ key: 'PALINDROME_HUNTER' }));
    });

    it('does not award when word is invalid', () => {
      const game = buildGame({
        playerWordDetails: {
          alice: [{ word: 'level', validated: false, timeSinceStart: 5 } as WordDetail],
        },
      });

      const result = checkLiveAchievements(game, 'alice', 'level', 5);

      expect(result).not.toContainEqual(expect.objectContaining({ key: 'PALINDROME_HUNTER' }));
    });
  });

  it('all new achievements have icons defined', () => {
    expect(ACHIEVEMENT_ICONS.EARLY_BIRD).toBeDefined();
    expect(ACHIEVEMENT_ICONS.PALINDROME_HUNTER).toBeDefined();
    expect(ACHIEVEMENT_ICONS.COMEBACK_CHAMPION).toBeDefined();
    expect(ACHIEVEMENT_ICONS.FIRST_GAME_WIN).toBeDefined();
  });
});

describe('awardFinalAchievements — COMEBACK_CHAMPION', () => {
  it('awards player who scored last among humans but had highest single-word score in last 25% of game', () => {
    const game = buildGame({
      gameDuration: 180,
      playerWordDetails: {
        alice: [
          { word: 'cat', validated: true, timeSinceStart: 10 } as WordDetail,
        ],
        bob: [
          { word: 'doghouse', validated: true, timeSinceStart: 160 } as WordDetail,
          { word: 'hello', validated: true, timeSinceStart: 165 } as WordDetail,
          { word: 'world', validated: true, timeSinceStart: 170 } as WordDetail,
        ],
      },
      users: {
        alice: { isBot: false } as Game['users'][string],
        bob: { isBot: false } as Game['users'][string],
      },
    });

    awardFinalAchievements(game, ['alice', 'bob']);

    expect(game.playerAchievements!.bob).toContain('COMEBACK_CHAMPION');
    expect(game.playerAchievements!.alice).not.toContain('COMEBACK_CHAMPION');
  });

  it('does not award in solo games', () => {
    const game = buildGame({
      gameDuration: 180,
      playerWordDetails: {
        alice: [
          { word: 'doghouse', validated: true, timeSinceStart: 170 } as WordDetail,
        ],
      },
      users: { alice: { isBot: false } as Game['users'][string] },
    });

    awardFinalAchievements(game, ['alice']);

    expect(game.playerAchievements!.alice ?? []).not.toContain('COMEBACK_CHAMPION');
  });
});

describe('awardFinalAchievements — defensive guards', () => {
  it('does not throw when game.playerWordDetails is undefined (Sentry NEXTJS-13X)', () => {
    const game = buildGame({
      gameDuration: 180,
      users: { Player739: { isBot: false } as Game['users'][string] },
    });
    delete (game as Partial<Game>).playerWordDetails;

    expect(() => awardFinalAchievements(game, ['Player739'])).not.toThrow();
    expect(game.playerWordDetails).toEqual({});
  });

  it('does not throw when game.users is undefined', () => {
    const game = buildGame({
      gameDuration: 180,
      playerWordDetails: { Player1: [] },
    });
    delete (game as Partial<Game>).users;

    expect(() => awardFinalAchievements(game, ['Player1'])).not.toThrow();
  });
});

describe('checkLifetimeAchievements — FIRST_GAME_WIN', () => {
  it('awards FIRST_GAME_WIN on first win', () => {
    const stats: UserStats = { gamesWon: 1, gamesPlayed: 1 };
    const result = checkLifetimeAchievements(stats, []);

    expect(result).toContainEqual(expect.objectContaining({ key: 'FIRST_GAME_WIN' }));
  });

  it('does not award FIRST_GAME_WIN at 0 wins', () => {
    const stats: UserStats = { gamesWon: 0 };
    const result = checkLifetimeAchievements(stats, []);

    expect(result).not.toContainEqual(expect.objectContaining({ key: 'FIRST_GAME_WIN' }));
  });

  it('does not re-award FIRST_GAME_WIN once earned', () => {
    const stats: UserStats = { gamesWon: 5 };
    const result = checkLifetimeAchievements(stats, ['FIRST_GAME_WIN']);

    expect(result).not.toContainEqual(expect.objectContaining({ key: 'FIRST_GAME_WIN' }));
  });
});

describe('LIFETIME_ACHIEVEMENT_THRESHOLDS', () => {
  it('should have correct thresholds for all lifetime achievements', () => {
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.VETERAN).toEqual({
      stat: 'gamesPlayed',
      threshold: 50,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.CENTURION).toEqual({
      stat: 'gamesPlayed',
      threshold: 100,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.WORD_COLLECTOR).toEqual({
      stat: 'totalWordsFound',
      threshold: 1000,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.WORD_HOARDER).toEqual({
      stat: 'totalWordsFound',
      threshold: 5000,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.CHAMPION).toEqual({
      stat: 'gamesWon',
      threshold: 25,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.LEGEND).toEqual({
      stat: 'gamesWon',
      threshold: 100,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.POINT_MASTER).toEqual({
      stat: 'totalScore',
      threshold: 10000,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.POINT_KING).toEqual({
      stat: 'totalScore',
      threshold: 50000,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.DEDICATION).toEqual({
      stat: 'uniqueDaysPlayed',
      threshold: 7,
    });
    expect(LIFETIME_ACHIEVEMENT_THRESHOLDS.LOYAL_PLAYER).toEqual({
      stat: 'uniqueDaysPlayed',
      threshold: 30,
    });
  });
});

describe('checkLiveAchievements — rare word feats', () => {
  function liveResult(word: string, validated = true) {
    const game = buildGame({
      playerWordDetails: {
        alice: [{ word, validated, timeSinceStart: 5 } as WordDetail],
      },
    });
    return checkLiveAchievements(game, 'alice', word, 5);
  }

  it('awards CONSONANT_CULT for a vowelless 4+ letter word', () => {
    expect(liveResult('rhythm')).toContainEqual(expect.objectContaining({ key: 'CONSONANT_CULT' }));
  });
  it('does not award CONSONANT_CULT for a word with a vowel', () => {
    expect(liveResult('rhyme')).not.toContainEqual(expect.objectContaining({ key: 'CONSONANT_CULT' }));
  });

  it('awards VOWEL_HOARDER for a word with all five vowels', () => {
    expect(liveResult('sequoia')).toContainEqual(expect.objectContaining({ key: 'VOWEL_HOARDER' }));
  });

  it('awards ROGUE_Q for a Q-word with no U', () => {
    expect(liveResult('qat')).toContainEqual(expect.objectContaining({ key: 'ROGUE_Q' }));
  });
  it('does not award ROGUE_Q when a U is present', () => {
    expect(liveResult('quiz')).not.toContainEqual(expect.objectContaining({ key: 'ROGUE_Q' }));
  });

  it('awards LEVIATHAN for a 12+ letter word', () => {
    expect(liveResult('spellbinding')).toContainEqual(expect.objectContaining({ key: 'LEVIATHAN' }));
  });
  it('does not award LEVIATHAN for an 11-letter word', () => {
    expect(liveResult('outstanding')).not.toContainEqual(expect.objectContaining({ key: 'LEVIATHAN' }));
  });

  it('awards NO_REPEATS for an 8+ letter isogram', () => {
    expect(liveResult('computers')).toContainEqual(expect.objectContaining({ key: 'NO_REPEATS' }));
  });
  it('does not award NO_REPEATS when a letter repeats', () => {
    expect(liveResult('balloons')).not.toContainEqual(expect.objectContaining({ key: 'NO_REPEATS' }));
  });

  it('awards none of the feats when the word is invalid', () => {
    const r = liveResult('rhythm', false);
    expect(r).not.toContainEqual(expect.objectContaining({ key: 'CONSONANT_CULT' }));
  });

  it('all rare-feat achievements have icons defined', () => {
    ['CONSONANT_CULT', 'VOWEL_HOARDER', 'ROGUE_Q', 'LEVIATHAN', 'NO_REPEATS', 'FLAWLESS_VICTORY']
      .forEach(key => expect(ACHIEVEMENT_ICONS[key]).toBeDefined());
  });
});

describe('awardFinalAchievements — FLAWLESS_VICTORY', () => {
  function tenValidWords(prefix: string): WordDetail[] {
    return Array.from({ length: 10 }, (_, i) =>
      ({ word: `${prefix}${i}`, validated: true, timeSinceStart: 10 + i } as WordDetail));
  }

  it('awards the winner who had zero invalid submissions and 10+ words', () => {
    const game = buildGame({
      gameDuration: 180,
      playerWordDetails: {
        alice: tenValidWords('catz'),
        bob: [{ word: 'dog', validated: true, timeSinceStart: 20 } as WordDetail],
      },
      users: {
        alice: { isBot: false } as Game['users'][string],
        bob: { isBot: false } as Game['users'][string],
      },
    });

    awardFinalAchievements(game, ['alice', 'bob']);

    expect(game.playerAchievements.alice).toContain('FLAWLESS_VICTORY');
  });

  it('does NOT award when the winner had an invalid submission', () => {
    const dirty = tenValidWords('catz');
    dirty.push({ word: 'zzzz', validated: false, timeSinceStart: 30 } as WordDetail);
    const game = buildGame({
      gameDuration: 180,
      playerWordDetails: {
        alice: dirty,
        bob: [{ word: 'dog', validated: true, timeSinceStart: 20 } as WordDetail],
      },
      users: {
        alice: { isBot: false } as Game['users'][string],
        bob: { isBot: false } as Game['users'][string],
      },
    });

    awardFinalAchievements(game, ['alice', 'bob']);

    expect(game.playerAchievements.alice || []).not.toContain('FLAWLESS_VICTORY');
  });
});
