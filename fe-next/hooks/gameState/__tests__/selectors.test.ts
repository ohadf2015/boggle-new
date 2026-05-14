/**
 * Tests for Zustand selector hooks (selectors.ts)
 *
 * Verifies each selector returns correct derived state from the store,
 * tests useGameActions caching, and documents the rules-of-hooks pattern.
 */

import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '../store';
import {
  useGameActive,
  useLetterGrid,
  useRemainingTime,
  useGameLanguage,
  useMinWordLength,
  useTotalBoardWords,
  usePlayers,
  useLeaderboard,
  useFoundWords,
  useAchievements,
  useWaitingForResults,
  useShowStartAnimation,
  useShufflingGrid,
  useHighlightedCells,
  useCombo,
  useComboLevel,
  useTournamentData,
  useTournamentStandings,
  useShowTournamentStandings,
  useXpGainedData,
  useLevelUpData,
  useBoardTheme,
  useGameMode,
  useBlastBoardClears,
  useBlastTotalTileBonus,
  useBlastTotalTilesCleared,
  useWordHuntTargetLength,
  useWordHuntMyLife,
  useWordHuntTargetFound,
  useGameActions,
} from '../selectors';

describe('selectors', () => {
  beforeEach(() => {
    useGameStore.getState().resetAll();
  });

  // ==========================================
  // Default state selectors
  // ==========================================
  describe('default store state', () => {
    it('useGameActive returns false', () => {
      const { result } = renderHook(() => useGameActive());
      expect(result.current).toBe(false);
    });

    it('useLetterGrid returns null', () => {
      const { result } = renderHook(() => useLetterGrid());
      expect(result.current).toBeNull();
    });

    it('useRemainingTime returns null', () => {
      const { result } = renderHook(() => useRemainingTime());
      expect(result.current).toBeNull();
    });

    it('useGameLanguage returns null', () => {
      const { result } = renderHook(() => useGameLanguage());
      expect(result.current).toBeNull();
    });

    it('useMinWordLength returns 2', () => {
      const { result } = renderHook(() => useMinWordLength());
      expect(result.current).toBe(2);
    });

    it('useTotalBoardWords returns null', () => {
      const { result } = renderHook(() => useTotalBoardWords());
      expect(result.current).toBeNull();
    });

    it('usePlayers returns empty array', () => {
      const { result } = renderHook(() => usePlayers());
      expect(result.current).toEqual([]);
    });

    it('useLeaderboard returns empty array', () => {
      const { result } = renderHook(() => useLeaderboard());
      expect(result.current).toEqual([]);
    });

    it('useFoundWords returns empty array', () => {
      const { result } = renderHook(() => useFoundWords());
      expect(result.current).toEqual([]);
    });

    it('useAchievements returns empty array', () => {
      const { result } = renderHook(() => useAchievements());
      expect(result.current).toEqual([]);
    });

    it('useWaitingForResults returns false', () => {
      const { result } = renderHook(() => useWaitingForResults());
      expect(result.current).toBe(false);
    });

    it('useShowStartAnimation returns false', () => {
      const { result } = renderHook(() => useShowStartAnimation());
      expect(result.current).toBe(false);
    });

    it('useShufflingGrid returns null', () => {
      const { result } = renderHook(() => useShufflingGrid());
      expect(result.current).toBeNull();
    });

    it('useHighlightedCells returns empty array', () => {
      const { result } = renderHook(() => useHighlightedCells());
      expect(result.current).toEqual([]);
    });

    it('useCombo returns default combo state', () => {
      const { result } = renderHook(() => useCombo());
      expect(result.current).toEqual({ level: 0, lastWordTime: null, shieldsUsed: 0 });
    });

    it('useComboLevel returns 0', () => {
      const { result } = renderHook(() => useComboLevel());
      expect(result.current).toBe(0);
    });

    it('useTournamentData returns null', () => {
      const { result } = renderHook(() => useTournamentData());
      expect(result.current).toBeNull();
    });

    it('useTournamentStandings returns empty array', () => {
      const { result } = renderHook(() => useTournamentStandings());
      expect(result.current).toEqual([]);
    });

    it('useShowTournamentStandings returns false', () => {
      const { result } = renderHook(() => useShowTournamentStandings());
      expect(result.current).toBe(false);
    });

    it('useXpGainedData returns null', () => {
      const { result } = renderHook(() => useXpGainedData());
      expect(result.current).toBeNull();
    });

    it('useLevelUpData returns null', () => {
      const { result } = renderHook(() => useLevelUpData());
      expect(result.current).toBeNull();
    });

    it('useBoardTheme returns null', () => {
      const { result } = renderHook(() => useBoardTheme());
      expect(result.current).toBeNull();
    });

    it('useGameMode returns classic', () => {
      const { result } = renderHook(() => useGameMode());
      expect(result.current).toBe('classic');
    });

    it('useBlastBoardClears returns 0', () => {
      const { result } = renderHook(() => useBlastBoardClears());
      expect(result.current).toBe(0);
    });

    it('useBlastTotalTileBonus returns 0', () => {
      const { result } = renderHook(() => useBlastTotalTileBonus());
      expect(result.current).toBe(0);
    });

    it('useBlastTotalTilesCleared returns 0', () => {
      const { result } = renderHook(() => useBlastTotalTilesCleared());
      expect(result.current).toBe(0);
    });

    it('useWordHuntTargetLength returns 0', () => {
      const { result } = renderHook(() => useWordHuntTargetLength());
      expect(result.current).toBe(0);
    });

    it('useWordHuntMyLife returns 100', () => {
      const { result } = renderHook(() => useWordHuntMyLife());
      expect(result.current).toBe(100);
    });

    it('useWordHuntTargetFound returns false', () => {
      const { result } = renderHook(() => useWordHuntTargetFound());
      expect(result.current).toBe(false);
    });
  });

  // ==========================================
  // Selectors reflect store changes
  // ==========================================
  describe('selectors reflect store mutations', () => {
    it('useGameActive updates when setGameActive called', () => {
      const { result } = renderHook(() => useGameActive());
      expect(result.current).toBe(false);

      act(() => { useGameStore.getState().setGameActive(true); });
      expect(result.current).toBe(true);
    });

    it('useRemainingTime updates when setRemainingTime called', () => {
      const { result } = renderHook(() => useRemainingTime());
      act(() => { useGameStore.getState().setRemainingTime(42); });
      expect(result.current).toBe(42);
    });

    it('useComboLevel updates when incrementCombo called', () => {
      const { result } = renderHook(() => useComboLevel());
      act(() => { useGameStore.getState().incrementCombo(); });
      expect(result.current).toBe(1);
      act(() => { useGameStore.getState().incrementCombo(); });
      expect(result.current).toBe(2);
    });

    it('useGameMode updates with setGameMode', () => {
      const { result } = renderHook(() => useGameMode());
      act(() => { useGameStore.getState().setGameMode('blast'); });
      expect(result.current).toBe('blast');
    });

    it('useFoundWords updates when addFoundWord called', () => {
      const { result } = renderHook(() => useFoundWords());
      const word = { word: 'test', score: 10, path: [], timestamp: Date.now() };
      act(() => { useGameStore.getState().addFoundWord(word as any); });
      expect(result.current).toHaveLength(1);
      expect(result.current[0].word).toBe('test');
    });

    it('useWordHuntTargetFound updates with setWordHuntTargetFound', () => {
      const { result } = renderHook(() => useWordHuntTargetFound());
      act(() => { useGameStore.getState().setWordHuntTargetFound(true); });
      expect(result.current).toBe(true);
    });

    it('useBlastBoardClears updates when setBlastBoardClears called', () => {
      const { result } = renderHook(() => useBlastBoardClears());
      act(() => { useGameStore.getState().setBlastBoardClears(3); });
      expect(result.current).toBe(3);
    });
  });

  // ==========================================
  // Selectors after batchStartGame
  // ==========================================
  describe('selectors after batchStartGame', () => {
    it('reflects batch-set values', () => {
      const grid = [['A', 'B'], ['C', 'D']];
      act(() => {
        useGameStore.getState().batchStartGame({
          letterGrid: grid,
          remainingTime: 120,
          gameLanguage: 'en',
          minWordLength: 3,
          gameMode: 'blast',
          gameActive: true,
        });
      });

      const { result: activeResult } = renderHook(() => useGameActive());
      expect(activeResult.current).toBe(true);

      const { result: gridResult } = renderHook(() => useLetterGrid());
      expect(gridResult.current).toEqual(grid);

      const { result: timeResult } = renderHook(() => useRemainingTime());
      expect(timeResult.current).toBe(120);

      const { result: langResult } = renderHook(() => useGameLanguage());
      expect(langResult.current).toBe('en');

      const { result: modeResult } = renderHook(() => useGameMode());
      expect(modeResult.current).toBe('blast');
    });
  });

  // ==========================================
  // Selectors after resetAll
  // ==========================================
  describe('selectors after resetAll', () => {
    it('returns defaults after resetAll', () => {
      act(() => {
        useGameStore.getState().setGameActive(true);
        useGameStore.getState().setRemainingTime(60);
        useGameStore.getState().setGameMode('word-hunt');
      });

      act(() => { useGameStore.getState().resetAll(); });

      const { result: activeResult } = renderHook(() => useGameActive());
      expect(activeResult.current).toBe(false);

      const { result: timeResult } = renderHook(() => useRemainingTime());
      expect(timeResult.current).toBeNull();

      const { result: modeResult } = renderHook(() => useGameMode());
      expect(modeResult.current).toBe('classic');
    });
  });

  // ==========================================
  // useGameActions
  // ==========================================
  describe('useGameActions', () => {
    it('returns an object with all action functions', () => {
      const { result } = renderHook(() => useGameActions());
      const actions = result.current;

      expect(typeof actions.setGameActive).toBe('function');
      expect(typeof actions.setLetterGrid).toBe('function');
      expect(typeof actions.incrementCombo).toBe('function');
      expect(typeof actions.resetAll).toBe('function');
      expect(typeof actions.batchStartGame).toBe('function');
      expect(typeof actions.addFoundWord).toBe('function');
    });

    it('returns stable reference across re-renders (cached)', () => {
      const { result, rerender } = renderHook(() => useGameActions());
      const first = result.current;
      rerender();
      expect(result.current).toBe(first);
    });

    it('returns stable reference even after store state changes', () => {
      const { result } = renderHook(() => useGameActions());
      const first = result.current;

      act(() => { useGameStore.getState().setGameActive(true); });

      // Re-render to pick up any changes
      const { result: result2 } = renderHook(() => useGameActions());
      expect(result2.current).toBe(first);
    });

    it('actions actually mutate the store', () => {
      const { result } = renderHook(() => useGameActions());
      act(() => { result.current.setGameActive(true); });
      expect(useGameStore.getState().gameActive).toBe(true);
    });

    /**
     * DOCUMENTED BEHAVIOR: useGameActions does NOT violate rules-of-hooks.
     *
     * Unlike a typical selector hook, useGameActions uses useGameStore.getState()
     * (not useGameStore(selector)), so it does NOT subscribe to React state.
     * The cached actions object is a module-level singleton. This means:
     * - It CAN be called outside React components (no hook call inside)
     * - It returns the same cached object every time
     * - It never causes re-renders
     *
     * However, the function is named "use*" which implies it's a hook.
     * Calling it conditionally would not break anything but violates naming convention.
     */
    it('useGameActions uses getState (not a true hook subscription)', () => {
      // Calling outside renderHook works because it uses getState(), not a selector
      const actions = useGameActions();
      expect(typeof actions.setGameActive).toBe('function');
    });
  });
});
