import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDrillMusic } from '../useDrillMusic';

// Mockable music surface — the hook only touches currentTrack/fadeToTrack/stopMusic.
const fadeToTrack = vi.fn();
const stopMusic = vi.fn();
let currentTrack: string | null = 'lobby';

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ currentTrack, fadeToTrack, stopMusic }),
}));

describe('useDrillMusic — in-game music bed for drills', () => {
  beforeEach(() => {
    fadeToTrack.mockClear();
    stopMusic.mockClear();
    currentTrack = 'lobby';
  });

  it('does nothing on the briefing screen (isPlaying false)', () => {
    renderHook(() => useDrillMusic(false));
    expect(fadeToTrack).not.toHaveBeenCalled();
    expect(stopMusic).not.toHaveBeenCalled();
  });

  it('fades to the in-game track when play starts', () => {
    const { rerender } = renderHook(({ playing }) => useDrillMusic(playing), {
      initialProps: { playing: false },
    });
    rerender({ playing: true });
    expect(fadeToTrack).toHaveBeenCalledWith('inGame', expect.any(Number), expect.any(Number));
  });

  it('restores the previous track when play ends', () => {
    const { rerender } = renderHook(({ playing }) => useDrillMusic(playing), {
      initialProps: { playing: false },
    });
    rerender({ playing: true });
    fadeToTrack.mockClear();
    rerender({ playing: false });
    // Back to whatever was playing before the drill (lobby), not in-game.
    expect(fadeToTrack).toHaveBeenCalledWith('lobby', expect.any(Number), expect.any(Number));
  });

  it('stops music on exit when nothing was playing before', () => {
    currentTrack = null;
    const { rerender } = renderHook(({ playing }) => useDrillMusic(playing), {
      initialProps: { playing: false },
    });
    rerender({ playing: true });
    rerender({ playing: false });
    expect(stopMusic).toHaveBeenCalled();
  });

  it('restores the previous track when the drill unmounts mid-play', () => {
    const { rerender, unmount } = renderHook(({ playing }) => useDrillMusic(playing), {
      initialProps: { playing: false },
    });
    rerender({ playing: true });
    fadeToTrack.mockClear();
    unmount();
    expect(fadeToTrack).toHaveBeenCalledWith('lobby', expect.any(Number), expect.any(Number));
  });
});
