/**
 * useAdventureCinematics Tests
 *
 * Tests for the cinematics management hook.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureCinematics } from '../useAdventureCinematics';

describe('useAdventureCinematics', () => {
  it('should initialize with no cinematics showing and not complete', () => {
    const { result } = renderHook(() => useAdventureCinematics());

    expect(result.current.showVictoryCinematic).toBe(false);
    expect(result.current.showDefeatCinematic).toBe(false);
    expect(result.current.cinematicComplete).toBe(false);
  });

  describe('showVictory', () => {
    it('should show victory cinematic and mark as not complete', () => {
      const { result } = renderHook(() => useAdventureCinematics());

      act(() => {
        result.current.showVictory();
      });

      expect(result.current.showVictoryCinematic).toBe(true);
      expect(result.current.showDefeatCinematic).toBe(false);
      expect(result.current.cinematicComplete).toBe(false);
    });
  });

  describe('showDefeat', () => {
    it('should show defeat cinematic and mark as not complete', () => {
      const { result } = renderHook(() => useAdventureCinematics());

      act(() => {
        result.current.showDefeat();
      });

      expect(result.current.showVictoryCinematic).toBe(false);
      expect(result.current.showDefeatCinematic).toBe(true);
      expect(result.current.cinematicComplete).toBe(false);
    });
  });

  describe('handleCinematicComplete', () => {
    it('should hide victory cinematic and mark as complete', () => {
      const { result } = renderHook(() => useAdventureCinematics());

      act(() => {
        result.current.showVictory();
      });

      act(() => {
        result.current.handleCinematicComplete();
      });

      expect(result.current.showVictoryCinematic).toBe(false);
      expect(result.current.showDefeatCinematic).toBe(false);
      expect(result.current.cinematicComplete).toBe(true);
    });

    it('should hide defeat cinematic and mark as complete', () => {
      const { result } = renderHook(() => useAdventureCinematics());

      act(() => {
        result.current.showDefeat();
      });

      act(() => {
        result.current.handleCinematicComplete();
      });

      expect(result.current.showVictoryCinematic).toBe(false);
      expect(result.current.showDefeatCinematic).toBe(false);
      expect(result.current.cinematicComplete).toBe(true);
    });
  });

  describe('resetCinematics', () => {
    it('should reset all cinematic state', () => {
      const { result } = renderHook(() => useAdventureCinematics());

      // Set up some state
      act(() => {
        result.current.showVictory();
      });

      act(() => {
        result.current.handleCinematicComplete();
      });

      // Reset
      act(() => {
        result.current.resetCinematics();
      });

      expect(result.current.showVictoryCinematic).toBe(false);
      expect(result.current.showDefeatCinematic).toBe(false);
      expect(result.current.cinematicComplete).toBe(false);
    });
  });

  describe('function stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useAdventureCinematics());

      const firstShowVictory = result.current.showVictory;
      const firstShowDefeat = result.current.showDefeat;
      const firstHandleComplete = result.current.handleCinematicComplete;
      const firstReset = result.current.resetCinematics;

      rerender();

      expect(result.current.showVictory).toBe(firstShowVictory);
      expect(result.current.showDefeat).toBe(firstShowDefeat);
      expect(result.current.handleCinematicComplete).toBe(firstHandleComplete);
      expect(result.current.resetCinematics).toBe(firstReset);
    });
  });
});
