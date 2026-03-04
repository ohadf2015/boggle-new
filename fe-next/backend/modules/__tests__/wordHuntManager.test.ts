/**
 * Word Hunt Manager Tests
 * Tests for target word selection, Wordle-style feedback, life drain,
 * first finder bonus, life restoration, and wrong guess penalties
 */

import {
  selectTargetWord,
  initWordHuntState,
  drainLife,
  validateTargetGuess,
  recordTargetFound,
  getLifeBonus,
  restoreLife,
  penalizeWrongGuess,
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
      // Run multiple times to check randomness stays in range
      for (let i = 0; i < 20; i++) {
        const result = selectTargetWord(words, 5, 8);
        expect(result).not.toBeNull();
        expect(result!.length).toBeGreaterThanOrEqual(5);
        expect(result!.length).toBeLessThanOrEqual(8);
      }
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
      // Bob's life should remain unchanged
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
      // o: present (exists at pos 4), l: present, l: correct, e: present, h: present
      expect(feedback[0]).toBe('present'); // o is at position 4 in target
      expect(feedback[2]).toBe('correct'); // l is correct at position 2
      expect(feedback[4]).toBe('present'); // h is at position 0 in target
    });

    it('should handle duplicate letters correctly - limit present count', () => {
      // Target: 'aabbb', Guess: 'aaxaa'
      // Position 0: a->a = correct
      // Position 1: a->a = correct
      // Position 2: x->a = absent (no more a's in target)
      // Position 3: a->b = absent (no a's remaining)
      // Position 4: a->b = absent (no a's remaining)
      const feedback = validateTargetGuess('aabbb', 'aaxaa');
      expect(feedback[0]).toBe('correct'); // a matches
      expect(feedback[1]).toBe('correct'); // a matches
      expect(feedback[2]).toBe('absent');  // x not in target
      expect(feedback[3]).toBe('absent');  // a - already accounted for
      expect(feedback[4]).toBe('absent');  // a - already accounted for
    });

    it('should handle single duplicate letter: one correct, one absent', () => {
      // Target: 'abcde', Guess: 'aaxxx'
      // a at pos 0: correct
      // a at pos 1: absent (only one 'a' in target, already matched at pos 0)
      const feedback = validateTargetGuess('abcde', 'aaxxx');
      expect(feedback[0]).toBe('correct');
      expect(feedback[1]).toBe('absent');
    });

    it('should handle present vs correct priority with duplicates', () => {
      // Target: 'abcda', Guess: 'aaxxa'
      // pos 0: a->a = correct
      // pos 1: a->b = present (there's another 'a' at pos 4)
      // pos 2: x->c = absent
      // pos 3: x->d = absent
      // pos 4: a->a = correct
      const feedback = validateTargetGuess('abcda', 'aaxxa');
      expect(feedback[0]).toBe('correct');
      expect(feedback[1]).toBe('absent'); // No more unmatched a's (both a's in target are at correct positions)
      expect(feedback[4]).toBe('correct');
    });

    it('should handle case insensitively', () => {
      // This tests that the function normalizes case
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

      const result = recordTargetFound(state, 'alice');
      expect(result.isFirstFinder).toBe(true);
      expect(result.bonus).toBe(HUNT_FIRST_FINDER_BONUS);
      expect(state.targetFoundBy).toBe('alice');
      expect(state.isFirstFinderClaimed).toBe(true);
    });

    it('should not give first finder bonus to second finder', () => {
      const state: WordHuntModeState = {
        targetWord: 'hello',
        targetWordLength: 5,
        playerLives: { alice: 50, bob: 30 },
        eliminatedPlayers: [],
        targetFoundBy: 'alice',
        isFirstFinderClaimed: true,
      };

      const result = recordTargetFound(state, 'bob');
      expect(result.isFirstFinder).toBe(false);
      expect(result.bonus).toBe(0);
    });
  });

  // ==========================================
  // getLifeBonus
  // ==========================================
  describe('getLifeBonus', () => {
    it('should return correct bonus for word lengths 3-8', () => {
      expect(getLifeBonus(3)).toBe(3);
      expect(getLifeBonus(4)).toBe(5);
      expect(getLifeBonus(5)).toBe(8);
      expect(getLifeBonus(6)).toBe(12);
      expect(getLifeBonus(7)).toBe(16);
      expect(getLifeBonus(8)).toBe(20);
    });

    it('should return max bonus for words longer than 8', () => {
      expect(getLifeBonus(9)).toBe(20);
      expect(getLifeBonus(12)).toBe(20);
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
});
