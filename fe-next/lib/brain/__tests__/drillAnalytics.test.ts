/**
 * emitBrainDrillGameEnd — brain-drill completion telemetry.
 *
 * Brain drills submitted results via useSaveDrillResult but emitted no
 * analytics, so completed drills never reached analytics_events and were
 * invisible in the admin game log. This helper routes completion through the
 * shared trackGameEnd from the single drill chokepoint.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGameEnd = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

import { emitBrainDrillGameEnd } from '../drillAnalytics';

describe('emitBrainDrillGameEnd', () => {
  beforeEach(() => trackGameEnd.mockClear());

  it("fires trackGameEnd('brain-drill', score, wordsFound, completed=true, durationSec)", () => {
    emitBrainDrillGameEnd({
      drillType: 'rare-gems',
      level: 3,
      score: 880,
      durationSeconds: 75,
      wordsFound: 12,
    });

    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd).toHaveBeenCalledWith(
      'brain-drill',
      880,
      12,
      true,
      75,
      expect.objectContaining({ isWinner: true, drillType: 'rare-gems', level: 3 }),
    );
  });
});
