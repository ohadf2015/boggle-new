import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a),
}));

import { newFloorLog, trackFloorPlaced } from '../telemetry';

describe('word_tower_floor_placed', () => {
  beforeEach(() => trackGrowthEvent.mockClear());

  it('fires once per new floor with the mode and word length', () => {
    const log = newFloorLog();
    trackFloorPlaced(log, 1, 1, true, 5);
    trackFloorPlaced(log, 1, 2, true, 3);

    expect(trackGrowthEvent.mock.calls).toEqual([
      ['word_tower_floor_placed', { floor: 1, mode: 'daily', wordLength: 5 }],
      ['word_tower_floor_placed', { floor: 2, mode: 'daily', wordLength: 3 }],
    ]);
  });

  it('does not fire again for a floor already reported in the same run', () => {
    const log = newFloorLog();
    trackFloorPlaced(log, 1, 1, false, 4);
    trackFloorPlaced(log, 1, 1, false, 4);
    trackFloorPlaced(log, 1, 0, false, 4);

    expect(trackGrowthEvent).toHaveBeenCalledTimes(1);
    expect(trackGrowthEvent.mock.calls[0][1]).toMatchObject({ mode: 'free' });
  });

  it('starts counting again on a new run', () => {
    const log = newFloorLog();
    trackFloorPlaced(log, 1, 1, false, 4);
    trackFloorPlaced(log, 2, 1, false, 6);

    expect(trackGrowthEvent).toHaveBeenCalledTimes(2);
  });
});
