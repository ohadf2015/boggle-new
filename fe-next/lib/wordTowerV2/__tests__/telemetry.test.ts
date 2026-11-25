import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

import { WORD_TOWER_MODE, closeDailyTowerSession, endV2Run, setTowerStartExtras, startV2Run } from '../telemetry';

describe('word-tower lifecycle telemetry', () => {
  beforeEach(() => {
    trackGameStart.mockClear();
    trackGameEnd.mockClear();
  });

  it('given a fresh run, when the first floor is hoisted, then one game_started fires with the page extras', () => {
    setTowerStartExtras({ v2: true, daily: true, daily_restored: false });
    const startedAt = { current: null as number | null };
    startV2Run(startedAt);
    startV2Run(startedAt);
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('word-tower', { v2: true, daily: true, daily_restored: false });
    expect(WORD_TOWER_MODE).toBe('word-tower');
    expect(startedAt.current).toEqual(expect.any(Number));
  });

  it('given a run that ended, when the next run hoists, then it gets its own game_started', () => {
    const startedAt = { current: null as number | null };
    startV2Run(startedAt);
    endV2Run(startedAt, { floors: 3, heightM: 9 });
    startV2Run(startedAt);
    expect(trackGameStart).toHaveBeenCalledTimes(2);
  });

  it('ends on word-tower with v2/daily as properties, not a second mode', () => {
    const startedAt = { current: Date.now() - 4000 };
    endV2Run(startedAt, { floors: 7, heightM: 21.4, daily: false });
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd).toHaveBeenCalledWith(
      'word-tower',
      7,
      7,
      true,
      expect.any(Number),
      { v2: true, daily: false, heightM: 21, floors: 7, words_found: 7 },
    );
    expect(trackGameEnd.mock.calls[0][0]).not.toBe('word-tower-v2');
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
    endV2Run(startedAt, { floors: 1, heightM: 3, daily: true });
    expect(trackGameEnd.mock.calls[1][3]).toBe(true);
    expect(trackGameEnd.mock.calls[1][0]).toBe('word-tower');
    expect(trackGameEnd.mock.calls[1][5]).toMatchObject({ daily: true, v2: true, floors: 1 });
  });

  it('daily leave with floors > 0 emits one game_completed carrying floors, height and duration', () => {
    const outcome = closeDailyTowerSession({
      floors: 4,
      heightM: 12.6,
      score: 80,
      durationSec: 240,
      daily: true,
    });
    expect(outcome).toBe('complete');
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd).toHaveBeenCalledWith(
      'word-tower',
      80,
      4,
      true,
      240,
      { v2: true, daily: true, heightM: 13, floors: 4, words_found: 4 },
    );
  });

  it('daily leave with floors == 0 is an abandon, not a complete', () => {
    const outcome = closeDailyTowerSession({ floors: 0, heightM: 0, durationSec: 30 });
    expect(outcome).toBe('abandon');
    expect(trackGameEnd).toHaveBeenCalledWith(
      'word-tower',
      0,
      0,
      false,
      30,
      { v2: true, daily: true, heightM: 0, floors: 0, words_found: 0 },
    );
  });
});
