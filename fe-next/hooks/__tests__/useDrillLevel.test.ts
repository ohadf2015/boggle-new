/**
 * Tests for useDrillLevel — picks the correct level for a given drill type
 * out of the user's drillProgress, with a safe default for first-play.
 */
import { renderHook } from '@testing-library/react';
import { useDrillLevel } from '../useDrillLevel';
import type { DrillProgress, DrillType } from '@/shared/types/cognitive';

const mockBrainScore = vi.fn();

vi.mock('../useBrainScore', () => ({
  useBrainScore: () => mockBrainScore(),
}));

function makeProgress(drillType: DrillType, level: number): DrillProgress {
  return {
    id: `${drillType}-id`,
    userId: 'u',
    drillType,
    level,
    highScore: 0,
    totalPlays: 0,
    totalScore: 0,
    avgScore: 0,
    lastPlayedAt: null,
    createdAt: '',
    updatedAt: '',
  };
}

describe('useDrillLevel', () => {
  beforeEach(() => {
    mockBrainScore.mockReset();
  });

  it('returns level from drillProgress when present', () => {
    mockBrainScore.mockReturnValue({
      drillProgress: [
        makeProgress('combo-master', 3),
        makeProgress('rare-gems', 5),
      ],
    });
    const { result } = renderHook(() => useDrillLevel('rare-gems'));
    expect(result.current).toBe(5);
  });

  it('defaults to level 1 when the drill has no progress row yet', () => {
    mockBrainScore.mockReturnValue({
      drillProgress: [makeProgress('combo-master', 3)],
    });
    const { result } = renderHook(() => useDrillLevel('lightning-round'));
    expect(result.current).toBe(1);
  });

  it('defaults to level 1 when drillProgress is empty', () => {
    mockBrainScore.mockReturnValue({ drillProgress: [] });
    const { result } = renderHook(() => useDrillLevel('memory-hunt'));
    expect(result.current).toBe(1);
  });

  it('clamps an out-of-range stored level to [1, 5]', () => {
    mockBrainScore.mockReturnValue({
      drillProgress: [makeProgress('pattern-switcher', 999)],
    });
    const { result } = renderHook(() => useDrillLevel('pattern-switcher'));
    expect(result.current).toBe(5);
  });

  it('clamps a non-finite stored level to 1', () => {
    mockBrainScore.mockReturnValue({
      drillProgress: [makeProgress('pattern-switcher', NaN)],
    });
    const { result } = renderHook(() => useDrillLevel('pattern-switcher'));
    expect(result.current).toBe(1);
  });
});
