/**
 * Tests for MusicContext auto-unmute on game start
 *
 * BUG: When user starts Word Hunt, music plays but is muted (volume 0)
 * until user manually clicks the sound controller.
 *
 * Root cause: `isMuted` is persisted to localStorage from previous session.
 * When `fadeToTrack` runs, it uses `targetVolume = isMutedRef.current ? 0 : volumeRef.current`
 * If isMuted was true in localStorage, targetVolume is 0 and music plays silently.
 *
 * Expected behavior: When user explicitly starts a game (user gesture via unlockAudio),
 * audio should auto-unmute so they can hear the game music.
 */

import React from 'react';
import { render, fireEvent, waitFor, screen, act, cleanup } from '@testing-library/react';

// Create mock storage for mutable mock state
const mockState = {
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  fade: jest.fn(),
  volume: jest.fn().mockReturnValue(0.5),
  state: jest.fn().mockReturnValue('loaded'),
  playing: jest.fn().mockReturnValue(false),
  unload: jest.fn(),
  seek: jest.fn(),
  ctxState: 'running' as string,
  resume: jest.fn().mockResolvedValue(undefined),
  suspend: jest.fn(),
  // Track the actual volume set during fade
  lastFadeToVolume: 0,
};

// Mock modules using factory functions that reference mockState
jest.mock('howler', () => ({
  Howl: jest.fn(() => ({
    play: () => mockState.play(),
    pause: () => mockState.pause(),
    stop: () => mockState.stop(),
    fade: (from: number, to: number, duration: number) => {
      mockState.lastFadeToVolume = to;
      return mockState.fade(from, to, duration);
    },
    volume: (v?: number) => (v !== undefined ? mockState.volume(v) : mockState.volume()),
    state: () => mockState.state(),
    playing: () => mockState.playing(),
    unload: () => mockState.unload(),
    seek: (v?: number) => mockState.seek(v),
  })),
  Howler: {
    get ctx() {
      return {
        get state() {
          return mockState.ctxState;
        },
        resume: () => mockState.resume(),
        suspend: () => mockState.suspend(),
      };
    },
  },
}));

jest.mock('@/lib/audio/audioLoader', () => ({
  createLazyHowl: jest.fn((_src, options) => {
    // Store callbacks from options but don't spread over methods
    const callbacks = {
      onloaderror: options?.onloaderror,
      onplayerror: options?.onplayerror,
      onend: options?.onend,
    };
    return {
      play: () => mockState.play(),
      pause: () => mockState.pause(),
      stop: () => mockState.stop(),
      fade: (from: number, to: number, duration: number) => {
        mockState.lastFadeToVolume = to;
        return mockState.fade(from, to, duration);
      },
      volume: (v?: number) => (v !== undefined ? mockState.volume(v) : mockState.volume()),
      state: () => mockState.state(),
      playing: () => mockState.playing(),
      unload: () => mockState.unload(),
      seek: (v?: number) => mockState.seek(v),
      load: () => {},
      once: () => {},
      on: () => {},
      off: () => {},
      ...callbacks,
    };
  }),
  preloadAudioOnDemand: jest.fn().mockResolvedValue(undefined),
}));

import { MusicProvider, useMusic } from '../MusicContext';

// Test component that simulates DailyChallenge's exact flow
// with ability to set muted state before starting game
function TestDailyChallengeFlowWithMute() {
  const { fadeToTrack, TRACKS, audioUnlocked, unlockAudio, isMuted, toggleMute } = useMusic();
  const [phase, setPhase] = React.useState<'ready' | 'playing'>('ready');

  // This simulates DailyChallenge.handleStartGame
  const handleStartGame = React.useCallback(() => {
    // CRITICAL: unlockAudio is called FIRST, then setPhase
    unlockAudio();
    setPhase('playing');
  }, [unlockAudio]);

  // This simulates useGameMusic calling fadeToTrack when phase becomes 'playing'
  React.useEffect(() => {
    if (phase === 'playing') {
      fadeToTrack(TRACKS.BOSSA_ARCADE, 800, 800);
    }
  }, [phase, fadeToTrack, TRACKS]);

  return (
    <div>
      <div data-testid="audio-unlocked">{audioUnlocked ? 'unlocked' : 'locked'}</div>
      <div data-testid="is-muted">{isMuted ? 'muted' : 'unmuted'}</div>
      <div data-testid="phase">{phase}</div>
      {phase === 'ready' && (
        <>
          <button data-testid="mute-button" onClick={toggleMute}>
            Toggle Mute
          </button>
          <button data-testid="start-button" onClick={handleStartGame}>
            Start Game
          </button>
        </>
      )}
      {phase === 'playing' && <div data-testid="game-screen">Game Running</div>}
    </div>
  );
}

describe('MusicContext - Auto Unmute on Game Start', () => {
  // Store original hasFocus to restore later
  const originalHasFocus = document.hasFocus;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Clear localStorage between tests
    localStorage.clear();

    // Mock document.hasFocus to return true (simulates focused window)
    // Without this, JSDOM returns false and fade() is skipped
    document.hasFocus = jest.fn().mockReturnValue(true);

    // Reset mock state
    mockState.play.mockClear();
    mockState.fade.mockClear();
    mockState.stop.mockClear();
    mockState.volume.mockClear().mockReturnValue(0.5);
    mockState.state.mockReturnValue('loaded');
    mockState.playing.mockReturnValue(false);
    mockState.ctxState = 'running';
    mockState.resume.mockClear();
    mockState.lastFadeToVolume = 0;
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    // Restore original hasFocus
    document.hasFocus = originalHasFocus;
  });


  describe('BUG: Music plays muted when isMuted=true at game start', () => {
    it('should auto-unmute when user starts game after toggling mute', async () => {
      // This test simulates the scenario where:
      // 1. User mutes audio (isMuted becomes true)
      // 2. User then clicks "Start Game" (unlockAudio is called)
      // 3. BUG: Music plays at volume 0 because isMuted is still true
      // 4. EXPECTED: unlockAudio should auto-unmute so user can hear game music

      // Verify hasFocus mock is working
      expect(document.hasFocus()).toBe(true);

      render(
        <MusicProvider>
          <TestDailyChallengeFlowWithMute />
        </MusicProvider>
      );

      // Initially audio should be locked and unmuted
      expect(screen.getByTestId('audio-unlocked').textContent).toBe('locked');
      expect(screen.getByTestId('is-muted').textContent).toBe('unmuted');

      // GIVEN: User mutes audio (simulates localStorage having isMuted=true)
      await act(async () => {
        fireEvent.click(screen.getByTestId('mute-button'));
      });

      // Verify muted state
      expect(screen.getByTestId('is-muted').textContent).toBe('muted');

      // WHEN: User clicks "Start Game" button (user gesture)
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-button'));
      });

      // Phase should change immediately
      expect(screen.getByTestId('phase').textContent).toBe('playing');

      // Audio should be unlocked
      await waitFor(() => {
        expect(screen.getByTestId('audio-unlocked').textContent).toBe('unlocked');
      });

      // Advance timers for internal delays
      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      // Music should start playing
      await waitFor(() => {
        expect(mockState.play).toHaveBeenCalled();
      });

      // THEN: Fade should have been called
      expect(mockState.fade).toHaveBeenCalled();

      // AND: Music should fade to AUDIBLE volume (not 0)
      // This is the CRITICAL assertion - if this fails, the bug exists
      expect(mockState.lastFadeToVolume).toBeGreaterThan(0);

      // AND: isMuted should be false after game start (auto-unmuted)
      expect(screen.getByTestId('is-muted').textContent).toBe('unmuted');
    });

    it('should play at correct volume when already unmuted', async () => {
      render(
        <MusicProvider>
          <TestDailyChallengeFlowWithMute />
        </MusicProvider>
      );

      // Initially unmuted
      expect(screen.getByTestId('is-muted').textContent).toBe('unmuted');

      // WHEN: User clicks "Start Game" button
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-button'));
      });

      // Audio should be unlocked
      await waitFor(() => {
        expect(screen.getByTestId('audio-unlocked').textContent).toBe('unlocked');
      });

      // Advance timers - need enough time for pending track processing (100ms) + fade
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // THEN: Music should fade to the default volume (0.5)
      await waitFor(
        () => {
          expect(mockState.play).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Check that fade was called - the lastFadeToVolume tracks the 'to' value
      expect(mockState.fade).toHaveBeenCalled();
      expect(mockState.lastFadeToVolume).toBe(0.5);
    });
  });
});
