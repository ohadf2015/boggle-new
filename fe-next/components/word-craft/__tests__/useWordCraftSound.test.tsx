import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- mock the audio contexts --------------------------------------------
const playSound = vi.fn();
const setGameActive = vi.fn();
const fadeToTrack = vi.fn();
const stopMusic = vi.fn();

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound, setGameActive }),
}));
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ fadeToTrack, stopMusic, TRACKS: { IN_GAME: 'inGame' } }),
}));

import { useWordCraftSound, type WordCraftSoundState } from '../useWordCraftSound';

const idle: WordCraftSoundState = {
  heat: 0,
  overdrive: false,
  burnout: false,
  captureTurnIndex: null,
  captureCount: 0,
  isOver: false,
  result: null,
};

beforeEach(() => {
  playSound.mockClear();
  setGameActive.mockClear();
  fadeToTrack.mockClear();
  stopMusic.mockClear();
});

describe('useWordCraftSound', () => {
  it('activates the game audio + starts music on mount, tears down on unmount', () => {
    const { unmount } = renderHook(() => useWordCraftSound(idle, false));
    expect(setGameActive).toHaveBeenCalledWith(true);
    expect(fadeToTrack).toHaveBeenCalledWith('inGame', expect.any(Number), expect.any(Number));

    unmount();
    expect(setGameActive).toHaveBeenLastCalledWith(false);
    expect(stopMusic).toHaveBeenCalled();
  });

  it('playCommit plays the word-accepted confirm plus the tier flourish', () => {
    const { result } = renderHook(() => useWordCraftSound(idle, false));
    act(() => {
      result.current.playCommit({
        scoreThisTurn: 26,
        tilesPlaced: 4,
        bingo: false,
        streak: 0,
        hasRareTile: false,
        premiumTriggered: false,
        heatLevel: 0,
      });
    });
    const keys = playSound.mock.calls.map((c) => c[0]);
    expect(keys).toContain('wordAccepted');
    expect(keys).toContain('streakFire');
  });

  it('rings a capture sound when a new capture lands', () => {
    const { rerender } = renderHook(({ s }) => useWordCraftSound(s, false), {
      initialProps: { s: idle },
    });
    playSound.mockClear();
    rerender({ s: { ...idle, captureTurnIndex: 4, captureCount: 2 } });
    expect(playSound).toHaveBeenCalledWith('coinCollect', expect.anything());
  });

  it('powers up when entering overdrive', () => {
    const { rerender } = renderHook(({ s }) => useWordCraftSound(s, false), {
      initialProps: { s: { ...idle, heat: 90 } },
    });
    playSound.mockClear();
    rerender({ s: { ...idle, heat: 100, overdrive: true } });
    expect(playSound).toHaveBeenCalledWith('powerUp', expect.anything());
  });

  it('exposes opponent / pass / swap feedback sounds', () => {
    const { result } = renderHook(() => useWordCraftSound(idle, false));
    playSound.mockClear();
    act(() => result.current.playOpponentScored());
    act(() => result.current.playPass());
    act(() => result.current.playSwap());
    const keys = playSound.mock.calls.map((c) => c[0]);
    expect(keys).toEqual(['opponentScored', 'menuClose', 'boardShuffle']);
  });

  it('plays an achievement flourish for a new personal best', () => {
    const { result } = renderHook(() => useWordCraftSound(idle, false));
    playSound.mockClear();
    act(() => result.current.playNewBest());
    expect(playSound).toHaveBeenCalledWith('achievement', expect.objectContaining({ requiresGameActive: false }));
  });

  it('crowns a win and stops the music on game over', () => {
    const { rerender } = renderHook(({ s }) => useWordCraftSound(s, false), {
      initialProps: { s: idle },
    });
    playSound.mockClear();
    stopMusic.mockClear();
    rerender({ s: { ...idle, isOver: true, result: 'win' } });
    expect(playSound).toHaveBeenCalledWith('crownVictory', expect.objectContaining({ requiresGameActive: false }));
    expect(stopMusic).toHaveBeenCalled();
  });
});
