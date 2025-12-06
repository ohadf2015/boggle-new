/**
 * Tests for useGameState hook
 */

import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

describe('useGameState', () => {
  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.gameActive).toBe(false);
      expect(result.current.letterGrid).toBeNull();
      expect(result.current.remainingTime).toBeNull();
      expect(result.current.gameLanguage).toBeNull();
      expect(result.current.minWordLength).toBe(2);
      expect(result.current.players).toEqual([]);
      expect(result.current.leaderboard).toEqual([]);
      expect(result.current.foundWords).toEqual([]);
      expect(result.current.achievements).toEqual([]);
      expect(result.current.waitingForResults).toBe(false);
      expect(result.current.showStartAnimation).toBe(false);
      expect(result.current.combo.level).toBe(0);
      expect(result.current.tournamentData).toBeNull();
    });
  });

  describe('game state actions', () => {
    it('should set game active state', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setGameActive(true);
      });

      expect(result.current.gameActive).toBe(true);
    });

    it('should set letter grid', () => {
      const { result } = renderHook(() => useGameState());
      const grid = [['A', 'B'], ['C', 'D']];

      act(() => {
        result.current.setLetterGrid(grid);
      });

      expect(result.current.letterGrid).toEqual(grid);
    });

    it('should set remaining time', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setRemainingTime(180);
      });

      expect(result.current.remainingTime).toBe(180);
    });

    it('should update remaining time with function', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setRemainingTime(180);
      });

      act(() => {
        result.current.setRemainingTime((prev) => prev !== null ? prev - 1 : null);
      });

      expect(result.current.remainingTime).toBe(179);
    });
  });

  describe('player actions', () => {
    it('should add a player', () => {
      const { result } = renderHook(() => useGameState());
      const player = {
        username: 'testUser',
        avatar: { emoji: '🎮', color: '#FF0000' },
        isHost: false,
      };

      act(() => {
        result.current.addPlayer(player);
      });

      expect(result.current.players).toHaveLength(1);
      expect(result.current.players[0].username).toBe('testUser');
    });

    it('should not add duplicate players', () => {
      const { result } = renderHook(() => useGameState());
      const player = {
        username: 'testUser',
        avatar: { emoji: '🎮', color: '#FF0000' },
        isHost: false,
      };

      act(() => {
        result.current.addPlayer(player);
        result.current.addPlayer(player);
      });

      expect(result.current.players).toHaveLength(1);
    });

    it('should update existing player on add', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.addPlayer({
          username: 'testUser',
          avatar: { emoji: '🎮', color: '#FF0000' },
          isHost: false,
        });
      });

      act(() => {
        result.current.addPlayer({
          username: 'testUser',
          avatar: { emoji: '🎯', color: '#00FF00' },
          isHost: true,
        });
      });

      expect(result.current.players).toHaveLength(1);
      expect(result.current.players[0].avatar.emoji).toBe('🎯');
      expect(result.current.players[0].isHost).toBe(true);
    });

    it('should update a player', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.addPlayer({
          username: 'testUser',
          avatar: { emoji: '🎮', color: '#FF0000' },
          isHost: false,
        });
      });

      act(() => {
        result.current.updatePlayer('testUser', { presence: 'idle' });
      });

      expect(result.current.players[0].presence).toBe('idle');
    });

    it('should remove a player', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.addPlayer({
          username: 'testUser',
          avatar: { emoji: '🎮', color: '#FF0000' },
          isHost: false,
        });
      });

      act(() => {
        result.current.removePlayer('testUser');
      });

      expect(result.current.players).toHaveLength(0);
    });
  });

  describe('word actions', () => {
    it('should add a found word', () => {
      const { result } = renderHook(() => useGameState());
      const word = {
        word: 'TEST',
        score: 3,
        autoValidated: true,
      };

      act(() => {
        result.current.addFoundWord(word);
      });

      expect(result.current.foundWords).toHaveLength(1);
      expect(result.current.foundWords[0].word).toBe('TEST');
    });

    it('should not add duplicate words', () => {
      const { result } = renderHook(() => useGameState());
      const word = {
        word: 'TEST',
        score: 3,
        autoValidated: true,
      };

      act(() => {
        result.current.addFoundWord(word);
        result.current.addFoundWord({ ...word, word: 'test' }); // case insensitive
      });

      expect(result.current.foundWords).toHaveLength(1);
    });

    it('should add an achievement', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.addAchievement('FIRST_BLOOD');
      });

      expect(result.current.achievements).toContain('FIRST_BLOOD');
    });

    it('should not add duplicate achievements', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.addAchievement('FIRST_BLOOD');
        result.current.addAchievement('FIRST_BLOOD');
      });

      expect(result.current.achievements).toHaveLength(1);
    });
  });

  describe('combo actions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should increment combo level', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.incrementCombo();
      });

      expect(result.current.combo.level).toBe(1);
    });

    it('should reset combo', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.incrementCombo();
        result.current.incrementCombo();
      });

      act(() => {
        result.current.resetCombo();
      });

      expect(result.current.combo.level).toBe(0);
    });

    it('should reset combo after timeout', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.incrementCombo();
      });

      expect(result.current.combo.level).toBe(1);

      // Advance time past combo timeout (8 seconds)
      act(() => {
        jest.advanceTimersByTime(9000);
      });

      expect(result.current.combo.level).toBe(0);
    });

    it('should provide combo shield when enough words found', () => {
      const { result } = renderHook(() => useGameState());

      // Add 10 valid words to earn a shield
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addFoundWord({
            word: `WORD${i}`,
            score: 3,
            autoValidated: true,
            validated: true,
          });
        }
      });

      act(() => {
        result.current.incrementCombo();
      });

      // Should be able to use combo shield
      let shieldUsed = false;
      act(() => {
        shieldUsed = result.current.useComboShield();
      });

      expect(shieldUsed).toBe(true);
    });
  });

  describe('reset actions', () => {
    it('should reset for new round', () => {
      const { result } = renderHook(() => useGameState());

      // Set up some state
      act(() => {
        result.current.setGameActive(true);
        result.current.setLetterGrid([['A', 'B']]);
        result.current.addFoundWord({ word: 'TEST', score: 3, autoValidated: true });
        result.current.addAchievement('FIRST_BLOOD');
      });

      // Reset for new round
      act(() => {
        result.current.resetForNewRound();
      });

      expect(result.current.gameActive).toBe(false);
      expect(result.current.letterGrid).toBeNull();
      expect(result.current.foundWords).toEqual([]);
      expect(result.current.achievements).toEqual([]);
    });

    it('should reset all state', () => {
      const { result } = renderHook(() => useGameState());

      // Set up some state
      act(() => {
        result.current.setGameActive(true);
        result.current.setGameLanguage('en');
        result.current.addPlayer({
          username: 'testUser',
          avatar: { emoji: '🎮', color: '#FF0000' },
          isHost: false,
        });
        result.current.setTournamentData({
          id: 'test',
          name: 'Test Tournament',
          totalRounds: 3,
          currentRound: 1,
          status: 'in-progress',
        });
      });

      // Reset all
      act(() => {
        result.current.resetAll();
      });

      expect(result.current.gameActive).toBe(false);
      expect(result.current.gameLanguage).toBeNull();
      expect(result.current.players).toEqual([]);
      expect(result.current.tournamentData).toBeNull();
    });
  });

  describe('refs', () => {
    it('should provide refs for combo state', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.refs.comboLevel).toBeDefined();
      expect(result.current.refs.lastWordTime).toBeDefined();
      expect(result.current.refs.comboTimeout).toBeDefined();
    });

    it('should keep refs in sync with state', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.incrementCombo();
        result.current.incrementCombo();
      });

      expect(result.current.refs.comboLevel.current).toBe(2);
    });
  });
});
