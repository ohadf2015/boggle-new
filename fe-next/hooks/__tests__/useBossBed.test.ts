import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBossBed } from '../useBossBed';
import * as MusicContextModule from '@/contexts/MusicContext';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';

vi.mock('@/contexts/MusicContext');

const TRACKS = { BOSS: 'boss' } as never;

describe('useBossBed', () => {
  const fadeToTrack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useClassroomBossStore.getState().receiveState(null);
    vi.spyOn(MusicContextModule, 'useMusic').mockReturnValue({ fadeToTrack, TRACKS } as never);
  });

  it('fades to the boss bed once a boss round is in play', () => {
    useClassroomBossStore.getState().receiveState({ status: 'fighting' } as unknown as ClassroomBossView);
    renderHook(() => useBossBed(true));
    expect(fadeToTrack).toHaveBeenCalledWith('boss', 800, 800);
  });

  it('picks the bed up when the boss state arrives after the round started', () => {
    renderHook(() => useBossBed(true));
    expect(fadeToTrack).not.toHaveBeenCalled();
    act(() => useClassroomBossStore.getState().receiveState({ status: 'fighting' } as unknown as ClassroomBossView));
    expect(fadeToTrack).toHaveBeenCalledWith('boss', 800, 800);
  });

  it('stays silent for a normal round', () => {
    renderHook(() => useBossBed(true));
    expect(fadeToTrack).not.toHaveBeenCalled();
  });

  it('stays silent while the round is not playing, even with a boss in the room', () => {
    useClassroomBossStore.getState().receiveState({ status: 'fighting' } as unknown as ClassroomBossView);
    renderHook(() => useBossBed(false));
    expect(fadeToTrack).not.toHaveBeenCalled();
  });
});
