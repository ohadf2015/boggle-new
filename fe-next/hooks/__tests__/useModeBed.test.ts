import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModeBed } from '../useModeBed';
import * as MusicContextModule from '@/contexts/MusicContext';

vi.mock('@/contexts/MusicContext');

const TRACKS = { WORD_TOWER: 'wordTower', CONNECTIONS: 'connections', CROSSWORD: 'crossword', ADVENTURE: 'adventure' } as never;

describe('useModeBed', () => {
  const fadeToTrack = vi.fn();
  const stopMusic = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(MusicContextModule, 'useMusic').mockReturnValue({ fadeToTrack, stopMusic, TRACKS } as never);
  });

  it('fades the mode bed in on mount and stops it on unmount', () => {
    const { unmount } = renderHook(() => useModeBed('CROSSWORD'));
    expect(fadeToTrack).toHaveBeenCalledWith('crossword', 800, 800);
    expect(stopMusic).not.toHaveBeenCalled();
    unmount();
    expect(stopMusic).toHaveBeenCalledWith(500);
  });

  it('does not restart the bed when the music context re-renders', () => {
    const { rerender } = renderHook(() => useModeBed('ADVENTURE'));
    vi.spyOn(MusicContextModule, 'useMusic').mockReturnValue({ fadeToTrack: vi.fn(), stopMusic: vi.fn(), TRACKS } as never);
    rerender();
    expect(fadeToTrack).toHaveBeenCalledTimes(1);
    expect(stopMusic).not.toHaveBeenCalled();
  });
});
