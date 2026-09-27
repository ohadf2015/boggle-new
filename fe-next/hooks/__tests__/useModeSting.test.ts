import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModeSting } from '../useModeSting';

// Mock the sound effects context
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: vi.fn(),
}));

import { useSoundEffects } from '@/contexts/SoundEffectsContext';

describe('useModeSting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function that plays sound for a given mode', () => {
    const playVictorySound = vi.fn();
    (useSoundEffects as any).mockReturnValue({
      playVictorySound,
      playDrillStartSound: vi.fn(),
      playFlashChallengeSound: vi.fn(),
      playWheelSpinSound: vi.fn(),
      playMatchFoundSound: vi.fn(),
    });

    const { result } = renderHook(() => useModeSting());
    expect(result.current.playModeSound).toBeDefined();
  });

  it('plays victory sound for classic mode win', () => {
    const playVictorySound = vi.fn();
    (useSoundEffects as any).mockReturnValue({
      playVictorySound,
      playDrillStartSound: vi.fn(),
      playFlashChallengeSound: vi.fn(),
      playWheelSpinSound: vi.fn(),
      playMatchFoundSound: vi.fn(),
    });

    const { result } = renderHook(() => useModeSting());
    result.current.playModeSound('classic', 'win');

    expect(playVictorySound).toHaveBeenCalled();
  });

  it('plays appropriate sound for word-hunt mode', () => {
    const playWordRevealSound = vi.fn();
    (useSoundEffects as any).mockReturnValue({
      playVictorySound: vi.fn(),
      playDrillStartSound: vi.fn(),
      playFlashChallengeSound: vi.fn(),
      playWheelSpinSound: vi.fn(),
      playMatchFoundSound: vi.fn(),
      playWordRevealSound,
    });

    const { result } = renderHook(() => useModeSting());
    result.current.playModeSound('word-hunt', 'start');

    expect(playWordRevealSound).toHaveBeenCalled();
  });

  it('plays appropriate sound for blast mode', () => {
    const playFlashChallengeSound = vi.fn();
    (useSoundEffects as any).mockReturnValue({
      playVictorySound: vi.fn(),
      playDrillStartSound: vi.fn(),
      playFlashChallengeSound,
      playWheelSpinSound: vi.fn(),
      playMatchFoundSound: vi.fn(),
    });

    const { result } = renderHook(() => useModeSting());
    result.current.playModeSound('blast', 'start');

    expect(playFlashChallengeSound).toHaveBeenCalled();
  });

  it('plays appropriate sound for wheel-rush mode', () => {
    const playWheelSpinSound = vi.fn();
    (useSoundEffects as any).mockReturnValue({
      playVictorySound: vi.fn(),
      playDrillStartSound: vi.fn(),
      playFlashChallengeSound: vi.fn(),
      playWheelSpinSound,
      playMatchFoundSound: vi.fn(),
    });

    const { result } = renderHook(() => useModeSting());
    result.current.playModeSound('wheel-rush', 'start');

    expect(playWheelSpinSound).toHaveBeenCalled();
  });

  it('plays appropriate sound for vocab-quiz mode', () => {
    const playMatchFoundSound = vi.fn();
    (useSoundEffects as any).mockReturnValue({
      playVictorySound: vi.fn(),
      playDrillStartSound: vi.fn(),
      playFlashChallengeSound: vi.fn(),
      playWheelSpinSound: vi.fn(),
      playMatchFoundSound,
    });

    const { result } = renderHook(() => useModeSting());
    result.current.playModeSound('vocab-quiz', 'start');

    expect(playMatchFoundSound).toHaveBeenCalled();
  });

  it('plays end/loss sound when mode and event indicate loss', () => {
    const playDefeatSound = vi.fn();
    (useSoundEffects as any).mockReturnValue({
      playVictorySound: vi.fn(),
      playDrillStartSound: vi.fn(),
      playFlashChallengeSound: vi.fn(),
      playWheelSpinSound: vi.fn(),
      playMatchFoundSound: vi.fn(),
      playDefeatSound,
    });

    const { result } = renderHook(() => useModeSting());
    result.current.playModeSound('classic', 'lose');

    expect(playDefeatSound).toHaveBeenCalled();
  });

  it('does not throw when context is missing', () => {
    (useSoundEffects as any).mockReturnValue(null);

    const { result } = renderHook(() => useModeSting());
    expect(() => result.current.playModeSound('classic', 'win')).not.toThrow();
  });

  it('supports event-specific sounds like "round-end"', () => {
    const playCoinCascadeSound = vi.fn();
    (useSoundEffects as any).mockReturnValue({
      playVictorySound: vi.fn(),
      playDrillStartSound: vi.fn(),
      playFlashChallengeSound: vi.fn(),
      playWheelSpinSound: vi.fn(),
      playMatchFoundSound: vi.fn(),
      playCoinCascadeSound,
    });

    const { result } = renderHook(() => useModeSting());
    result.current.playModeSound('classic', 'round-end');

    // Should call an appropriate sound for round end
    expect(playCoinCascadeSound).toHaveBeenCalled();
  });
});
