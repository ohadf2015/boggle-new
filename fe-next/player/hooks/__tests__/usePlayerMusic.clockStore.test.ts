import { vi, describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePlayerMusic } from '../usePlayerMusic';
import { createRoundClockStore } from '../../roundClock';

const music = vi.hoisted(() => ({ fadeToTrack: vi.fn(), playCountdownBeep: vi.fn() }));
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ fadeToTrack: music.fadeToTrack, TRACKS: { IN_GAME: 'in', ALMOST_OUT_OF_TIME: 'urgent', BOSSA_ARCADE: 'quake', BOSSA: 'results' } }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playCountdownBeep: music.playCountdownBeep }) }));

describe('usePlayerMusic reads the round clock by subscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('switches to urgent music once a third of the round is gone, once', () => {
    const store = createRoundClockStore(120);
    renderHook(() => usePlayerMusic({ gameActive: true, clockStore: store, waitingForResults: false, earthquakeState: 'idle', totalGameTimeRef: { current: 120 } }));
    act(() => store.setState({ remainingTime: 90 }));
    expect(music.fadeToTrack).not.toHaveBeenCalledWith('urgent', 1000, 1000);
    act(() => store.setState({ remainingTime: 80 }));
    act(() => store.setState({ remainingTime: 70 }));
    expect(music.fadeToTrack.mock.calls.filter((c) => c[0] === 'urgent')).toHaveLength(1);
  });

  it('beeps each of the last ten seconds and stays silent when inactive', () => {
    const store = createRoundClockStore(12);
    const { rerender } = renderHook((p: { active: boolean }) => usePlayerMusic({ gameActive: p.active, clockStore: store, waitingForResults: false, earthquakeState: 'idle', totalGameTimeRef: { current: 120 } }), { initialProps: { active: true } });
    act(() => store.setState({ remainingTime: 10 }));
    act(() => store.setState({ remainingTime: 9 }));
    expect(music.playCountdownBeep.mock.calls.map((c) => c[0])).toEqual([10, 9]);
    rerender({ active: false });
    act(() => store.setState({ remainingTime: 8 }));
    expect(music.playCountdownBeep).toHaveBeenCalledTimes(2);
  });
});
