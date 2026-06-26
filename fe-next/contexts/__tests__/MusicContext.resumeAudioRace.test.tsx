import { vi } from 'vitest';
/**
 * Regression: resume-before-play race ("stuck moments").
 *
 * On tab/window return, resumeAudio() resumes the GLOBAL AudioContext and then
 * plays the current Howl. The bug: ctx.resume() (async) was fired without being
 * awaited, then play() ran synchronously on a context that was still SUSPENDED.
 * On slow devices play lands before resume completes → the track (and, because
 * Web Audio shares ONE context, every SFX) stays silent/stuck until the next
 * gesture.
 *
 * Desired behavior: play() for the resume path must happen only AFTER
 * ctx.resume() resolves.
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
  ctxState: 'running' as string,
  // Deferred, manually-resolved resume so we can observe play ordering.
  resolveResume: null as null | (() => void),
  resume: vi.fn(),
  suspend: vi.fn(),
};

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
  createLazyHowl: vi.fn((_src, options) => ({
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
    onloaderror: options?.onloaderror,
    onplayerror: options?.onplayerror,
    onend: options?.onend,
  })),
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

function setHasFocus(value: boolean) {
  Object.defineProperty(document, 'hasFocus', { writable: true, value: vi.fn(() => value) });
}
function setVisibility(value: string) {
  Object.defineProperty(document, 'visibilityState', { writable: true, value });
}

describe('MusicContext — resume-before-play race', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.play.mockClear();
    mockState.volume.mockClear().mockReturnValue(0.5);
    mockState.state.mockReturnValue('loaded');
    mockState.playing.mockReturnValue(false);
    mockState.ctxState = 'running';
    mockState.resolveResume = null;
    mockState.resume.mockReset().mockImplementation(
      () => new Promise<void>((resolve) => { mockState.resolveResume = resolve; })
    );
    setHasFocus(true);
    setVisibility('visible');
  });

  it('does not play the current track until ctx.resume() resolves on tab return', async () => {
    render(<MusicProvider><TestView /></MusicProvider>);

    // Unlock + start the lobby track while focused.
    await act(async () => { fireEvent.click(screen.getByTestId('unlock')); });
    await waitFor(() => expect(mockState.play).toHaveBeenCalled());

    // Track is now playing.
    mockState.playing.mockReturnValue(true);

    // Tab hidden → suspendAudio() suspends the global ctx + pauses the Howl.
    await act(async () => {
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    mockState.ctxState = 'suspended';
    mockState.playing.mockReturnValue(false); // paused

    // Fresh counters for the resume path.
    mockState.play.mockClear();
    mockState.resume.mockClear();

    // Tab visible again → resumeAudio() should resume FIRST, then play.
    await act(async () => {
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // resume() was invoked, but its promise is still pending …
    expect(mockState.resume).toHaveBeenCalled();
    // … so play() must NOT have fired yet (the bug fires it synchronously here).
    expect(mockState.play).not.toHaveBeenCalled();

    // Resolve resume → now the track may play.
    await act(async () => {
      mockState.resolveResume?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(mockState.play).toHaveBeenCalled());
  });
});
