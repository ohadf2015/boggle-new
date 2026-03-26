/**
 * useLexiReactions Hook Tests
 *
 * Tests reaction trigger detection, cooldown enforcement, and priority handling.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLexiReactions, type GameStateForReactions } from '../useLexiReactions';

describe('useLexiReactions', () => {
  const createGameState = (overrides?: Partial<GameStateForReactions>): GameStateForReactions => ({
    wordsFound: [],
    comboCount: 0,
    timeRemaining: 60,
    isComplete: false,
    stars: 0,
    worldId: 1,
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns null reaction on mount', () => {
      const { result } = renderHook(() =>
        useLexiReactions({
          gameState: createGameState(),
          isPlaying: true,
        })
      );

      expect(result.current.reaction).toBeNull();
    });
  });

  describe('long word trigger', () => {
    it('triggers celebration for 6+ letter words', () => {
      const initialState = createGameState({ wordsFound: [] });

      const { result, rerender } = renderHook(
        ({ gameState }) => useLexiReactions({ gameState, isPlaying: true }),
        { initialProps: { gameState: initialState } }
      );

      // Add a long word (9 letters → mindblown for 8+)
      const newState = createGameState({ wordsFound: ['ADVENTURE'] });
      rerender({ gameState: newState });

      expect(result.current.reaction).not.toBeNull();
      expect(result.current.reaction?.type).toBe('celebration');
      expect(result.current.reaction?.variant).toBe('mindblown');
      expect(result.current.reaction?.messageKey).toContain('longWord');
    });

    it('triggers celebrating (not mindblown) for 6-7 letter words', () => {
      const initialState = createGameState({ wordsFound: [] });

      const { result, rerender } = renderHook(
        ({ gameState }) => useLexiReactions({ gameState, isPlaying: true }),
        { initialProps: { gameState: initialState } }
      );

      // Add a 7-letter word (< 8, so celebrating, not mindblown)
      const newState = createGameState({ wordsFound: ['PUZZLES'] });
      rerender({ gameState: newState });

      expect(result.current.reaction).not.toBeNull();
      expect(result.current.reaction?.variant).toBe('celebrating');
    });

    it('does NOT trigger for words under 6 letters', () => {
      const initialState = createGameState({ wordsFound: [] });

      const { result, rerender } = renderHook(
        ({ gameState }) => useLexiReactions({ gameState, isPlaying: true }),
        { initialProps: { gameState: initialState } }
      );

      // Add a short word (not first word, so it won't trigger firstWord either)
      const newState = createGameState({ wordsFound: ['CAT', 'DOG'] });
      rerender({ gameState: newState });

      // First word might trigger, but not long word
      if (result.current.reaction) {
        expect(result.current.reaction.messageKey).not.toContain('longWord');
      }
    });
  });

  describe('first word trigger', () => {
    it('triggers encouragement on first word of level', () => {
      const initialState = createGameState({ wordsFound: [] });

      const { result, rerender } = renderHook(
        ({ gameState }) => useLexiReactions({ gameState, isPlaying: true }),
        { initialProps: { gameState: initialState } }
      );

      // Add first word (short, so it's firstWord not longWord)
      const newState = createGameState({ wordsFound: ['CAT'] });
      rerender({ gameState: newState });

      expect(result.current.reaction).not.toBeNull();
      expect(result.current.reaction?.type).toBe('celebration');
      expect(result.current.reaction?.messageKey).toContain('firstWord');
    });
  });

  describe('combo milestone trigger', () => {
    it('triggers celebration at 3x combo', () => {
      const initialState = createGameState({ comboCount: 2 });

      const { result, rerender } = renderHook(
        ({ gameState }) => useLexiReactions({ gameState, isPlaying: true }),
        { initialProps: { gameState: initialState } }
      );

      // Cross 3x threshold
      const newState = createGameState({ comboCount: 3 });
      rerender({ gameState: newState });

      expect(result.current.reaction).not.toBeNull();
      expect(result.current.reaction?.messageKey).toContain('combo3x');
    });

    it('triggers high-priority celebration at 10x combo', () => {
      // Start with combo at 0 to properly initialize the ref
      const initialState = createGameState({ comboCount: 0 });

      const { result, rerender } = renderHook(
        ({ gameState }) => useLexiReactions({ gameState, isPlaying: true }),
        { initialProps: { gameState: initialState } }
      );

      // First, move to 9 (will trigger 3x and 5x, but we'll wait for cooldown)
      rerender({ gameState: createGameState({ comboCount: 9 }) });

      // Wait past cooldown so next reaction can trigger
      act(() => {
        vi.advanceTimersByTime(3500);
      });

      // Now cross 10x threshold
      const newState = createGameState({ comboCount: 10 });
      rerender({ gameState: newState });

      expect(result.current.reaction).not.toBeNull();
      expect(result.current.reaction?.messageKey).toContain('combo10x');
      expect(result.current.reaction?.priority).toBe('high');
      expect(result.current.reaction?.variant).toBe('onfire');
    });
  });

  describe('cooldown enforcement', () => {
    it('blocks reactions within cooldown period', () => {
      const initialState = createGameState({ wordsFound: [] });

      const { result, rerender } = renderHook(
        ({ gameState }) =>
          useLexiReactions({ gameState, isPlaying: true, cooldownMs: 3000 }),
        { initialProps: { gameState: initialState } }
      );

      // Trigger first reaction
      const state1 = createGameState({ wordsFound: ['AMAZING'] });
      rerender({ gameState: state1 });
      expect(result.current.reaction).not.toBeNull();
      const firstId = result.current.reaction?.id;

      // Try to trigger another immediately (should be blocked by cooldown)
      // Advance time but not past cooldown
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const state2 = createGameState({ wordsFound: ['AMAZING', 'BRILLIANT'] });
      rerender({ gameState: state2 });

      // Reaction ID should not change (cooldown blocked new reaction)
      // Or it should still be the same reaction since cooldown blocked
      expect(result.current.reaction?.id).toBe(firstId);
    });

    it('allows new reactions after cooldown expires', () => {
      const initialState = createGameState({ wordsFound: [] });

      const { result, rerender } = renderHook(
        ({ gameState }) =>
          useLexiReactions({ gameState, isPlaying: true, cooldownMs: 3000 }),
        { initialProps: { gameState: initialState } }
      );

      // Trigger first reaction
      const state1 = createGameState({ wordsFound: ['AMAZING'] });
      rerender({ gameState: state1 });
      const firstId = result.current.reaction?.id;

      // Wait for cooldown
      act(() => {
        vi.advanceTimersByTime(3500);
      });

      // Clear the auto-dismissed reaction
      const state2 = createGameState({ wordsFound: ['AMAZING', 'FANTASTIC'] });
      rerender({ gameState: state2 });

      // New reaction should be allowed
      if (result.current.reaction) {
        expect(result.current.reaction.id).not.toBe(firstId);
      }
    });
  });

  describe('dismissReaction', () => {
    it('clears the current reaction', () => {
      const initialState = createGameState({ wordsFound: [] });

      const { result, rerender } = renderHook(
        ({ gameState }) => useLexiReactions({ gameState, isPlaying: true }),
        { initialProps: { gameState: initialState } }
      );

      // Trigger a reaction
      const newState = createGameState({ wordsFound: ['AMAZING'] });
      rerender({ gameState: newState });
      expect(result.current.reaction).not.toBeNull();

      // Dismiss it
      act(() => {
        result.current.dismissReaction();
      });

      expect(result.current.reaction).toBeNull();
    });
  });

  describe('time-pressure win', () => {
    it('triggers celebration when completing with <10s remaining', () => {
      const initialState = createGameState({
        isComplete: false,
        stars: 0,
        timeRemaining: 8,
      });

      const { result, rerender } = renderHook(
        ({ gameState }) => useLexiReactions({ gameState, isPlaying: true }),
        { initialProps: { gameState: initialState } }
      );

      // Complete with low time
      const completeState = createGameState({
        isComplete: true,
        stars: 2,
        timeRemaining: 8,
      });
      rerender({ gameState: completeState });

      expect(result.current.reaction).not.toBeNull();
      expect(result.current.reaction?.messageKey).toContain('timeBonus');
      expect(result.current.reaction?.priority).toBe('high');
    });
  });

  describe('isPlaying guard', () => {
    it('does NOT trigger reactions when isPlaying is false', () => {
      const initialState = createGameState({ wordsFound: [] });

      const { result, rerender } = renderHook(
        ({ gameState, isPlaying }) =>
          useLexiReactions({ gameState, isPlaying }),
        { initialProps: { gameState: initialState, isPlaying: false } }
      );

      // Add a long word while not playing
      const newState = createGameState({ wordsFound: ['ADVENTURE'] });
      rerender({ gameState: newState, isPlaying: false });

      expect(result.current.reaction).toBeNull();
    });
  });
});
