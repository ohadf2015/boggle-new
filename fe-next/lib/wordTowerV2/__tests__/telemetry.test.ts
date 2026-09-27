import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

import { WORD_TOWER_V2_MODE, endV2Run, startV2Run } from '../telemetry';

describe('word-tower-v2 run telemetry', () => {
  beforeEach(() => {
    trackGameStart.mockClear();
    trackGameEnd.mockClear();
  });

  it('starts once per run on the first hoist', () => {
    const startedAt = { current: null as number | null };
    startV2Run(startedAt);
    startV2Run(startedAt);
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith(WORD_TOWER_V2_MODE, expect.any(Object));
    expect(WORD_TOWER_V2_MODE).toBe('word-tower-v2');
    expect(startedAt.current).toEqual(expect.any(Number));
  });

  it('ends with peak floors as score, duration, and height/floors meta', () => {
    const startedAt = { current: Date.now() - 4000 };
    endV2Run(startedAt, { floors: 7, heightM: 21.4, points: 840 });
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd).toHaveBeenCalledWith(
      'word-tower-v2',
      7,
      7,
      true,
      expect.any(Number),
      { heightM: 21, floors: 7 },
    );
    expect(startedAt.current).toBeNull();
  });

  it('does not end a run that never hoisted', () => {
    const startedAt = { current: null as number | null };
    endV2Run(startedAt, { floors: 0, heightM: 0 });
    expect(trackGameEnd).not.toHaveBeenCalled();
  });

  it('credits a completed run (floors > 0) so the retention streak can fire', () => {
    // trackGameEnd gates trackRetentionPlay on `completed`. A bounce (0 floors)
    // must stay abandoned; a real climb must complete.
    const startedAt = { current: Date.now() };
    endV2Run(startedAt, { floors: 0, heightM: 0 });
    expect(trackGameEnd.mock.calls[0][3]).toBe(false);
    startedAt.current = Date.now();
    endV2Run(startedAt, { floors: 1, heightM: 3 });
    expect(trackGameEnd.mock.calls[1][3]).toBe(true);
  });
});
