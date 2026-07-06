import { vi } from 'vitest';
/**
 * Regression for Sentry JAVASCRIPT-NEXTJS-1PP: "RangeError: Maximum call
 * stack size exceeded" on the homepage (`a._ended` <-> `a.play` alternating,
 * matching Howler's internal play/end cycle).
 *
 * MusicContext's onplayerror handler retries play() after resuming a
 * suspended AudioContext, with no guard against re-entering while a retry is
 * already in flight — unlike useAdventureMusic.ts's onend loop, which
 * documents this exact hazard (a corrupted/0-duration track can fail
 * synchronously, re-firing the error handler on the same stack) and guards
 * against it. This locks in the same guard on MusicContext's retry path.
 */

import React, { useEffect } from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react';

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

// The captured onplayerror handler, so the test can fire it directly —
// exactly like Howler does internally when a play() attempt fails.
let capturedOnPlayError: ((id: unknown, err: unknown) => void) | undefined;

vi.mock('howler', () => ({
  Howl: vi.fn(() => ({ play: () => mockState.play() })),
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
    capturedOnPlayError = options?.onplayerror;
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
    };
  }),
  preloadAudioOnDemand: vi.fn().mockResolvedValue(undefined),
  ensureHowl: vi.fn().mockResolvedValue(vi.fn()),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { MusicProvider, useMusic } from '../MusicContext';

function TestView() {
  const { playTrack, TRACKS } = useMusic();
  useEffect(() => { playTrack(TRACKS.LOBBY); }, [playTrack, TRACKS]);
  return <div data-testid="view"><button data-testid="unlock">unlock</button></div>;
}

describe('MusicContext — onplayerror retry guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnPlayError = undefined;
    mockState.ctxState = 'suspended';
    mockState.resume.mockClear().mockResolvedValue(undefined);
    mockState.play.mockClear();
  });

  it('does not re-enter the retry when play() keeps failing synchronously', async () => {
    render(<MusicProvider><TestView /></MusicProvider>);
    await act(async () => { fireEvent.click(screen.getByTestId('unlock')); });
    await waitFor(() => expect(capturedOnPlayError).toBeDefined());
    mockState.play.mockClear(); // isolate calls to the retry flow below

    // Every retry attempt fails synchronously too — Howler would normally
    // re-fire onplayerror itself on such a failure; simulate that here to
    // reproduce the re-entrancy the guard exists to stop.
    mockState.play.mockImplementation(() => {
      capturedOnPlayError?.(1, new Error('decode failed'));
      throw new Error('decode failed');
    });

    await act(async () => {
      capturedOnPlayError?.(1, new Error('decode failed'));
      // Let the getHowler()/ctx.resume() microtask chain settle.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Without the guard this recurses without bound; with it, the retry
    // fires once and the re-entrant call bails immediately.
    expect(mockState.play.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
