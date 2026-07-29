/**
 * Tests for useLexiStuckDetection hook
 *
 * DEBT-03 + DEBT-04: Game-aware wrapper for inactivity detection
 * Detects when players are stuck in Adventure mode and triggers Lexi hints
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLexiStuckDetection } from '../useLexiStuckDetection';

// Mock the underlying inactivity detection hook
vi.mock('../useInactivityDetection', () => ({
  useInactivityDetection: vi.fn(),
}));

import { useInactivityDetection } from '../useInactivityDetection';

const mockUseInactivityDetection = useInactivityDetection as any;

describe('useLexiStuckDetection', () => {
  const mockReset = vi.fn();
  const mockOnStuck = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInactivityDetection.mockReturnValue({
      reset: mockReset,
      lastActivity: Date.now(),
    });
  });

  describe('enabled state based on game conditions', () => {
    it('should be enabled when playing and not paused', () => {
      // GIVEN: Game is playing, not paused, no modal
      renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: true,
          isPaused: false,
          isModalOpen: false,
        })
      );

      // THEN: useInactivityDetection should be called with enabled: true
      expect(mockUseInactivityDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );
    });

    it('should be disabled when not playing', () => {
      // GIVEN: Game is not playing
      renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: false,
          isPaused: false,
        })
      );

      // THEN: useInactivityDetection should be called with enabled: false
      expect(mockUseInactivityDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('should be disabled when paused', () => {
      // GIVEN: Game is playing but paused
      renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: true,
          isPaused: true,
        })
      );

      // THEN: useInactivityDetection should be called with enabled: false
      expect(mockUseInactivityDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('should be disabled when modal is open', () => {
      // GIVEN: Game is playing with modal open
      renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: true,
          isPaused: false,
          isModalOpen: true,
        })
      );

      // THEN: useInactivityDetection should be called with enabled: false
      expect(mockUseInactivityDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  describe('timeout configuration', () => {
    it('should use default 30s timeout for normal levels', () => {
      // GIVEN: Normal level (not boss)
      renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: true,
          isPaused: false,
          isBossLevel: false,
        })
      );

      // THEN: Should use 30s timeout
      expect(mockUseInactivityDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should use 45s timeout for boss levels', () => {
      // GIVEN: Boss level
      renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: true,
          isPaused: false,
          isBossLevel: true,
        })
      );

      // THEN: Should use 45s timeout for boss levels
      expect(mockUseInactivityDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 45000,
        })
      );
    });

    it('should use custom timeout when provided', () => {
      // GIVEN: Custom timeout of 60s
      renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: true,
          isPaused: false,
          timeout: 60000,
        })
      );

      // THEN: Should use custom timeout
      expect(mockUseInactivityDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    it('should prefer custom timeout over boss level timeout', () => {
      // GIVEN: Custom timeout AND boss level
      renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: true,
          isPaused: false,
          timeout: 60000,
          isBossLevel: true,
        })
      );

      // THEN: Should use custom timeout (overrides boss level default)
      expect(mockUseInactivityDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });
  });

  describe('callback forwarding', () => {
    it('should forward onStuck callback to onInactive', () => {
      // GIVEN: Hook with onStuck callback
      renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: true,
          isPaused: false,
        })
      );

      // WHEN: The callback passed to useInactivityDetection is called
      const passedCallback = mockUseInactivityDetection.mock.calls[0][0].onInactive;
      passedCallback();

      // THEN: onStuck should have been called
      expect(mockOnStuck).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetOnGameAction', () => {
    it('should expose reset function from underlying hook', () => {
      // GIVEN: Hook rendered
      const { result } = renderHook(() =>
        useLexiStuckDetection({
          onStuck: mockOnStuck,
          isPlaying: true,
          isPaused: false,
        })
      );

      // WHEN: resetOnGameAction is called
      act(() => {
        result.current.resetOnGameAction();
      });

      // THEN: Should call underlying reset
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });
});
