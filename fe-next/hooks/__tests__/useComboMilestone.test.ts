import { renderHook, act } from '@testing-library/react';
import { useComboMilestone, COMBO_MILESTONES } from '../useComboMilestone';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';
import { useParticleBudget } from '../useParticleBudget';
import { fireLayeredCelebration } from '@/utils/confettiUtils';

jest.mock('../usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: jest.fn(),
}));

jest.mock('../useParticleBudget', () => ({
  useParticleBudget: jest.fn(),
}));

jest.mock('@/utils/confettiUtils', () => ({
  fireLayeredCelebration: jest.fn(),
  Z_INDEX: {
    BACKGROUND_PARTICLES: 1000,
    MIDGROUND_PARTICLES: 2000,
    FOREGROUND_PARTICLES: 3000,
  },
}));

describe('useComboMilestone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (usePrefersReducedMotion as jest.Mock).mockReturnValue(false);
    (useParticleBudget as jest.Mock).mockReturnValue({
      combo: 60,
      max: 100,
      tier: 'high',
      levelUp: 60,
      word: 10,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exports COMBO_MILESTONES with 10/15/20 thresholds', () => {
    expect(COMBO_MILESTONES).toHaveLength(3);
    expect(COMBO_MILESTONES[0].threshold).toBe(10);
    expect(COMBO_MILESTONES[1].threshold).toBe(15);
    expect(COMBO_MILESTONES[2].threshold).toBe(20);
  });

  it('returns null milestone initially', () => {
    const { result } = renderHook(() => useComboMilestone());
    expect(result.current.currentMilestone).toBeNull();
  });

  it('triggers milestone at combo 10', () => {
    const { result } = renderHook(() => useComboMilestone());

    act(() => {
      result.current.checkMilestone(10);
    });

    expect(result.current.currentMilestone).toEqual(expect.objectContaining({
      threshold: 10,
      labelKey: 'adventure.combo.incredible',
    }));
  });

  it('triggers milestone at combo 15', () => {
    const { result } = renderHook(() => useComboMilestone());

    act(() => {
      result.current.checkMilestone(15);
    });

    expect(result.current.currentMilestone).toEqual(expect.objectContaining({
      threshold: 15,
      labelKey: 'adventure.combo.unstoppable',
    }));
  });

  it('triggers milestone at combo 20', () => {
    const { result } = renderHook(() => useComboMilestone());

    act(() => {
      result.current.checkMilestone(20);
    });

    expect(result.current.currentMilestone).toEqual(expect.objectContaining({
      threshold: 20,
      labelKey: 'adventure.combo.legendary',
    }));
  });

  it('fires layered celebration when milestone hit', () => {
    const { result } = renderHook(() => useComboMilestone());

    act(() => {
      result.current.checkMilestone(10);
    });

    expect(fireLayeredCelebration).toHaveBeenCalledWith(
      2000, // milestone duration
      expect.objectContaining({ combo: expect.any(Number) })
    );
  });

  it('does not fire celebration when reduced motion preferred', () => {
    (usePrefersReducedMotion as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useComboMilestone());

    act(() => {
      result.current.checkMilestone(10);
    });

    expect(fireLayeredCelebration).not.toHaveBeenCalled();
  });

  it('clears milestone after duration expires', () => {
    const { result } = renderHook(() => useComboMilestone());

    act(() => {
      result.current.checkMilestone(10);
    });

    expect(result.current.currentMilestone).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(2000); // Milestone duration
    });

    expect(result.current.currentMilestone).toBeNull();
  });

  it('does not trigger same milestone twice in a row', () => {
    const { result } = renderHook(() => useComboMilestone());

    act(() => {
      result.current.checkMilestone(10);
    });

    jest.clearAllMocks();

    act(() => {
      result.current.checkMilestone(10);
    });

    // Should not fire again
    expect(fireLayeredCelebration).not.toHaveBeenCalled();
  });

  it('scales particle budget based on milestone intensity', () => {
    const { result } = renderHook(() => useComboMilestone());

    // 10-combo uses 60% of budget
    act(() => {
      result.current.checkMilestone(10);
    });

    expect(fireLayeredCelebration).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        combo: Math.floor(60 * 0.6), // 36
      })
    );
  });
});
