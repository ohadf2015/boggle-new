/**
 * Word Hunt Manager Tests
 * Tests for target word selection, Wordle-style feedback, life drain,
 * first finder bonus, life restoration, wrong guess penalties,
 * and all-players-eliminated check
 */

import {
  selectTargetWord,
  selectTargetWordWithFallback,
  initWordHuntState,
  drainLife,
  validateTargetGuess,
  recordTargetFound,
  getLifeBonus,
  restoreLife,
  penalizeWrongGuess,
  areAllPlayersEliminated,
  computeDiscoveryClues,
  getCommonWords,
} from '../wordHuntManager';

import type { WordHuntModeState } from '@/shared/types/game';

import {
  HUNT_LIFE_DRAIN_RATE,
  HUNT_INITIAL_LIFE,
  HUNT_FIRST_FINDER_BONUS,
  HUNT_WRONG_GUESS_PENALTY,
} from '@/shared/constants/wordHuntMultiplayerConstants';

describe('wordHuntManager', () => {
  // ==========================================
  // selectTargetWord
  // ==========================================
  describe('selectTargetWord', () => {
    it('should return a word within the specified length range', () => {
      const words = ['cat', 'hello', 'world', 'elephant', 'supercalifragilistic'];
      const result = selectTargetWord(words, 5, 8);
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThanOrEqual(5);
      expect(result!.length).toBeLessThanOrEqual(8);
    });

    it('should return null if no words match the length range', () => {
      const words = ['cat', 'dog', 'hi'];
      const result = selectTargetWord(words, 5, 8);
      expect(result).toBeNull();
    });

    it('should return null for empty word list', () => {
      const result = selectTargetWord([], 5, 8);
      expect(result).toBeNull();
    });

    it('should only return words that match the length criteria', () => {
      const words = ['abcde', 'abcdef', 'abcdefgh', 'abcdefghi'];
      for (let i = 0; i < 20; i++) {
        const result = selectTargetWord(words, 5, 8);
        expect(result).not.toBeNull();
        expect(result!.length).toBeGreaterThanOrEqual(5);
        expect(result!.length).toBeLessThanOrEqual(8);
      }
    });
  });

  // ==========================================
  // selectTargetWordWithFallback
  // ==========================================
  describe('selectTargetWordWithFallback', () => {
    it('should return a word in preferred range when available', () => {
      const words = ['cat', 'hello', 'worlds', 'elephant'];
      const result = selectTargetWordWithFallback(words, 5, 8);
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThanOrEqual(5);
      expect(result!.length).toBeLessThanOrEqual(8);
    });

    it('should fall back to 4-letter words when no 5-8 letter words exist', () => {
      const words = ['cats', 'dogs', 'fish', 'hi'];
      const result = selectTargetWordWithFallback(words, 5, 8);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(4);
    });

    it('should NOT fall back to 3-letter words (minimum is 4)', () => {
      const words = ['cat', 'dog', 'hi'];
      const result = selectTargetWordWithFallback(words, 5, 8);
      expect(result).toBeNull();
    });

    it('should return null when no words of length >= 4 exist', () => {
      const words = ['hi', 'a', 'be', 'cat'];
      const result = selectTargetWordWithFallback(words, 5, 8);
      expect(result).toBeNull();
    });

    it('should return null for empty word list', () => {
      const result = selectTargetWordWithFallback([], 5, 8);
      expect(result).toBeNull();
    });
  });

  // ==========================================
  // selectTargetWord with commonOnly
  // ==========================================
  describe('selectTargetWord with commonOnly', () => {
    it('should prefer common words when commonOnly is true', () => {
      const commonWords = getCommonWords();
      // Mix of common and obscure 5-letter words
      const words = ['aalii', 'abaft', 'house', 'xeric', 'stone', 'zoeal'];
      const commonOnes = words.filter(w => commonWords.has(w));

      // If common words exist, result should be one of them
      if (commonOnes.length > 0) {
        for (let i = 0; i < 20; i++) {
          const result = selectTargetWord(words, 4, 5, true);
          expect(result).not.toBeNull();
          expect(commonOnes).toContain(result);
        }
      }
    });

    it('should fall back to any word when no common words match', () => {
      const words = ['aalii', 'abaft', 'xeric'];
      const result = selectTargetWord(words, 4, 5, true);
      // Should still return something even if none are common
      expect(result).not.toBeNull();
    });

    it('should work normally when commonOnly is false', () => {
      const words = ['aalii', 'hello'];
      const result = selectTargetWord(words, 4, 5, false);
      expect(result).not.toBeNull();
    });
  });

  // ==========================================
  // getCommonWords
  // ==========================================
  describe('getCommonWords', () => {
    it('should load common words set', () => {
      const common = getCommonWords();
      expect(common.size).toBeGreaterThan(500);
    });

    it('should contain well-known English words', () => {
      const common = getCommonWords();
      expect(common.has('house')).toBe(true);
      expect(common.has('water')).toBe(true);
      expect(common.has('game')).toBe(true);
      expect(common.has('time')).toBe(true);
    });

    it('should NOT contain obscure words', () => {
      const common = getCommonWords();
      expect(common.has('aalii')).toBe(false);
      expect(common.has('abaft')).toBe(false);
      expect(common.has('zoeal')).toBe(false);
    });
  });

  // ==========================================
  // initWordHuntState
  // ==========================================
  describe('initWordHuntState', () => {
    it('should initialize all players with HUNT_INITIAL_LIFE', () => {
      const state = initWordHuntState('hello', ['alice', 'bob']);
      expect(state.playerLives['alice']).toBe(HUNT_INITIAL_LIFE);
      expect(state.playerLives['bob']).toBe(HUNT_INITIAL_LIFE);
    });

    it('should set the target word and its length', () => {
      const state = initWordHuntState('world', ['alice']);
      expect(state.targetWord).toBe('world');
      expect(state.targetWordLength).toBe(5);
    });

    it('should start with empty eliminated list', () => {
      const state = initWordHuntState('hello', ['alice', 'bob']);
      expect(state.eliminatedPlayers).toEqual([]);
    });

    it('should start with no target found', () => {
      const state = initWordHuntState('hello', ['alice']);
      expect(state.targetFoundBy).toBeNull();
      expect(state.isFirstFinderClaimed).toBe(false);
    });
  });

  // ==========================================
  // drainLife
  // ==========================================
  describe('drainLife', () => {
    it('should subtract HUNT_LIFE_DRAIN_RATE from each non-eliminated player', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50, bob: 30 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      const result = drainLife(state);
      expect(result.updatedLives['alice']).toBe(50 - HUNT_LIFE_DRAIN_RATE);
      expect(result.updatedLives['bob']).toBe(30 - HUNT_LIFE_DRAIN_RATE);
      expect(result.newlyEliminated).toEqual([]);
    });

    it('should eliminate players whose life drops to 0 or below', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50, bob: 1 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      const result = drainLife(state);
      expect(result.newlyEliminated).toContain('bob');
      expect(result.updatedLives['bob']).toBeLessThanOrEqual(0);
    });

    it('should clamp eliminated player life at 0 (not negative)', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50, bob: 0.5 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      const result = drainLife(state);
      expect(result.newlyEliminated).toContain('bob');
      // Life should be clamped at 0, not negative
      expect(result.updatedLives['bob']).toBe(0);
    });

    it('should not drain life from already eliminated players', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50, bob: 0 },
        eliminatedPlayers: ['bob'],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      const result = drainLife(state);
      expect(result.updatedLives['alice']).toBe(50 - HUNT_LIFE_DRAIN_RATE);
      expect(result.updatedLives['bob']).toBe(0);
      expect(result.newlyEliminated).toEqual([]);
    });
  });

  // ==========================================
  // validateTargetGuess (Wordle-style feedback)
  // ==========================================
  describe('validateTargetGuess', () => {
    it('should return all correct for exact match', () => {
      const feedback = validateTargetGuess('hello', 'hello');
      expect(feedback).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    });

    it('should return all absent for completely wrong guess', () => {
      const feedback = validateTargetGuess('hello', 'xxxxx');
      expect(feedback).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
    });

    it('should mark present letters that exist elsewhere', () => {
      const feedback = validateTargetGuess('hello', 'olleh');
      expect(feedback[0]).toBe('present');
      expect(feedback[2]).toBe('correct');
      expect(feedback[4]).toBe('present');
    });

    it('should handle duplicate letters correctly - limit present count', () => {
      const feedback = validateTargetGuess('aabbb', 'aaxaa');
      expect(feedback[0]).toBe('correct');
      expect(feedback[1]).toBe('correct');
      expect(feedback[2]).toBe('absent');
      expect(feedback[3]).toBe('absent');
      expect(feedback[4]).toBe('absent');
    });

    it('should handle single duplicate letter: one correct, one absent', () => {
      const feedback = validateTargetGuess('abcde', 'aaxxx');
      expect(feedback[0]).toBe('correct');
      expect(feedback[1]).toBe('absent');
    });

    it('should handle present vs correct priority with duplicates', () => {
      const feedback = validateTargetGuess('abcda', 'aaxxa');
      expect(feedback[0]).toBe('correct');
      expect(feedback[1]).toBe('absent');
      expect(feedback[4]).toBe('correct');
    });

    it('should handle case insensitively', () => {
      const feedback = validateTargetGuess('HELLO', 'hello');
      expect(feedback).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    });
  });

  // ==========================================
  // recordTargetFound
  // ==========================================
  describe('recordTargetFound', () => {
    it('should mark first finder with bonus', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50, bob: 30 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      // attempts=3 → efficiency bonus 60, finder bonus 20 → total 80
      const result = recordTargetFound(state, 'alice', 3);
      expect(result.isFirstFinder).toBe(true);
      expect(result.finderBonus).toBe(HUNT_FIRST_FINDER_BONUS);
      expect(result.efficiencyBonus).toBe(60);
      expect(result.bonus).toBe(HUNT_FIRST_FINDER_BONUS + 60);
      expect(state.targetFoundBy).toBe('alice');
      expect(state.isFirstFinderClaimed).toBe(true);
    });

    it('should give decreasing finder bonus to second finder', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50, bob: 30 },
        eliminatedPlayers: [],
        targetFoundBy: 'alice',
        isFirstFinderClaimed: true,
        finderCount: 1,
      };

      const result = recordTargetFound(state, 'bob', 5);
      expect(result.isFirstFinder).toBe(false);
      expect(result.finderBonus).toBe(12); // 2nd finder bonus
      expect(result.efficiencyBonus).toBe(22); // 5 attempts
      expect(result.bonus).toBe(34);
    });

    it('rewards a guess-1 solver the most via the efficiency bonus', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 100 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
        playerAttempts: { alice: 1 },
      };
      // reads state.playerAttempts when no explicit attempts passed
      const result = recordTargetFound(state, 'alice');
      expect(result.attempts).toBe(1);
      expect(result.efficiencyBonus).toBe(140);
      expect(result.bonus).toBe(HUNT_FIRST_FINDER_BONUS + 140);
    });
  });

  // ==========================================
  // getLifeBonus
  // ==========================================
  describe('getLifeBonus', () => {
    it('should return correct bonus for word lengths 3-8', () => {
      expect(getLifeBonus(3)).toBe(5);
      expect(getLifeBonus(4)).toBe(8);
      expect(getLifeBonus(5)).toBe(12);
      expect(getLifeBonus(6)).toBe(18);
      expect(getLifeBonus(7)).toBe(24);
      expect(getLifeBonus(8)).toBe(30);
    });

    it('should return max bonus for words longer than 8', () => {
      expect(getLifeBonus(9)).toBe(30);
      expect(getLifeBonus(12)).toBe(30);
    });

    it('should return fallback bonus for very short words', () => {
      expect(getLifeBonus(2)).toBe(2);
      expect(getLifeBonus(1)).toBe(2);
    });
  });

  // ==========================================
  // restoreLife
  // ==========================================
  describe('restoreLife', () => {
    it('should add life to the player', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      const newLife = restoreLife(state, 'alice', 10);
      expect(newLife).toBe(60);
      expect(state.playerLives['alice']).toBe(60);
    });

    it('should cap life at HUNT_INITIAL_LIFE', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 95 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      const newLife = restoreLife(state, 'alice', 20);
      expect(newLife).toBe(HUNT_INITIAL_LIFE);
      expect(state.playerLives['alice']).toBe(HUNT_INITIAL_LIFE);
    });
  });

  // ==========================================
  // penalizeWrongGuess
  // ==========================================
  describe('penalizeWrongGuess', () => {
    it('should subtract HUNT_WRONG_GUESS_PENALTY from player life', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      const result = penalizeWrongGuess(state, 'alice');
      expect(result.livesRemaining).toBe(50 - HUNT_WRONG_GUESS_PENALTY);
      expect(result.eliminated).toBe(false);
    });

    it('should eliminate player if life drops to 0 or below', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 3 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      const result = penalizeWrongGuess(state, 'alice');
      expect(result.livesRemaining).toBeLessThanOrEqual(0);
      expect(result.eliminated).toBe(true);
      expect(state.eliminatedPlayers).toContain('alice');
    });
  });

  // ==========================================
  // areAllPlayersEliminated
  // ==========================================
  describe('areAllPlayersEliminated', () => {
    it('should return true when all players are eliminated', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 0, bob: 0 },
        eliminatedPlayers: ['alice', 'bob'],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      expect(areAllPlayersEliminated(state)).toBe(true);
    });

    it('should return false when some players are still alive', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50, bob: 0 },
        eliminatedPlayers: ['bob'],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      expect(areAllPlayersEliminated(state)).toBe(false);
    });

    it('should return false when no players are eliminated', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 100, bob: 100 },
        eliminatedPlayers: [],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      expect(areAllPlayersEliminated(state)).toBe(false);
    });

    it('should handle single-player game', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 0 },
        eliminatedPlayers: ['alice'],
        targetFoundBy: null,
        isFirstFinderClaimed: false,
      };

      expect(areAllPlayersEliminated(state)).toBe(true);
    });
  });

  // ==========================================
  // computeDiscoveryClues
  // ==========================================
  describe('computeDiscoveryClues', () => {
    it('should return green positions for matching letters at same position', () => {
      const result = computeDiscoveryClues('piano', 'plant');
      // p=p at 0, a=a at 2, n=n at 3
      expect(result.greenPositions).toEqual([
        { position: 0, letter: 'p' },
        { position: 2, letter: 'a' },
        { position: 3, letter: 'n' },
      ]);
    });

    it('should return multiple green positions', () => {
      const result = computeDiscoveryClues('hello', 'helps');
      expect(result.greenPositions).toEqual([
        { position: 0, letter: 'h' },
        { position: 1, letter: 'e' },
        { position: 2, letter: 'l' },
      ]);
    });

    it('should return known letters for present-but-wrong-position', () => {
      // target: 'piano', word: 'inept'
      // pos 0: i vs p — not green, but 'i' in piano → known
      // pos 1: n vs i — not green, but 'n' in piano → known
      const result = computeDiscoveryClues('piano', 'inept');
      expect(result.knownLetters).toContain('i');
      expect(result.knownLetters).toContain('n');
    });

    it('should not include green-matched letters in knownLetters', () => {
      // 'h' is at position 0 in both — green, not known
      const result = computeDiscoveryClues('hello', 'happy');
      expect(result.greenPositions).toEqual([{ position: 0, letter: 'h' }]);
      expect(result.knownLetters).not.toContain('h');
    });

    it('should handle shorter discovered word than target', () => {
      const result = computeDiscoveryClues('piano', 'pin');
      // pos 0: p=p → green, pos 1: i=i → green, pos 2: n vs a → no
      expect(result.greenPositions).toEqual([
        { position: 0, letter: 'p' },
        { position: 1, letter: 'i' },
      ]);
    });

    it('should handle no matches', () => {
      const result = computeDiscoveryClues('piano', 'drums');
      expect(result.greenPositions).toEqual([]);
      expect(result.knownLetters).toEqual([]);
    });

    it('should be case insensitive', () => {
      const result = computeDiscoveryClues('PIANO', 'PLANT');
      // pos 0: p=p → green. Also 'a' at pos 2 in 'plant' vs 'a' at pos 2 in 'piano' → green
      expect(result.greenPositions).toContainEqual({ position: 0, letter: 'p' });
    });
  });
});
