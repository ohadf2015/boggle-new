import { vi, type Mock, } from 'vitest';
/**
 * Tests for MusicContext mute persistence.
 *
 * Persisted mute MUST survive across sessions and mobile app cold starts.
 * An earlier implementation auto-unmuted on the first track of a new provider
 * lifetime ("stale-mute recovery"), which silently discarded the user's mute
 * choice on every page reload / app launch. That logic has been removed —
 * the `isMuted` flag stored in localStorage is now honored verbatim.
 *
 * In-session mute also persists across `fadeToTrack` calls (route changes,
 * game-mode transitions) — earlier code unmuted on every fade, which made
 * mute "come back" after navigation.
 */

import React from 'react';
import { render, fireEvent, waitFor, screen, act, cleanup } from '@testing-library/react';

// Create mock storage for mutable mock state
const mockState = {
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  fade: vi.fn(),
  volume: vi.fn().mockReturnValue(0.5),
  state: vi.fn().mockReturnValue('loaded'),
  playing: vi.fn().mockReturnValue(false),
  unload: vi.fn(),
  seek: vi.fn(),
  ctxState: 'running' as string,
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn(),
  // Track the actual volume set during fade
  lastFadeToVolume: 0,
};

// Mock modules using factory functions that reference mockState
vi.mock('howler', () => ({
  Howl: vi.fn(() => ({
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

vi.mock('@/lib/audio/audioLoader', () => ({
  createLazyHowl: vi.fn((_src, options) => {
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
  preloadAudioOnDemand: vi.fn().mockResolvedValue(undefined),
  ensureHowl: vi.fn().mockResolvedValue(vi.fn()),
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

describe('MusicContext - Mute Persistence', () => {
  // Store original hasFocus to restore later
  const originalHasFocus = document.hasFocus;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Clear localStorage between tests
    localStorage.clear();

    // Mock document.hasFocus to return true (simulates focused window)
    // Without this, JSDOM returns false and fade() is skipped
    document.hasFocus = vi.fn().mockReturnValue(true);

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
    vi.useRealTimers();
    // Restore original hasFocus
    document.hasFocus = originalHasFocus;
  });


  describe('persisted mute survives a fresh session', () => {
    it('honors isMuted=true on the first track of the session (no auto-unmute)', async () => {
      // Simulates the cold-start scenario:
      // 1. User had isMuted=true persisted in localStorage from a previous session.
      // 2. On app launch, MusicProvider hydrates with isMuted=true.
      // 3. User starts a game → fadeToTrack runs for the first time this lifetime.
      // 4. EXPECTED: Mute is honored — track plays at volume 0, isMuted stays true.

      expect(document.hasFocus()).toBe(true);

      render(
        <MusicProvider>
          <TestDailyChallengeFlowWithMute />
        </MusicProvider>
      );

      expect(screen.getByTestId('audio-unlocked').textContent).toBe('locked');
      expect(screen.getByTestId('is-muted').textContent).toBe('unmuted');

      // Mute before the first track plays. This stands in for a hydrated
      // isMuted=true from localStorage — fadeToTrack has not yet run.
      await act(async () => {
        fireEvent.click(screen.getByTestId('mute-button'));
      });
      expect(screen.getByTestId('is-muted').textContent).toBe('muted');

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-button'));
      });

      expect(screen.getByTestId('phase').textContent).toBe('playing');

      await waitFor(() => {
        expect(screen.getByTestId('audio-unlocked').textContent).toBe('unlocked');
      });

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockState.play).toHaveBeenCalled();
      });

      // The fade must target volume 0 (muted), and isMuted must remain true.
      // If either of these flips, the auto-unmute regression is back.
      expect(mockState.fade).toHaveBeenCalled();
      expect(mockState.lastFadeToVolume).toBe(0);
      expect(screen.getByTestId('is-muted').textContent).toBe('muted');
    });

    it('should persist in-session mute across track changes (no auto-unmute on subsequent fadeToTrack)', async () => {
      // GIVEN: User starts a game (unlocks audio), mutes mid-session,
      // then navigates to another screen which calls fadeToTrack with a different track.
      // EXPECTED: Mute persists. Previously fadeToTrack always auto-unmuted, causing
      // the user-reported "mute keeps coming back" bug.

      function TestNavigateAfterMute(): React.ReactElement {
        const { fadeToTrack, TRACKS, audioUnlocked, unlockAudio, isMuted, toggleMute } = useMusic();
        const [phase, setPhase] = React.useState<'ready' | 'playing' | 'lobby'>('ready');

        const handleStart = React.useCallback(() => {
          unlockAudio();
          setPhase('playing');
        }, [unlockAudio]);

        const handleNavigate = React.useCallback(() => {
          setPhase('lobby');
        }, []);

        React.useEffect(() => {
          if (phase === 'playing') fadeToTrack(TRACKS.IN_GAME, 800, 800);
          if (phase === 'lobby') fadeToTrack(TRACKS.LOBBY, 800, 800);
        }, [phase, fadeToTrack, TRACKS]);

        return (
          <div>
            <div data-testid="audio-unlocked">{audioUnlocked ? 'unlocked' : 'locked'}</div>
            <div data-testid="is-muted">{isMuted ? 'muted' : 'unmuted'}</div>
            <div data-testid="phase">{phase}</div>
            <button data-testid="start" onClick={handleStart}>Start</button>
            <button data-testid="mute" onClick={toggleMute}>Mute</button>
            <button data-testid="navigate" onClick={handleNavigate}>Navigate</button>
          </div>
        );
      }

      render(
        <MusicProvider>
          <TestNavigateAfterMute />
        </MusicProvider>
      );

      // Start game — audio unlocks, in-game track begins.
      await act(async () => {
        fireEvent.click(screen.getByTestId('start'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('audio-unlocked').textContent).toBe('unlocked');
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await waitFor(() => {
        expect(mockState.play).toHaveBeenCalled();
      });

      // User mutes mid-game.
      await act(async () => {
        fireEvent.click(screen.getByTestId('mute'));
      });
      expect(screen.getByTestId('is-muted').textContent).toBe('muted');

      // Reset mocks so we observe ONLY the navigation fade.
      mockState.fade.mockClear();
      mockState.play.mockClear();
      mockState.lastFadeToVolume = -1;

      // Navigate — triggers fadeToTrack for a different track.
      await act(async () => {
        fireEvent.click(screen.getByTestId('navigate'));
      });
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Mute MUST persist.
      expect(screen.getByTestId('is-muted').textContent).toBe('muted');

      // The navigation fade should target volume 0 (muted), not the user's volume.
      // If a fade ran, it must be to 0; otherwise lastFadeToVolume stays at the -1 sentinel.
      if (mockState.fade.mock.calls.length > 0) {
        expect(mockState.lastFadeToVolume).toBe(0);
      }
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
        vi.advanceTimersByTime(300);
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
