/**
 * useAdventureHints Hook Tests
 *
 * Tests for adventure mode hint system that suggests words when players are stuck.
 * Following TDD: Write tests FIRST, then implement.
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdventureHints } from '../useAdventureHints';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => React.ReactElement;

// Test grid (4x4)
const testGrid = [
  ['T', 'E', 'S', 'T'],
  ['W', 'O', 'R', 'D'],
  ['H', 'I', 'N', 'T'],
  ['G', 'A', 'M', 'E'],
];

// Mock solve-grid response with valid words and their categories
const mockSolveResponse = {
  success: true,
  words: {
    easy: ['TEST', 'WORD', 'HINT', 'GAME', 'THE', 'HIT', 'WIN'],
    medium: ['TOWER', 'ROWING', 'HINTED'],
    hard: ['WORDING', 'TESTING'],
  },
};

describe('useAdventureHints', () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default handler: returns mockSolveResponse
    server.use(
      http.post('*/api/solve-grid*', () => HttpResponse.json(mockSolveResponse))
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should fetch valid words on mount', async () => {
      // GIVEN — capture request body via closure
      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.post('*/api/solve-grid*', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json(mockSolveResponse);
        })
      );

      // WHEN
      renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      // THEN
      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      });
      expect(capturedBody!.grid).toEqual(testGrid);
      expect(capturedBody!.language).toBe('en');
    });

    it('should set isLoading to true initially', () => {
      // GIVEN — handler that never resolves
      server.use(
        http.post('*/api/solve-grid*', () => new Promise(() => {}))
      );

      // WHEN
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      // THEN
      expect(result.current.isLoading).toBe(true);
    });

    it('should set isLoading to false after fetch completes', async () => {
      // GIVEN/WHEN
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Hint Availability', () => {
    it('should have hints available after words are loaded', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.hasHintsAvailable).toBe(true);
      });
    });

    it('should not have hints when all words are found', async () => {
      // GIVEN - All easy, medium, and hard words are found
      const allFoundWords = [
        ...mockSolveResponse.words.easy,
        ...mockSolveResponse.words.medium,
        ...mockSolveResponse.words.hard,
      ];

      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: allFoundWords,
          isPlaying: true,
        })
      , { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasHintsAvailable).toBe(false);
    });

    it('should filter out already found words from available hints', async () => {
      // GIVEN - Some words already found
      const foundWords = ['TEST', 'WORD', 'HINT'];

      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords,
          isPlaying: true,
        })
      , { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasHintsAvailable).toBe(true);
      expect(result.current.remainingHintWords).not.toContain('TEST');
      expect(result.current.remainingHintWords).not.toContain('WORD');
      expect(result.current.remainingHintWords).not.toContain('HINT');
    });
  });

  describe('Getting Hints', () => {
    it('should return a hint path when getHint is called', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN
      let hint: { word: string; path: { row: number; col: number }[] } | null = null;
      act(() => {
        hint = result.current.getHint();
      });

      // THEN
      expect(hint).not.toBeNull();
      expect(hint!.word).toBeDefined();
      expect(hint!.path).toBeDefined();
      expect(hint!.path.length).toBeGreaterThan(0);
    });

    it('should return null when no hints available', async () => {
      // GIVEN - All words found
      const allFoundWords = [
        ...mockSolveResponse.words.easy,
        ...mockSolveResponse.words.medium,
        ...mockSolveResponse.words.hard,
      ];

      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: allFoundWords,
          isPlaying: true,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN
      let hint: { word: string; path: { row: number; col: number }[] } | null = null;
      act(() => {
        hint = result.current.getHint();
      });

      // THEN
      expect(hint).toBeNull();
    });

    it('should prefer easy words for hints', async () => {
      // GIVEN - Only one easy word remaining
      const foundWords = ['TEST', 'WORD', 'HINT', 'THE', 'HIT', 'WIN']; // All easy except GAME

      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords,
          isPlaying: true,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN
      let hint: { word: string; path: { row: number; col: number }[] } | null = null;
      act(() => {
        hint = result.current.getHint();
      });

      // THEN - Should get GAME (the remaining easy word)
      expect(hint).not.toBeNull();
      expect(hint!.word).toBe('GAME');
    });
  });

  describe('Inactivity Detection', () => {
    it('should trigger auto-hint after inactivity period', async () => {
      // GIVEN
      const onAutoHint = vi.fn();
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
          inactivityThresholdMs: 15000, // 15 seconds
          onAutoHint,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN - Advance time by inactivity threshold
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // THEN
      expect(onAutoHint).toHaveBeenCalled();
      expect(result.current.showAutoHint).toBe(true);
    });

    it('should reset inactivity timer when recordActivity is called', async () => {
      // GIVEN
      const onAutoHint = vi.fn();
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
          inactivityThresholdMs: 15000,
          onAutoHint,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN - Wait 10 seconds, then record activity
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      act(() => {
        result.current.recordActivity();
      });

      // WHEN - Wait another 10 seconds (would be 20 total without reset)
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // THEN - Should NOT trigger auto-hint yet (only 10s since last activity)
      expect(onAutoHint).not.toHaveBeenCalled();
      expect(result.current.showAutoHint).toBe(false);

      // WHEN - Wait 5 more seconds (15s since last activity)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // THEN - Now should trigger
      expect(onAutoHint).toHaveBeenCalled();
    });

    it('should not trigger auto-hint when game is paused', async () => {
      // GIVEN
      const onAutoHint = vi.fn();
      const { result, rerender } = renderHook(
        ({ isPlaying }) =>
          useAdventureHints({
            grid: testGrid,
            language: 'en',
            foundWords: [],
            isPlaying,
            inactivityThresholdMs: 15000,
            onAutoHint,
          }),
        { initialProps: { isPlaying: true }, wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN - Pause the game
      rerender({ isPlaying: false });

      // WHEN - Advance time past threshold
      act(() => {
        vi.advanceTimersByTime(20000);
      });

      // THEN - Should NOT trigger
      expect(onAutoHint).not.toHaveBeenCalled();
    });

    it('should dismiss auto-hint when dismissAutoHint is called', async () => {
      // GIVEN
      const onAutoHint = vi.fn();
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
          inactivityThresholdMs: 15000,
          onAutoHint,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN - Trigger auto-hint
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(result.current.showAutoHint).toBe(true);

      // WHEN - Dismiss
      act(() => {
        result.current.dismissAutoHint();
      });

      // THEN
      expect(result.current.showAutoHint).toBe(false);
    });
  });

  describe('Path Finding', () => {
    it('should find correct path for a word on the grid', async () => {
      // GIVEN - Grid with 'TEST' in first row
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN - Get hint for TEST specifically
      const path = result.current.findPathForWord('TEST');

      // THEN - Should find path in first row
      expect(path).not.toBeNull();
      expect(path).toHaveLength(4);
      expect(path![0]).toEqual({ row: 0, col: 0 }); // T
      expect(path![1]).toEqual({ row: 0, col: 1 }); // E
      expect(path![2]).toEqual({ row: 0, col: 2 }); // S
      expect(path![3]).toEqual({ row: 0, col: 3 }); // T
    });

    it('should return null for word not on grid', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN - Try to find path for word not on grid
      const path = result.current.findPathForWord('ZEBRA');

      // THEN
      expect(path).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // GIVEN - network error
      server.use(
        http.post('*/api/solve-grid*', () => HttpResponse.error())
      );

      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeTruthy();
      expect(result.current.hasHintsAvailable).toBe(false);
    });

    it('should handle invalid API response gracefully', async () => {
      // GIVEN - non-ok HTTP response
      server.use(
        http.post('*/api/solve-grid*', () =>
          new HttpResponse(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 })
        )
      );

      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Hint Cost System', () => {
    it('should allow 1 free hint per level by default (no gold cost)', async () => {
      // GIVEN — no gold callback, default freeHintsPerLevel=1
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
          maxHintsPerLevel: 5,
        })
      , { wrapper });

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      // WHEN — first hint
      let hint: ReturnType<typeof result.current.getHint> = null;
      act(() => { hint = result.current.getHint(); });

      // THEN — hint succeeds, freeHintsRemaining decreases
      expect(hint).not.toBeNull();
      expect(result.current.freeHintsRemaining).toBe(0);
      expect(result.current.nextHintCost).toBe(15);
    });

    it('should require gold for hints after free hints are exhausted', async () => {
      // GIVEN — 1 free hint, gold=100, goldCostPerHint=15
      const onSpendGold = vi.fn().mockReturnValue(true);
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
          maxHintsPerLevel: 5,
          freeHintsPerLevel: 1,
          goldCostPerHint: 15,
          onSpendGold,
        })
      , { wrapper });

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      // Use free hint
      act(() => { result.current.getHint(); });
      expect(onSpendGold).not.toHaveBeenCalled();

      // WHEN — second hint (paid)
      act(() => { result.current.getHint(); });

      // THEN — gold was deducted
      expect(onSpendGold).toHaveBeenCalledWith(15);
    });

    it('should block hint when player cannot afford gold cost', async () => {
      // GIVEN — free hints used, onSpendGold returns false (insufficient gold)
      const onSpendGold = vi.fn().mockReturnValue(false);
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
          maxHintsPerLevel: 5,
          freeHintsPerLevel: 1,
          goldCostPerHint: 15,
          onSpendGold,
        })
      , { wrapper });

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      // Use free hint
      act(() => { result.current.getHint(); });

      // WHEN — try paid hint but can't afford
      let hint: ReturnType<typeof result.current.getHint> = null;
      act(() => { hint = result.current.getHint(); });

      // THEN — returns null, no hint given
      expect(hint).toBeNull();
      expect(onSpendGold).toHaveBeenCalledWith(15);
    });

    it('should respect freeHintsPerLevel from upgrade tiers', async () => {
      // GIVEN — Word Radar T4 gives 3 free hints
      const onSpendGold = vi.fn().mockReturnValue(true);
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
          maxHintsPerLevel: 10,
          freeHintsPerLevel: 3,
          goldCostPerHint: 15,
          onSpendGold,
        })
      , { wrapper });

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      // WHEN — use 3 hints
      act(() => { result.current.getHint(); });
      act(() => { result.current.getHint(); });
      act(() => { result.current.getHint(); });

      // THEN — all 3 were free
      expect(onSpendGold).not.toHaveBeenCalled();
      expect(result.current.freeHintsRemaining).toBe(0);

      // WHEN — 4th hint costs gold
      act(() => { result.current.getHint(); });
      expect(onSpendGold).toHaveBeenCalledWith(15);
    });

    it('should report nextHintCost as 0 when free hints remain', async () => {
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
          maxHintsPerLevel: 5,
          freeHintsPerLevel: 2,
          goldCostPerHint: 15,
        })
      , { wrapper });

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      // THEN — still have free hints
      expect(result.current.nextHintCost).toBe(0);
      expect(result.current.freeHintsRemaining).toBe(2);

      // Use one
      act(() => { result.current.getHint(); });
      expect(result.current.nextHintCost).toBe(0);
      expect(result.current.freeHintsRemaining).toBe(1);

      // Use second
      act(() => { result.current.getHint(); });
      expect(result.current.nextHintCost).toBe(15);
      expect(result.current.freeHintsRemaining).toBe(0);
    });

    it('should reset free hints on level reset (hintsUsed resets)', async () => {
      const onSpendGold = vi.fn().mockReturnValue(true);
      const { result, rerender } = renderHook(
        ({ foundWords }) =>
          useAdventureHints({
            grid: testGrid,
            language: 'en',
            foundWords,
            isPlaying: true,
            maxHintsPerLevel: 5,
            freeHintsPerLevel: 1,
            goldCostPerHint: 15,
            onSpendGold,
          }),
        { initialProps: { foundWords: [] as string[] }, wrapper }
      );

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      // Use free hint + paid hint
      act(() => { result.current.getHint(); });
      act(() => { result.current.getHint(); });
      expect(onSpendGold).toHaveBeenCalledTimes(1);
      expect(result.current.freeHintsRemaining).toBe(0);
    });

    it('should not charge gold for auto-hints triggered by inactivity', async () => {
      // Auto-hints (inactivity-based) should be free — they help stuck players
      const onSpendGold = vi.fn().mockReturnValue(true);
      const onAutoHint = vi.fn();
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
          inactivityThresholdMs: 15000,
          maxHintsPerLevel: 5,
          freeHintsPerLevel: 0,
          goldCostPerHint: 15,
          onSpendGold,
          onAutoHint,
        })
      , { wrapper });

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      // WHEN — auto-hint triggers
      act(() => { vi.advanceTimersByTime(15000); });

      // THEN — no gold charged for auto-hint
      expect(onAutoHint).toHaveBeenCalled();
      expect(onSpendGold).not.toHaveBeenCalled();
    });
  });

  describe('Current Hint Highlight', () => {
    it('should track current hint for UI highlighting', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initially no current hint
      expect(result.current.currentHint).toBeNull();

      // WHEN - Get a hint
      act(() => {
        result.current.getHint();
      });

      // THEN - Current hint should be set
      expect(result.current.currentHint).not.toBeNull();
      expect(result.current.currentHint!.word).toBeDefined();
      expect(result.current.currentHint!.path).toBeDefined();
    });

    it('should clear current hint when clearCurrentHint is called', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureHints({
          grid: testGrid,
          language: 'en',
          foundWords: [],
          isPlaying: true,
        })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Get a hint first
      act(() => {
        result.current.getHint();
      });
      expect(result.current.currentHint).not.toBeNull();

      // WHEN - Clear hint
      act(() => {
        result.current.clearCurrentHint();
      });

      // THEN
      expect(result.current.currentHint).toBeNull();
    });
  });
});
