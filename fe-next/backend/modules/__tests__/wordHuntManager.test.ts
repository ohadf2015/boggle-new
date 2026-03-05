/**
 * Word Hunt Manager Tests
 * Tests for target word selection, Wordle-style feedback, life drain,
 * first finder bonus, life restoration, wrong guess penalties,
 * and all-players-eliminated check
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
  areAllPlayersEliminated,
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
});
