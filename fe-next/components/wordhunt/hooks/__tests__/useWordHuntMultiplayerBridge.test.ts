/**
 * Tests for useWordHuntMultiplayerBridge hook
 *
 * This hook converts MP Zustand word-hunt state into SP-compatible props
 * for reusing SurvivalClueBoxes, SurvivalLifeBar, etc.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Zustand selectors
const mockWordHuntState = {
  targetLength: 5,
  myLife: 75,
  targetAttempts: [] as Array<{ guess: string; feedback: Array<'correct' | 'present' | 'absent'> }>,
  targetFound: false,
  targetFoundBy: null as string | null,
  playerLives: {} as Record<string, number>,
  eliminatedPlayers: [] as string[],
  discoveryClues: [] as Array<{ position: number; letter: string }>,
  knownLetters: [] as string[],
};

vi.mock('@/hooks/gameState/store', () => ({
  useWordHuntTargetLength: () => mockWordHuntState.targetLength,
  useWordHuntTargetCategory: () => null,
  useWordHuntMyLife: () => mockWordHuntState.myLife,
  useWordHuntTargetAttempts: () => mockWordHuntState.targetAttempts,
  useWordHuntTargetFound: () => mockWordHuntState.targetFound,
  useWordHuntTargetFoundBy: () => mockWordHuntState.targetFoundBy,
  useWordHuntPlayerLives: () => mockWordHuntState.playerLives,
  useWordHuntEliminatedPlayers: () => mockWordHuntState.eliminatedPlayers,
  useWordHuntDiscoveryClues: () => mockWordHuntState.discoveryClues,
  useWordHuntKnownLetters: () => mockWordHuntState.knownLetters,
}));

import { useWordHuntMultiplayerBridge } from '../useWordHuntMultiplayerBridge';

describe('useWordHuntMultiplayerBridge', () => {
  beforeEach(() => {
    mockWordHuntState.targetLength = 5;
    mockWordHuntState.myLife = 75;
    mockWordHuntState.targetAttempts = [];
    mockWordHuntState.targetFound = false;
    mockWordHuntState.playerLives = {};
    mockWordHuntState.eliminatedPlayers = [];
    mockWordHuntState.discoveryClues = [];
    mockWordHuntState.knownLetters = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic state mapping', () => {
    it('should return lifePoints from Zustand myLife', () => {
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.lifePoints).toBe(75);
    });

    it('should return targetFound from Zustand', () => {
      mockWordHuntState.targetFound = true;
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.targetFound).toBe(true);
    });

    it('should return targetLength from Zustand', () => {
      mockWordHuntState.targetLength = 7;
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.targetLength).toBe(7);
    });

    it('should return playerLives from Zustand', () => {
      mockWordHuntState.playerLives = { alice: 80, bob: 50 };
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.playerLives).toEqual({ alice: 80, bob: 50 });
    });

    it('should return eliminatedPlayers from Zustand', () => {
      mockWordHuntState.eliminatedPlayers = ['charlie'];
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.eliminatedPlayers).toEqual(['charlie']);
    });
  });

  describe('feedback conversion', () => {
    it('should convert MP feedback (correct/present/absent) to SP format (green/yellow/gray)', () => {
      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['correct', 'absent', 'present', 'absent', 'correct'] },
      ];
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());

      expect(result.current.attempts).toHaveLength(1);
      const converted = result.current.attempts[0].feedback;
      expect(converted).toEqual([
        { letter: 'H', feedback: 'green', position: 0 },
        { letter: 'E', feedback: 'gray', position: 1 },
        { letter: 'L', feedback: 'yellow', position: 2 },
        { letter: 'L', feedback: 'gray', position: 3 },
        { letter: 'O', feedback: 'green', position: 4 },
      ]);
    });

    it('should convert multiple attempts', () => {
      mockWordHuntState.targetAttempts = [
        { guess: 'APPLE', feedback: ['correct', 'absent', 'absent', 'absent', 'absent'] },
        { guess: 'ARROW', feedback: ['correct', 'present', 'absent', 'absent', 'absent'] },
      ];
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.attempts).toHaveLength(2);
      expect(result.current.attempts[0].feedback[0].feedback).toBe('green');
      expect(result.current.attempts[1].feedback[1].feedback).toBe('yellow');
    });
  });

  describe('accumulated clues', () => {
    it('should accumulate green clues from correct feedback', () => {
      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['correct', 'absent', 'absent', 'absent', 'correct'] },
      ];
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());

      expect(result.current.accumulatedClues.size).toBe(2);
      expect(result.current.accumulatedClues.get(0)).toEqual({ letter: 'H', type: 'green' });
      expect(result.current.accumulatedClues.get(4)).toEqual({ letter: 'O', type: 'green' });
    });

    it('should NOT accumulate yellow clues in accumulatedClues (mirrors SP behavior)', () => {
      mockWordHuntState.targetAttempts = [
        { guess: 'WORLD', feedback: ['absent', 'present', 'absent', 'absent', 'absent'] },
      ];
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());

      // Yellow letters should NOT be in accumulatedClues - only in knownLetters
      // The HintBoxes component handles yellow display via its own persistedLetters logic
      expect(result.current.accumulatedClues.has(1)).toBe(false);
      expect(result.current.accumulatedClues.size).toBe(0);
    });

    it('should accumulate green from later attempt even if earlier had yellow at same position', () => {
      mockWordHuntState.targetAttempts = [
        { guess: 'WORLD', feedback: ['absent', 'present', 'absent', 'absent', 'absent'] },
        { guess: 'HOWDY', feedback: ['absent', 'correct', 'absent', 'absent', 'absent'] },
      ];
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());

      expect(result.current.accumulatedClues.get(1)).toEqual({ letter: 'O', type: 'green' });
    });
  });

  describe('known letters', () => {
    it('should collect yellow letters into knownLetters set', () => {
      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['absent', 'present', 'absent', 'present', 'absent'] },
      ];
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());

      expect(result.current.knownLetters.has('E')).toBe(true);
      expect(result.current.knownLetters.has('L')).toBe(true);
      expect(result.current.knownLetters.has('H')).toBe(false);
    });

    it('should not include green letters in knownLetters (they are in accumulatedClues)', () => {
      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['correct', 'present', 'absent', 'absent', 'absent'] },
      ];
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());

      // H is green (correct position) — should not be in knownLetters
      expect(result.current.knownLetters.has('H')).toBe(false);
      // E is yellow (present) — should be in knownLetters
      expect(result.current.knownLetters.has('E')).toBe(true);
    });
  });

  describe('synthetic hint', () => {
    it('should generate a synthetic HintLevel with underscores matching target length', () => {
      mockWordHuntState.targetLength = 5;
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());

      expect(result.current.currentHint).toEqual({
        hint: '_ _ _ _ _',
        level: 0,
        unlockCost: 0,
      });
    });

    it('should adjust hint length when target length changes', () => {
      mockWordHuntState.targetLength = 3;
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.currentHint.hint).toBe('_ _ _');
    });
  });

  describe('feedback overlay', () => {
    it('should show feedback overlay when new attempt arrives', () => {
      const { result, rerender } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.showFeedbackOverlay).toBe(false);

      // Simulate a new attempt arriving
      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['correct', 'absent', 'absent', 'absent', 'correct'] },
      ];
      rerender();

      expect(result.current.showFeedbackOverlay).toBe(true);
    });

    it('should hide feedback overlay after duration elapses', () => {
      const { result, rerender } = renderHook(() => useWordHuntMultiplayerBridge());

      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['correct', 'absent', 'absent', 'absent', 'correct'] },
      ];
      rerender();
      expect(result.current.showFeedbackOverlay).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(result.current.showFeedbackOverlay).toBe(false);
    });

    it('should return latest attempt feedback', () => {
      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['correct', 'absent', 'absent', 'absent', 'correct'] },
        { guess: 'WORLD', feedback: ['absent', 'present', 'correct', 'absent', 'absent'] },
      ];
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());

      expect(result.current.latestAttemptFeedback).toHaveLength(5);
      expect(result.current.latestAttemptFeedback![0].letter).toBe('W');
      expect(result.current.latestAttemptFeedback![0].feedback).toBe('gray');
    });
  });

  describe('wrongGuessShake', () => {
    it('should not shake initially', () => {
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.wrongGuessShake).toBe(false);
    });

    it('should shake when a wrong attempt arrives', () => {
      const { result, rerender } = renderHook(() => useWordHuntMultiplayerBridge());

      // Add a wrong attempt (no 'correct' in all positions = wrong guess)
      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['absent', 'present', 'absent', 'absent', 'absent'] },
      ];
      rerender();

      expect(result.current.wrongGuessShake).toBe(true);
    });

    it('should not shake when a correct attempt arrives', () => {
      const { result, rerender } = renderHook(() => useWordHuntMultiplayerBridge());

      // Simulate target found alongside the attempt
      mockWordHuntState.targetFound = true;
      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['correct', 'correct', 'correct', 'correct', 'correct'] },
      ];
      rerender();

      expect(result.current.wrongGuessShake).toBe(false);
    });

    it('should clear shake after 400ms', () => {
      const { result, rerender } = renderHook(() => useWordHuntMultiplayerBridge());

      mockWordHuntState.targetAttempts = [
        { guess: 'HELLO', feedback: ['absent', 'absent', 'absent', 'absent', 'absent'] },
      ];
      rerender();
      expect(result.current.wrongGuessShake).toBe(true);

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(result.current.wrongGuessShake).toBe(false);
    });
  });

  describe('isGameOver', () => {
    it('should be false when life > 0 and target not found', () => {
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.isGameOver).toBe(false);
    });

    it('should be true when life reaches 0', () => {
      mockWordHuntState.myLife = 0;
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.isGameOver).toBe(true);
    });

    it('should be true when target is found', () => {
      mockWordHuntState.targetFound = true;
      const { result } = renderHook(() => useWordHuntMultiplayerBridge());
      expect(result.current.isGameOver).toBe(true);
    });
  });
});
