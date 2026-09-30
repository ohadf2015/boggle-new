import { describe, it, expect, vi, beforeEach } from 'vitest';

const complete = vi.fn();
vi.mock('@/backend/modules/dailyMissionsManager', () => ({
  completeDailyQuestsForResult: (...a: unknown[]) => complete(...a),
}));

import { creditDailyQuests, isTodayUTC } from '../questSeams';
import { questResultForConnections } from '@/shared/dailyQuestPool';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('creditDailyQuests', () => {
  beforeEach(() => {
    complete.mockReset();
    complete.mockResolvedValue(undefined);
  });

  it('given a user id, when credited, then forwards the result to the quest manager', async () => {
    const result = questResultForConnections({ puzzlesSolved: 4 });
    creditDailyQuests('user-1', result);
    await flush();
    expect(complete).toHaveBeenCalledWith('user-1', result);
  });

  it('given no user (guest), then nothing is credited', async () => {
    creditDailyQuests(null, questResultForConnections({ puzzlesSolved: 4 }));
    await flush();
    expect(complete).not.toHaveBeenCalled();
  });

  it('given the manager rejects, then it never throws and logs loudly (not silent)', async () => {
    complete.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => creditDailyQuests('user-1', questResultForConnections({}))).not.toThrow();
    await flush();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('isTodayUTC', () => {
  it('is true for today and false for other dates', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isTodayUTC(today)).toBe(true);
    expect(isTodayUTC('2020-01-01')).toBe(false);
  });
});
