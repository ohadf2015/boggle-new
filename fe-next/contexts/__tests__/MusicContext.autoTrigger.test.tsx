import { vi, type Mock, } from 'vitest';
/**
 * Tests for MusicContext automatic music triggering
 * Reproduces the bug where music doesn't play when daily challenge starts
 */

import React from 'react';
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
  ctxState: 'running' as string,
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

import { MusicProvider, useMusic } from '../MusicContext';

// Test component that triggers music on button click
function TestMusicTrigger() {
  const { fadeToTrack, TRACKS, audioUnlocked, isPlaying, currentTrack } = useMusic();
  const [showGame, setShowGame] = React.useState(false);

  // This simulates what useGameMusic does for survival mode
  React.useEffect(() => {
    if (showGame) {
      // Simulate useGameMusic calling fadeToTrack
      fadeToTrack(TRACKS.BOSSA_ARCADE, 800, 800);
    }
  }, [showGame, fadeToTrack, TRACKS]);

  return (
    <div>
      <div data-testid="audio-unlocked">{audioUnlocked ? 'unlocked' : 'locked'}</div>
      <div data-testid="is-playing">{isPlaying ? 'playing' : 'stopped'}</div>
      <div data-testid="current-track">{currentTrack || 'none'}</div>
      {!showGame && (
        <button data-testid="start-button" onClick={() => setShowGame(true)}>
          Start Game
        </button>
      )}
      {showGame && <div data-testid="game-screen">Game Running</div>}
    </div>
  );
}

// Test component that simulates DailyChallenge's exact flow:
// unlockAudio() is called BEFORE the game component mounts
function TestDailyChallengeFlow() {
  const { fadeToTrack, TRACKS, audioUnlocked, unlockAudio } = useMusic();
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
      <div data-testid="phase">{phase}</div>
      {phase === 'ready' && (
        <button data-testid="start-button" onClick={handleStartGame}>
          Start Game
        </button>
      )}
      {phase === 'playing' && <div data-testid="game-screen">Game Running</div>}
    </div>
  );
}

describe('MusicContext - Auto Trigger on Game Start', () => {
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
    mockState.ctxState = 'running';
    mockState.resume.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('BUG REPRO: unlockAudio then immediate fadeToTrack should play', async () => {
    // This test reproduces the exact flow in DailyChallenge:
    // 1. User clicks "Play" button
    // 2. handleStartGame calls unlockAudio() synchronously
    // 3. handleStartGame calls setPhase('playing')
    // 4. Game component mounts and useGameMusic calls fadeToTrack
    // 5. BUG: Music doesn't play because...?

    render(
      <MusicProvider>
        <TestDailyChallengeFlow />
      </MusicProvider>
    );

    // Initially audio should be locked
    expect(screen.getByTestId('audio-unlocked').textContent).toBe('locked');
    expect(screen.getByTestId('phase').textContent).toBe('ready');

    // Click the start button - this mimics handleStartGame
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Phase should change immediately
    expect(screen.getByTestId('phase').textContent).toBe('playing');

    // Audio should be unlocked
    await waitFor(() => {
      expect(screen.getByTestId('audio-unlocked').textContent).toBe('unlocked');
    });

    // Advance timers for any internal delays
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // CRITICAL: Music should play
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should unlock audio when user clicks start button', async () => {
    render(
      <MusicProvider>
        <TestMusicTrigger />
      </MusicProvider>
    );

    // Initially audio should be locked
    expect(screen.getByTestId('audio-unlocked').textContent).toBe('locked');

    // Click the start button
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Audio should be unlocked after click
    await waitFor(() => {
      expect(screen.getByTestId('audio-unlocked').textContent).toBe('unlocked');
    });
  });

  it('should call play on Howl after click and state change', async () => {
    render(
      <MusicProvider>
        <TestMusicTrigger />
      </MusicProvider>
    );

    // Click the start button
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Wait for game screen to show
    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument();
    });

    // Advance timers for async operations
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Howl.play should have been called
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    });
  });

  it('should queue track when clicked but audio not ready, then play when ready', async () => {
    // Start with suspended context
    mockState.ctxState = 'suspended';

    render(
      <MusicProvider>
        <TestMusicTrigger />
      </MusicProvider>
    );

    // Click the start button - this should unlock audio
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Wait for game screen to appear
    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument();
    });

    // Audio should get unlocked
    await waitFor(() => {
      expect(screen.getByTestId('audio-unlocked').textContent).toBe('unlocked');
    });

    // Advance timers to allow pending track to play
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Howl.play should eventually be called
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    });
  });

  it('should handle fadeToTrack called BEFORE unlockAudio (race condition)', async () => {
    // This tests the scenario where:
    // 1. Component mounts with game already in 'playing' state
    // 2. useGameMusic calls fadeToTrack immediately
    // 3. But audio hasn't been unlocked yet
    // 4. User clicks something -> unlockAudio is called
    // 5. BUG: The queued track should play but might not

    // Test component where game starts immediately (no user click to start)
    function TestImmediateGame() {
      const { fadeToTrack, TRACKS, audioUnlocked, unlockAudio } = useMusic();
      const calledRef = React.useRef(false);

      // Game immediately starts - useGameMusic calls fadeToTrack on mount
      React.useEffect(() => {
        if (!calledRef.current) {
          calledRef.current = true;
          fadeToTrack(TRACKS.BOSSA_ARCADE, 800, 800);
        }
      }, [fadeToTrack, TRACKS]);

      return (
        <div>
          <div data-testid="audio-unlocked">{audioUnlocked ? 'unlocked' : 'locked'}</div>
          <button data-testid="unlock-button" onClick={unlockAudio}>
            Unlock Audio
          </button>
        </div>
      );
    }

    render(
      <MusicProvider>
        <TestImmediateGame />
      </MusicProvider>
    );

    // Audio starts locked
    expect(screen.getByTestId('audio-unlocked').textContent).toBe('locked');

    // fadeToTrack was already called (on mount), so track should be queued
    // Music should NOT be playing yet
    expect(mockState.play).not.toHaveBeenCalled();

    // Now user clicks to unlock audio
    await act(async () => {
      fireEvent.click(screen.getByTestId('unlock-button'));
    });

    // Audio should be unlocked
    await waitFor(() => {
      expect(screen.getByTestId('audio-unlocked').textContent).toBe('unlocked');
    });

    // Advance timers for the 100ms delay in processing pending tracks
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // NOW the queued track should play
    await waitFor(() => {
      expect(mockState.play).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});
