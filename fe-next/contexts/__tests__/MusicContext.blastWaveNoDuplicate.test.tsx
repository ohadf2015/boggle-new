import { vi, type MockedClass } from 'vitest';
/**
 * Regression test for the Blast Mode ("מצב פיצוץ") background-music leak.
 *
 * BUG: Blast Mode's <BlastGame> remounts on every wave transition. On mount it
 * calls fadeToTrack(TRACKS.BLAST); on unmount it calls stopMusic(). stopMusic()
 * nulls currentTrack/currentHowl SYNCHRONOUSLY but defers the real howl.stop()
 * by fadeOutMs via an untracked setTimeout. The next mount's fadeToTrack(BLAST)
 * therefore finds currentTrackRef === null, BYPASSES its de-dup guard, and calls
 * play() on the SAME cached blast Howl while its previous instance is still
 * playing. Howler spawns a second concurrent sound — the "echo" — and instances
 * stack with every wave, driving the CPU/memory climb that freezes the game.
 *
 * INVARIANT: a single Howl must never have more than one concurrent active
 * playback. Re-entering a track must collapse to exactly one instance, and a
 * stale deferred stop must not silence the freshly started instance.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MusicProvider, useMusic } from '../MusicContext';
import { Howl } from 'howler';

// Track concurrent active playbacks per Howl instance. play() with no id while
// already playing models Howler spawning a NEW concurrent sound; stop() (no id)
// collapses all instances; pause() halts without destroying.
vi.mock('howler', () => {
  const mockHowl = vi.fn().mockImplementation((options) => {
    const instance = {
      _options: options,
      _instanceId: options.src?.[0] || 'unknown',
      _state: 'unloaded',
      _active: 0, // concurrent active playbacks
      _maxActive: 0, // high-water mark — the assertion target
      _volume: options.volume || 0,

      state: vi.fn(function (this: any) { return this._state; }),

      load: vi.fn(function (this: any) {
        this._state = 'loading';
        setTimeout(() => {
          this._state = 'loaded';
          options.onload?.();
        }, 10);
        return this;
      }),

      play: vi.fn(function (this: any) {
        // Howler: play() with no id while already playing spawns a NEW instance.
        this._active += 1;
        this._maxActive = Math.max(this._maxActive, this._active);
        this._state = 'loaded';
        return this._active;
      }),

      playing: vi.fn(function (this: any) { return this._active > 0; }),

      pause: vi.fn(function (this: any) {
        if (this._active > 0) this._active -= 1;
        return this;
      }),

      stop: vi.fn(function (this: any) {
        this._active = 0; // stop() with no id collapses all instances
        return this;
      }),

      volume: vi.fn(function (this: any, vol?: number) {
        if (vol !== undefined) { this._volume = vol; return this; }
        return this._volume;
      }),

      fade: vi.fn(function (this: any, _from: number, to: number, duration: number) {
        setTimeout(() => { this._volume = to; }, duration / 10);
        return this;
      }),

      seek: vi.fn(function (this: any) { return 0; }),
      unload: vi.fn(function (this: any) { this._state = 'unloaded'; this._active = 0; return this; }),
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

function getBlastHowl(): any {
  const HowlCtor = Howl as MockedClass<typeof Howl>;
  return HowlCtor.mock.results.find(
    (r) => r.type === 'return' && (r.value as any)?._options?.src?.[0] === '/music/blast_mode.mp3',
  )?.value;
}

describe('MusicContext — Blast wave-transition has no duplicate BGM instances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, 'hasFocus', { writable: true, value: vi.fn(() => true) });
    Object.defineProperty(document, 'visibilityState', { writable: true, value: 'visible' });
  });

  it('never stacks two concurrent blast instances across an unmount→remount cycle', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MusicProvider>{children}</MusicProvider>
    );
    const { result } = renderHook(() => useMusic(), { wrapper });

    act(() => {
      result.current.unlockAudio();
      result.current.setVolume(0.5);
    });

    // Wave 1 mount: start blast BGM. Small fades so isTransitioning clears fast.
    await act(async () => {
      result.current.fadeToTrack(result.current.TRACKS.BLAST, 100, 100);
      await wait(200);
    });

    const blast = getBlastHowl();
    expect(blast).toBeDefined();
    expect(blast.playing()).toBe(true);
    expect(blast._maxActive).toBe(1);

    // Wave 1 → wave 2 transition: BlastGame unmounts (stopMusic) then the new
    // BlastGame mounts (fadeToTrack BLAST) BEFORE stopMusic's deferred stop fires.
    await act(async () => {
      result.current.stopMusic(); // default 1000ms deferred stop
      result.current.fadeToTrack(result.current.TRACKS.BLAST, 100, 100);
      await wait(200); // still well within the 1000ms deferred-stop window
    });

    // INVARIANT: re-entering blast must collapse to a single instance, never echo.
    expect(blast._maxActive).toBe(1);
    expect(blast.playing()).toBe(true);

    // The stale deferred stop from stopMusic must NOT silence the new instance.
    await act(async () => { await wait(1100); });
    expect(blast.playing()).toBe(true);
  });
});
