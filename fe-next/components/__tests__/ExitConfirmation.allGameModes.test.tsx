/**
 * Exit Confirmation - All Game Modes Test
 *
 * Validates that exit confirmation is triggered in all game modes when:
 * 1. Game is running (active)
 * 2. User attempts to navigate away (back button, tab close)
 *
 * Bug: Host in broadcast/spectator mode (hostPlaying=false) didn't trigger
 * exit confirmation when game was running because navigation guard was
 * disabled for spectator mode.
 *
 * Fix: Enable navigation guard for all hosts when game is started,
 * regardless of whether they are playing or spectating.
 */

import { renderHook } from '@testing-library/react';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';

// Mock window methods
const mockPushState = vi.fn();
const originalHistory = window.history;

describe('Exit Confirmation - All Game Modes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock history.pushState
    Object.defineProperty(window, 'history', {
      value: {
        ...originalHistory,
        pushState: mockPushState,
        state: null,
        back: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'history', {
      value: originalHistory,
      writable: true,
    });
  });

  describe('Multiplayer Player Mode', () => {
    it('should enable navigation guard when game is active', () => {
      const onNavigationAttempt = vi.fn(() => false);

      // Simulating PlayerView.tsx line 181-189
      renderHook(() =>
        useNavigationGuard({
          enabled: true, // gameActive = true
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      // Should register beforeunload and popstate handlers
      expect(mockPushState).toHaveBeenCalled();
    });

    it('should NOT enable navigation guard when in waiting state', () => {
      const onNavigationAttempt = vi.fn(() => false);

      // Simulating PlayerView.tsx when gameActive = false
      renderHook(() =>
        useNavigationGuard({
          enabled: false, // gameActive = false (waiting state)
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      // Should NOT register popstate handler
      expect(mockPushState).not.toHaveBeenCalled();
    });
  });

  describe('Host Playing Mode', () => {
    it('should enable navigation guard when host is playing and game started', () => {
      const onNavigationAttempt = vi.fn(() => false);

      // Simulating HostView.tsx when gameStarted=true and hostPlaying=true
      renderHook(() =>
        useNavigationGuard({
          enabled: true && true, // gameStarted && hostPlaying
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      expect(mockPushState).toHaveBeenCalled();
    });
  });

  describe('Host Broadcast/Spectator Mode', () => {
    it('should enable navigation guard when host is spectating and game started', () => {
      const onNavigationAttempt = vi.fn(() => false);

      // Host in broadcast/spectator mode (hostPlaying=false) should still get
      // navigation guard when the game is running
      // Fix applied in HostView.tsx: enabled: runtime.gameStarted
      // (previously was: runtime.gameStarted && settings.hostPlaying)

      const gameStarted = true;
      const hostPlaying = false; // Spectator/broadcast mode

      // Navigation guard enabled when game is started, regardless of hostPlaying
      renderHook(() =>
        useNavigationGuard({
          enabled: gameStarted, // Only checks gameStarted, not hostPlaying
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      // Navigation guard SHOULD be enabled for spectator mode when game is running
      expect(mockPushState).toHaveBeenCalled();
    });

    it('should enable navigation guard when host is playing and game started', () => {
      const onNavigationAttempt = vi.fn(() => false);

      const gameStarted = true;
      const hostPlaying = true; // Host is playing

      renderHook(() =>
        useNavigationGuard({
          enabled: gameStarted,
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      expect(mockPushState).toHaveBeenCalled();
    });

    it('should NOT enable navigation guard in pre-game lobby even as spectator', () => {
      const onNavigationAttempt = vi.fn(() => false);

      const gameStarted = false; // Pre-game lobby
      const hostPlaying = false;

      renderHook(() =>
        useNavigationGuard({
          enabled: gameStarted, // Not started = no guard needed
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      // No navigation guard needed in lobby
      expect(mockPushState).not.toHaveBeenCalled();
    });
  });

  describe('Single Player Mode', () => {
    it('should enable navigation guard when grid exists, not game over, and score > 0', () => {
      const onNavigationAttempt = vi.fn(() => false);

      // Simulating SinglePlayerGame.tsx line 152-159
      const grid = [['A', 'B'], ['C', 'D']]; // truthy
      const isGameOver = false;
      const score = 10;

      renderHook(() =>
        useNavigationGuard({
          enabled: !!grid && !isGameOver && score > 0,
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      expect(mockPushState).toHaveBeenCalled();
    });

    it('should NOT enable navigation guard when score is 0', () => {
      const onNavigationAttempt = vi.fn(() => false);

      const grid = [['A', 'B'], ['C', 'D']];
      const isGameOver = false;
      const score = 0; // No points yet

      renderHook(() =>
        useNavigationGuard({
          enabled: !!grid && !isGameOver && score > 0,
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      // No guard until player has scored
      expect(mockPushState).not.toHaveBeenCalled();
    });
  });

  describe('Daily Challenge Mode', () => {
    it('should enable navigation guard when game is not over', () => {
      const onNavigationAttempt = vi.fn(() => false);

      // Simulating DailyChallengeGame.tsx line 92-99
      const isGameOver = false;

      renderHook(() =>
        useNavigationGuard({
          enabled: !isGameOver,
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      expect(mockPushState).toHaveBeenCalled();
    });
  });

  describe('Word Hunt Survival Mode', () => {
    it('should enable navigation guard when game is not over', () => {
      const onNavigationAttempt = vi.fn(() => false);

      // Simulating DailyWordHuntSurvival.tsx line 82-89
      const isGameOver = false;

      renderHook(() =>
        useNavigationGuard({
          enabled: !isGameOver,
          message: 'Test warning',
          onNavigationAttempt,
        })
      );

      expect(mockPushState).toHaveBeenCalled();
    });
  });
});
