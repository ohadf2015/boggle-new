/**
 * useAdventureEntryPhase Tests
 *
 * Tests for the entry phase state machine hook.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureEntryPhase } from '../useAdventureEntryPhase';

describe('useAdventureEntryPhase', () => {
  it('should initialize with cascade phase', () => {
    const { result } = renderHook(() => useAdventureEntryPhase());

    expect(result.current.entryPhase).toBe('cascade');
  });

  describe('advanceToObjectives', () => {
    it('should advance to objectives phase', () => {
      const { result } = renderHook(() => useAdventureEntryPhase());

      act(() => {
        result.current.advanceToObjectives();
      });

      expect(result.current.entryPhase).toBe('objectives');
    });
  });

  describe('advanceToTitle', () => {
    it('should advance to title phase', () => {
      const { result } = renderHook(() => useAdventureEntryPhase());

      act(() => {
        result.current.advanceToTitle();
      });

      expect(result.current.entryPhase).toBe('title');
    });
  });

  describe('advanceToPlaying', () => {
    it('should advance to playing phase', () => {
      const { result } = renderHook(() => useAdventureEntryPhase());

      act(() => {
        result.current.advanceToPlaying();
      });

      expect(result.current.entryPhase).toBe('playing');
    });
  });

  describe('resetToStart', () => {
    it('should reset to cascade phase from any phase', () => {
      const { result } = renderHook(() => useAdventureEntryPhase());

      // Advance to playing
      act(() => {
        result.current.advanceToPlaying();
      });

      expect(result.current.entryPhase).toBe('playing');

      // Reset
      act(() => {
        result.current.resetToStart();
      });

      expect(result.current.entryPhase).toBe('cascade');
    });
  });

  describe('phase progression', () => {
    it('should support full progression cascade → objectives → title → playing', () => {
      const { result } = renderHook(() => useAdventureEntryPhase());

      expect(result.current.entryPhase).toBe('cascade');

      act(() => {
        result.current.advanceToObjectives();
      });
      expect(result.current.entryPhase).toBe('objectives');

      act(() => {
        result.current.advanceToTitle();
      });
      expect(result.current.entryPhase).toBe('title');

      act(() => {
        result.current.advanceToPlaying();
      });
      expect(result.current.entryPhase).toBe('playing');
    });
  });

  describe('function stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useAdventureEntryPhase());

      const firstAdvanceToObjectives = result.current.advanceToObjectives;
      const firstAdvanceToTitle = result.current.advanceToTitle;
      const firstAdvanceToPlaying = result.current.advanceToPlaying;
      const firstResetToStart = result.current.resetToStart;

      rerender();

      expect(result.current.advanceToObjectives).toBe(firstAdvanceToObjectives);
      expect(result.current.advanceToTitle).toBe(firstAdvanceToTitle);
      expect(result.current.advanceToPlaying).toBe(firstAdvanceToPlaying);
      expect(result.current.resetToStart).toBe(firstResetToStart);
    });
  });
});
