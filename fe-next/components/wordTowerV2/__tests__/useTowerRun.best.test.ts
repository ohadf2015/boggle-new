import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), playComboSound: vi.fn(), playWordLengthSound: vi.fn(), setGameActive: vi.fn() }),
}));

import { useTowerRun } from '../useTowerRun';

describe('useTowerRun — best height has one source of truth', () => {
  beforeEach(() => window.localStorage.clear());

  it('given a server best higher than this device remembers, when adopted, then the HUD best and the local copy take it', () => {
    window.localStorage.setItem('wordTowerV2.bestM', '4.00');
    const { result } = renderHook(() => useTowerRun());
    expect(result.current.bestM).toBe(4);

    act(() => result.current.adoptBest(31.5));
    expect(result.current.bestM).toBe(31.5);
    expect(window.localStorage.getItem('wordTowerV2.bestM')).toBe('31.50');
  });

  it('given a server best LOWER than the device (an offline record), when adopted, then the higher one stays', () => {
    window.localStorage.setItem('wordTowerV2.bestM', '12.00');
    const { result } = renderHook(() => useTowerRun());
    act(() => result.current.adoptBest(5));
    expect(result.current.bestM).toBe(12);
  });
});
