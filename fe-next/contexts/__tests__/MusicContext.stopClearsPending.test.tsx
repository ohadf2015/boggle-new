import { vi, type MockedClass } from 'vitest';
/**
 * Regression: stopMusic() (route leave) left queued track requests alive.
 *
 * A track requested before audio unlock (pendingUnlockTrackRef) or during a
 * crossfade (pendingTrackRef) survived stopMusic(), so the lobby/in-game bed of
 * the page the player just LEFT started on the next page — on the first tap, or
 * when the old fade window expired.
 *
 * INVARIANT: stopMusic() cancels every queued/pending track request.
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

describe('MusicContext — stopMusic cancels queued track requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, 'hasFocus', { writable: true, value: vi.fn(() => true) });
    Object.defineProperty(document, 'visibilityState', { writable: true, value: 'visible' });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MusicProvider>{children}</MusicProvider>
  );

  it('does not start a track queued before unlock after the page stopped music', async () => {
    const { result } = renderHook(() => useMusic(), { wrapper });

    // Given: a page requested its bed while audio was still locked, then the
    // player left (unmount → stopMusic)
    await act(async () => {
      result.current.fadeToTrack(result.current.TRACKS.LOBBY, 50, 50);
      result.current.stopMusic(50);
    });

    // When: the first tap on the NEXT page unlocks audio
    await act(async () => {
      result.current.unlockAudio();
      await wait(700);
    });

    // Then: the abandoned page's bed never starts
    const lobby = getHowl('/music/in_lobby.mp3');
    expect(lobby?._playStarts ?? 0).toBe(0);
  });

  it('does not start a track queued behind a crossfade after stopMusic', async () => {
    const { result } = renderHook(() => useMusic(), { wrapper });
    act(() => { result.current.unlockAudio(); });

    // Given: LOBBY is fading in and a second request (inGame) is held as pending
    await act(async () => {
      result.current.fadeToTrack(result.current.TRACKS.LOBBY, 300, 300);
      result.current.fadeToTrack(result.current.TRACKS.IN_GAME, 300, 300);
      // When: the player leaves inside the fade window
      result.current.stopMusic(50);
      await wait(900);
    });

    // Then: the pending request is dropped, not replayed when the lock expires
    const inGame = getHowl('/music/in_game.mp3');
    expect(inGame?._playStarts ?? 0).toBe(0);
  });
});
