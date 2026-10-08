import { vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MusicProvider, useMusic } from '../MusicContext';

const loader = vi.hoisted(() => {
  let resolve: () => void = () => {};
  const state = { ready: false, plays: 0 };
  const ready = new Promise<void>((r) => { resolve = r; });
  return { state, ready, release: () => { state.ready = true; resolve(); } };
});

vi.mock('howler', () => ({
  Howl: vi.fn(),
  Howler: { ctx: { state: 'running', resume: vi.fn().mockResolvedValue(undefined), suspend: vi.fn() } },
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/audio/audioLoader', () => ({
  ensureHowl: vi.fn(() => loader.ready),
  preloadAudioOnDemand: vi.fn(() => Promise.resolve()),
  createLazyHowl: vi.fn(() => {
    if (!loader.state.ready) throw new Error('[AudioLoader] Howl not loaded yet — call ensureHowl() first');
    const howl = {
      _state: 'loaded',
      _playing: false,
      play: vi.fn(() => { loader.state.plays += 1; howl._playing = true; return 1; }),
      pause: vi.fn(), stop: vi.fn(), fade: vi.fn(), seek: vi.fn(), load: vi.fn(), once: vi.fn(), unload: vi.fn(),
      loop: vi.fn(), duration: vi.fn(() => 30),
      volume: vi.fn(() => 0.5),
      state: vi.fn(() => howl._state),
      playing: vi.fn(() => howl._playing),
    };
    return howl;
  }),
}));

describe('MusicContext — track requested before howler finished loading', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <MusicProvider>{children}</MusicProvider>;

  it('does not throw, and plays the track once howler is ready', async () => {
    const { result } = renderHook(() => useMusic(), { wrapper });

    await act(async () => {
      result.current.unlockAudio();
      await expect(result.current.fadeToTrack(result.current.TRACKS.LOBBY, 10, 10)).resolves.toBeUndefined();
    });
    expect(loader.state.plays).toBe(0);

    await act(async () => {
      loader.release();
      await loader.ready;
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(loader.state.plays).toBeGreaterThan(0);
  });
});
