import { vi, type Mock, } from 'vitest';
/**
 * Test for music autoplay when window focus state is false at mount
 *
 * BUG: Music doesn't play on first user interaction when document.hasFocus()
 * returns false at component mount time. This happens when:
 * 1. Page is opened from another app (e.g., WhatsApp link)
 * 2. Browser tab opens in background
 * 3. Page loads before document fully focuses
 *
 * The issue is that windowFocusedRef is initialized with document.hasFocus()
 * at mount time, and when fadeToTrack is called, it checks this ref and
 * immediately pauses the track if false.
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
  ctxState: 'suspended' as string,
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
 * Test component that simulates LandingView behavior
 */
function TestLandingView() {
  const { playTrack, TRACKS, audioUnlocked, isPlaying, currentTrack } = useMusic();

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
      <div data-testid="content-area" style={{ padding: '100px' }}>
        <h1>Welcome to LexiClash!</h1>
        <button data-testid="play-button">Play Game</button>
      </div>
    </div>
  );
}

describe('MusicContext - Autoplay with Window Focus Issues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset mock state
    mockState.play.mockClear();
    mockState.pause.mockClear();
    mockState.fade.mockClear();
    mockState.stop.mockClear();
    mockState.volume.mockClear().mockReturnValue(0.5);
    mockState.state.mockReturnValue('loaded');
    mockState.playing.mockReturnValue(false);
    mockState.ctxState = 'suspended';
    mockState.resume.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('BUG: should play music even when document.hasFocus() is false at mount', async () => {
    // CRITICAL: Simulate document.hasFocus() returning false at mount time
    // This happens when page is opened from WhatsApp or other external links
    const originalHasFocus = document.hasFocus;
    Object.defineProperty(document, 'hasFocus', {
      writable: true,
      value: vi.fn(() => false) // False at mount!
    });

    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible'
    });

    render(
      <MusicProvider>
        <TestLandingView />
      </MusicProvider>
    );

    // Initially audio is locked
    expect(screen.getByTestId('audio-state').textContent).toContain('locked');

    // Now user clicks (which means window IS focused, even if hasFocus was wrong)
    // Simulate the window gaining focus BEFORE the click
    // In reality, clicking focuses the window
    Object.defineProperty(document, 'hasFocus', {
      writable: true,
      value: vi.fn(() => true) // Now true after user interaction
    });

    // Fire focus event to update windowFocusedRef
    await act(async () => {
      fireEvent.focus(window);
    });

    // User clicks the content area
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

    // CRITICAL: Music should be playing, NOT paused
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Music should NOT have been paused immediately after play
    // (This is the bug - it's being paused because windowFocusedRef was false)
    const pauseCallsAfterPlay = mockState.pause.mock.calls.length;
    const playCallCount = mockState.play.mock.calls.length;

    // If pause was called more than or equal to play calls, the music was paused
    expect(pauseCallsAfterPlay).toBeLessThan(playCallCount);

    // Restore original
    Object.defineProperty(document, 'hasFocus', {
      writable: true,
      value: originalHasFocus
    });
  });

  it('should play music when user clicks even if focus state was stale', async () => {
    // Start with hasFocus = false (simulating stale state)
    Object.defineProperty(document, 'hasFocus', {
      writable: true,
      value: vi.fn(() => false)
    });

    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible'
    });

    render(
      <MusicProvider>
        <TestLandingView />
      </MusicProvider>
    );

    // User clicks - this proves window is focused (can't click without focus)
    // The click itself should be enough to ensure music plays
    await act(async () => {
      fireEvent.click(screen.getByTestId('play-button'));
    });

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Music should play - user interaction proves window is focused
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Should NOT be paused immediately
    // Check that isPlaying state is true
    await waitFor(() => {
      expect(screen.getByTestId('audio-state').textContent).toContain('playing');
    });
  });
});
