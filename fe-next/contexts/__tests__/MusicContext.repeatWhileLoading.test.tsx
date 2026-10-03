import { vi, type MockedClass } from 'vitest';
/**
 * Regression: re-requesting the SAME music track while it is still loading
 * restarted it in a loop.
 *
 * Howler queues stop()/volume()/play()/fade() while a Howl is not loaded yet and
 * drains the queue in order on load. playing() stays false for that whole window,
 * so fadeToTrack's "same track already playing" guard never matched and every
 * repeat request (several hooks re-fire playTrack for one phase) queued another
 * stop → volume → play → fade batch. On load the queue replays: play, stop,
 * play, stop, play … — the bed starts, is killed and restarts N times in a burst
 * (the stutter / "endless loop" on big html5 tracks over a slow connection).
 *
 * INVARIANT: a track that is already requested/loading must be started exactly
 * once; repeat requests for it are no-ops and never queue a stop().
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MusicProvider, useMusic } from '../MusicContext';
import { Howl } from 'howler';

vi.mock('howler', () => {
  const mockHowl = vi.fn().mockImplementation((options) => {
    type Task = () => void;
    const instance: any = {
      _options: options,
      _state: 'unloaded',
      _paused: true,
      _queue: [] as Task[],
      _playStarts: 0,
      _stopsAfterPlay: 0,
      _volume: options.volume || 0,

      state: vi.fn(function (this: any) { return this._state; }),
      load: vi.fn(function (this: any) {
        this._state = 'loading';
        setTimeout(() => {
          this._state = 'loaded';
          options.onload?.();
          const q = this._queue.splice(0);
          q.forEach((task: Task) => task());
        }, 500);
        return this;
      }),
      duration: vi.fn(() => 30),
      loop: vi.fn(function (this: any) { return this; }),
      // Howler: any call on a not-yet-loaded Howl is queued, not executed.
      play: vi.fn(function (this: any) {
        if (this._state !== 'loaded') { this._queue.push(() => this.play()); return 1; }
        this._playStarts += 1;
        this._paused = false;
        return 1;
      }),
      stop: vi.fn(function (this: any) {
        if (this._state !== 'loaded') { this._queue.push(() => this.stop()); return this; }
        if (this._playStarts > 0) this._stopsAfterPlay += 1;
        this._paused = true;
        return this;
      }),
      volume: vi.fn(function (this: any, vol?: number) {
        if (vol === undefined) return this._volume;
        if (this._state !== 'loaded') { this._queue.push(() => this.volume(vol)); return this; }
        this._volume = vol;
        return this;
      }),
      fade: vi.fn(function (this: any, _f: number, to: number) {
        if (this._state !== 'loaded') { this._queue.push(() => this.fade(_f, to, 0)); return this; }
        this._volume = to;
        return this;
      }),
      playing: vi.fn(function (this: any) { return !this._paused; }),
      pause: vi.fn(function (this: any) { this._paused = true; return this; }),
      unload: vi.fn(function (this: any) { this._state = 'unloaded'; this._paused = true; return this; }),
      once: vi.fn(function (this: any) { return this; }),
    };
    return instance;
  });

  return {
    Howl: mockHowl,
    Howler: {
      ctx: { state: 'running', resume: vi.fn().mockResolvedValue(undefined), suspend: vi.fn() },
    },
  };
});

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/audio/audioLoader', async () => {
  const { Howl } = await import('howler');
  return {
    createLazyHowl: vi.fn((src: string | string[], options?: any) =>
      Howl({ src: Array.isArray(src) ? src : [src], preload: false, html5: true, ...options }),
    ),
    preloadAudioOnDemand: vi.fn(() => Promise.resolve()),
    ensureHowl: vi.fn().mockResolvedValue(vi.fn()),
  };
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getHowl(src: string): any {
  const HowlCtor = Howl as MockedClass<typeof Howl>;
  return HowlCtor.mock.results.find(
    (r) => r.type === 'return' && (r.value as any)?._options?.src?.[0] === src,
  )?.value;
}

describe('MusicContext — repeat request while a track is still loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, 'hasFocus', { writable: true, value: vi.fn(() => true) });
    Object.defineProperty(document, 'visibilityState', { writable: true, value: 'visible' });
  });

  it('starts the track exactly once and never queues a stop() behind the play', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MusicProvider>{children}</MusicProvider>
    );
    const { result } = renderHook(() => useMusic(), { wrapper });

    act(() => {
      result.current.unlockAudio();
    });

    // Given: the lobby bed is requested and is still loading (500ms load)
    // When: the same phase re-fires playTrack after the transition lock cleared
    await act(async () => {
      result.current.fadeToTrack(result.current.TRACKS.LOBBY, 50, 50);
      await wait(120);
      result.current.fadeToTrack(result.current.TRACKS.LOBBY, 50, 50);
      await wait(120);
      result.current.fadeToTrack(result.current.TRACKS.LOBBY, 50, 50);
      await wait(700); // load finishes, Howler drains its queue
    });

    // Then: one start, no stop executed after it (a stop BEFORE the play is the
    // first request's own harmless reset), still playing
    const lobby = getHowl('/music/in_lobby.mp3');
    expect(lobby).toBeDefined();
    expect(lobby._playStarts).toBe(1);
    expect(lobby._stopsAfterPlay).toBe(0);
    expect(lobby.playing()).toBe(true);
  });

  it('a repeat request restarts the same track when the OS paused its element under Howler', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MusicProvider>{children}</MusicProvider>
    );
    const { result } = renderHook(() => useMusic(), { wrapper });
    act(() => {
      result.current.unlockAudio();
    });
    await act(async () => {
      result.current.fadeToTrack(result.current.TRACKS.LOBBY, 50, 50);
      await wait(700);
    });
    const lobby = getHowl('/music/in_lobby.mp3');
    lobby._sounds = [{ _paused: false, _ended: false, _node: { paused: true } }];

    await act(async () => {
      result.current.fadeToTrack(result.current.TRACKS.LOBBY, 50, 50);
      await wait(50);
    });

    expect(lobby.pause).toHaveBeenCalled();
    expect(lobby._playStarts).toBe(2);
    expect(lobby._stopsAfterPlay).toBe(0);
  });
});
