import { describe, it, expect, vi, beforeEach } from 'vitest';

const complete = vi.fn();
vi.mock('@/backend/modules/dailyMissionsManager', () => ({
  completeDailyQuestsForResult: (...a: unknown[]) => complete(...a),
}));

import { creditDailyQuests, isTodayUTC, questLevelUpWithin } from '../questSeams';
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

  it('resolves the level-up the quest XP caused', async () => {
    complete.mockResolvedValue({ xpEarned: 100, levelUp: { oldLevel: 3, newLevel: 4 } });
    await expect(creditDailyQuests('user-1', questResultForConnections({ puzzlesSolved: 4 }))).resolves.toEqual({ oldLevel: 3, newLevel: 4 });
  });

  it('resolves null for a guest, a failure, or a result that granted nothing', async () => {
    await expect(creditDailyQuests(null, questResultForConnections({}))).resolves.toBeNull();
    await expect(creditDailyQuests('user-1', questResultForConnections({}))).resolves.toBeNull();
    complete.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(creditDailyQuests('user-1', questResultForConnections({}))).resolves.toBeNull();
    spy.mockRestore();
  });

  it('gives up waiting after the timeout so a slow grant never holds the response', async () => {
    complete.mockImplementation(() => new Promise(() => {}));
    const started = Date.now();
    await expect(creditDailyQuests('user-1', questResultForConnections({ puzzlesSolved: 4 }), 20)).resolves.toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe('questLevelUpWithin', () => {
  it('resolves the work, null on rejection, null after the wait', async () => {
    await expect(questLevelUpWithin(Promise.resolve({ oldLevel: 1, newLevel: 2 }))).resolves.toEqual({ oldLevel: 1, newLevel: 2 });
    await expect(questLevelUpWithin(Promise.resolve(undefined))).resolves.toBeNull();
    await expect(questLevelUpWithin(Promise.reject(new Error('x')))).resolves.toBeNull();
    await expect(questLevelUpWithin(new Promise(() => {}), 10)).resolves.toBeNull();
  });
});

describe('isTodayUTC', () => {
  it('is true for today and false for other dates', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isTodayUTC(today)).toBe(true);
    expect(isTodayUTC('2020-01-01')).toBe(false);
  });
});
