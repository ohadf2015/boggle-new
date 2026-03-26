import { vi, type Mock, } from 'vitest';
/**
 * Test for music autoplay on landing page
 *
 * BUG: Music should play when user first interacts with landing page,
 * but currently only plays when clicking the sound controller.
 *
 * This test reproduces the exact LandingView flow:
 * 1. Page mounts and calls playTrack(TRACKS.LOBBY)
 * 2. Audio is locked, so track is queued
 * 3. User clicks anywhere on the page (not just sound controller)
 * 4. handleFirstInteraction fires via document event listener
 * 5. Pending track should play
 */

import React, { useEffect } from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react';

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
  ctxState: 'suspended' as string, // Start suspended like a real browser
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn(),
};

// Mock modules using factory functions that reference mockState
vi.mock('howler', () => ({
  Howl: vi.fn(() => ({
    play: () => mockState.play(),
    pause: () => mockState.pause(),
    stop: () => mockState.stop(),
    fade: (...args: unknown[]) => mockState.fade(...args),
    volume: (v?: number) => (v !== undefined ? mockState.volume(v) : mockState.volume()),
    state: () => mockState.state(),
    playing: () => mockState.playing(),
    unload: () => mockState.unload(),
    seek: (v?: number) => mockState.seek(v),
  })),
  Howler: {
    get ctx() {
      return {
        get state() { return mockState.ctxState; },
        resume: () => mockState.resume(),
        suspend: () => mockState.suspend(),
      };
    },
  },
}));

vi.mock('@/lib/audio/audioLoader', () => ({
  createLazyHowl: vi.fn((_src, options) => {
    const callbacks = {
      onloaderror: options?.onloaderror,
      onplayerror: options?.onplayerror,
      onend: options?.onend,
    };
    return {
      play: () => mockState.play(),
      pause: () => mockState.pause(),
      stop: () => mockState.stop(),
      fade: (...args: unknown[]) => mockState.fade(...args),
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

// Mock logger
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import { MusicProvider, useMusic } from '../MusicContext';

/**
 * Test component that simulates exactly what LandingView does:
 * - On mount, calls playTrack(TRACKS.LOBBY)
 * - Has a content area the user can click
 */
function TestLandingView() {
  const { playTrack, TRACKS, audioUnlocked, isPlaying, currentTrack } = useMusic();

  // Simulate LandingView's useEffect that plays lobby music on mount
  useEffect(() => {
    playTrack(TRACKS.LOBBY);
  }, [playTrack, TRACKS]);

  return (
    <div data-testid="landing-view">
      <div data-testid="audio-state">
        {audioUnlocked ? 'unlocked' : 'locked'} |
        {isPlaying ? 'playing' : 'stopped'} |
        {currentTrack || 'no-track'}
      </div>

      {/* Content area - clicking anywhere here should unlock audio and play music */}
      <div data-testid="content-area" style={{ padding: '100px' }}>
        <h1>Welcome to LexiClash!</h1>
        <p>Click anywhere to start</p>
        <button data-testid="play-button">Play Game</button>
      </div>
    </div>
  );
}

describe('MusicContext - Landing Page Autoplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset mock state
    mockState.play.mockClear();
    mockState.fade.mockClear();
    mockState.stop.mockClear();
    mockState.volume.mockClear().mockReturnValue(0.5);
    mockState.state.mockReturnValue('loaded');
    mockState.playing.mockReturnValue(false);
    mockState.ctxState = 'suspended'; // Start suspended like real browser
    mockState.resume.mockClear();

    // Mock document focus
    Object.defineProperty(document, 'hasFocus', {
      writable: true,
      value: vi.fn(() => true)
    });

    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible'
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should play music when user clicks content area (not just sound controller)', async () => {
    // This is the MAIN test for the bug
    // Music should play when clicking ANYWHERE, not just the sound controller

    render(
      <MusicProvider>
        <TestLandingView />
      </MusicProvider>
    );

    // Initially audio should be locked and music not playing
    expect(screen.getByTestId('audio-state').textContent).toContain('locked');
    expect(screen.getByTestId('audio-state').textContent).toContain('stopped');

    // playTrack was called on mount, but audio is locked so track is queued
    expect(mockState.play).not.toHaveBeenCalled();

    // User clicks the content area (simulating clicking anywhere on landing page)
    await act(async () => {
      fireEvent.click(screen.getByTestId('content-area'));
    });

    // Audio should be unlocked after click
    await waitFor(() => {
      expect(screen.getByTestId('audio-state').textContent).toContain('unlocked');
    });

    // Advance timers to allow the 100ms delay for pending track to play
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // CRITICAL: Music should now be playing
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should play music when user clicks a button (not sound controller)', async () => {
    render(
      <MusicProvider>
        <TestLandingView />
      </MusicProvider>
    );

    // Initially music not playing
    expect(mockState.play).not.toHaveBeenCalled();

    // User clicks the play button
    await act(async () => {
      fireEvent.click(screen.getByTestId('play-button'));
    });

    // Wait for audio unlock
    await waitFor(() => {
      expect(screen.getByTestId('audio-state').textContent).toContain('unlocked');
    });

    // Advance timers for pending track
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Music should play
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should play music on keydown (keyboard interaction)', async () => {
    render(
      <MusicProvider>
        <TestLandingView />
      </MusicProvider>
    );

    // Initially music not playing
    expect(mockState.play).not.toHaveBeenCalled();

    // User presses a key
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Enter' });
    });

    // Wait for audio unlock
    await waitFor(() => {
      expect(screen.getByTestId('audio-state').textContent).toContain('unlocked');
    });

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Music should play
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should play music on touchend (mobile interaction)', async () => {
    render(
      <MusicProvider>
        <TestLandingView />
      </MusicProvider>
    );

    // Initially music not playing
    expect(mockState.play).not.toHaveBeenCalled();

    // User touches the screen
    await act(async () => {
      fireEvent.touchEnd(screen.getByTestId('content-area'));
    });

    // Wait for audio unlock
    await waitFor(() => {
      expect(screen.getByTestId('audio-state').textContent).toContain('unlocked');
    });

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Music should play
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should handle case where playTrack is called after user interaction', async () => {
    // This tests a slightly different scenario:
    // User interacts first, THEN playTrack is called
    // This should still work immediately since audio is already unlocked

    function TestDelayedPlayTrack() {
      const { playTrack, TRACKS, audioUnlocked, isPlaying, unlockAudio } = useMusic();
      const [shouldPlay, setShouldPlay] = React.useState(false);

      useEffect(() => {
        if (shouldPlay && audioUnlocked) {
          playTrack(TRACKS.LOBBY);
        }
      }, [shouldPlay, audioUnlocked, playTrack, TRACKS]);

      return (
        <div>
          <div data-testid="audio-unlocked">{audioUnlocked ? 'unlocked' : 'locked'}</div>
          <div data-testid="is-playing">{isPlaying ? 'playing' : 'stopped'}</div>
          <button
            data-testid="unlock-then-play"
            onClick={() => {
              unlockAudio();
              setShouldPlay(true);
            }}
          >
            Start
          </button>
        </div>
      );
    }

    render(
      <MusicProvider>
        <TestDelayedPlayTrack />
      </MusicProvider>
    );

    // Click button that unlocks and then plays
    await act(async () => {
      fireEvent.click(screen.getByTestId('unlock-then-play'));
    });

    // Wait for unlock
    await waitFor(() => {
      expect(screen.getByTestId('audio-unlocked').textContent).toBe('unlocked');
    });

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Music should play
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});
