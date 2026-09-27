import { vi } from 'vitest';

/**
 * Sentry JAVASCRIPT-NEXTJS-1PP / 1RZ: "Maximum call stack size exceeded" with
 * Howler's `_ended` <-> `play` alternating. Howler's play() ends a sound
 * SYNCHRONOUSLY when `seek >= stop`; for a track whose decoded duration is 0
 * (corrupt / truncated file, CDN 200 with an empty body) stop is 0, so a
 * `loop: true` Howl recurses `_ended → play → _ended` without bound. The
 * onplayerror retry guard did not cover this path (events kept coming after
 * that fix shipped). The fix: once a track loads, a zero-duration Howl must
 * stop looping.
 */

import React, { useEffect } from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';

let capturedOnLoad: (() => void) | undefined;
const loopSpy = vi.fn();
const mockState = { duration: 0 };

vi.mock('howler', () => ({
  Howl: vi.fn(() => ({ play: vi.fn() })),
  Howler: { ctx: { state: 'running', resume: () => Promise.resolve(), suspend: () => Promise.resolve() } },
}));

vi.mock('@/lib/audio/audioLoader', () => ({
  createLazyHowl: vi.fn((_src, options) => {
    capturedOnLoad = options?.onload;
    return {
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      fade: vi.fn(),
      volume: vi.fn(),
      state: () => 'loaded',
      playing: () => false,
      unload: vi.fn(),
      seek: vi.fn(),
      load: vi.fn(),
      duration: () => mockState.duration,
      loop: (...args: unknown[]) => loopSpy(...args),
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

describe('MusicContext — zero-duration loop guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnLoad = undefined;
  });

  it('turns looping off for a track that loads with no duration', async () => {
    mockState.duration = 0;
    render(<MusicProvider><TestView /></MusicProvider>);
    await act(async () => { fireEvent.click(screen.getByTestId('unlock')); });
    await waitFor(() => expect(capturedOnLoad).toBeDefined());

    act(() => { capturedOnLoad?.(); });

    expect(loopSpy).toHaveBeenCalledWith(false);
  });

  it('leaves a healthy track looping', async () => {
    mockState.duration = 92.4;
    render(<MusicProvider><TestView /></MusicProvider>);
    await act(async () => { fireEvent.click(screen.getByTestId('unlock')); });
    await waitFor(() => expect(capturedOnLoad).toBeDefined());

    act(() => { capturedOnLoad?.(); });

    expect(loopSpy).not.toHaveBeenCalledWith(false);
  });
});
