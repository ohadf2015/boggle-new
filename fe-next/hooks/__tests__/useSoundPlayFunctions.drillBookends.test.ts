import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSoundPlayFunctions } from '../useSoundPlayFunctions';

/**
 * Drill start/complete fire outside the game-active window, so they MUST pass
 * requiresGameActive:false or the guard silences them. This locks in that
 * exemption — the regression would be a silent "you finished!" cue.
 */
describe('useSoundPlayFunctions drill bookends', () => {
  function setup() {
    const playSound = vi.fn();
    const guards = {
      audioUnlocked: true,
      sfxMuted: false,
      isTabVisibleRef: { current: true },
      isGameActiveRef: { current: false },
    };
    const { result } = renderHook(() => useSoundPlayFunctions(playSound, guards));
    return { playSound, result };
  }

  it('plays drill-start with requiresGameActive:false', () => {
    const { playSound, result } = setup();
    result.current.playDrillStartSound();
    expect(playSound).toHaveBeenCalledWith('drillStart', expect.objectContaining({ requiresGameActive: false }));
  });

  it('plays drill-complete with requiresGameActive:false', () => {
    const { playSound, result } = setup();
    result.current.playDrillCompleteSound();
    expect(playSound).toHaveBeenCalledWith('drillComplete', expect.objectContaining({ requiresGameActive: false }));
  });
});
