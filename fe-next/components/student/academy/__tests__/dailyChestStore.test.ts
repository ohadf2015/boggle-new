import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  canOpenChest,
  markChestOpened,
  localDay,
  claimDailyChestXp,
  DAILY_CHEST_XP,
} from '../dailyChestStore';

const { mockPublishLevelUp } = vi.hoisted(() => ({ mockPublishLevelUp: vi.fn() }));
vi.mock('@/lib/avatar/revealTrigger', async (orig) => ({ ...(await orig<object>()), publishLevelUp: mockPublishLevelUp }));

describe('daily chest — once per local day, per student', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('formats the local calendar day', () => {
    expect(localDay(new Date(2026, 8, 3, 23, 59))).toBe('2026-09-03');
  });

  it('is openable until it is opened, then closed for the rest of the day', () => {
    const now = new Date(2026, 8, 23, 9, 0);
    expect(canOpenChest('u1', now)).toBe(true);
    markChestOpened('u1', now);
    expect(canOpenChest('u1', new Date(2026, 8, 23, 22, 0))).toBe(false);
    // Another student on the same shared device still gets theirs.
    expect(canOpenChest('u2', now)).toBe(true);
  });

  it('reopens the next day', () => {
    markChestOpened('u1', new Date(2026, 8, 23, 9, 0));
    expect(canOpenChest('u1', new Date(2026, 8, 24, 0, 1))).toBe(true);
  });

  it('degrades to openable when storage throws, and marking never throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(canOpenChest('u1', new Date())).toBe(true);
    expect(() => markChestOpened('u1', new Date())).not.toThrow();
  });
});

describe('claimDailyChestXp', () => {
  it('given the chest XP crossed a level, when claimed, then the level-up is announced as academyChest', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, xpEarned: DAILY_CHEST_XP, newTotalXp: 300, oldLevel: 1, newLevel: 2, leveledUp: true }),
    });
    await claimDailyChestXp(fetchImpl as unknown as typeof fetch);
    expect(mockPublishLevelUp).toHaveBeenCalledWith({ oldLevel: 1, newLevel: 2 }, 'academyChest');
  });

  it('given an already-claimed chest, when claimed, then nothing is announced', async () => {
    mockPublishLevelUp.mockClear();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, xpEarned: 0, alreadyClaimed: true }) });
    await claimDailyChestXp(fetchImpl as unknown as typeof fetch);
    expect(mockPublishLevelUp).not.toHaveBeenCalled();
  });

  it('posts an allow-listed activity with a non-empty lesson id and returns the new total', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, xpEarned: DAILY_CHEST_XP, newTotalXp: 525 }),
    });
    const result = await claimDailyChestXp(fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, newTotalXp: 525 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/education/record-xp');
    const body = JSON.parse(init.body);
    expect(body.xpAmount).toBe(DAILY_CHEST_XP);
    expect(body.activityType).toBe('daily_challenge');
    expect(typeof body.lessonId).toBe('string');
    expect(body.lessonId.length).toBeGreaterThan(0);
  });

  it('reports failure instead of throwing when the server refuses or the network drops', async () => {
    const refused = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    expect(await claimDailyChestXp(refused as unknown as typeof fetch)).toEqual({ ok: false });
    const dropped = vi.fn().mockRejectedValue(new Error('offline'));
    expect(await claimDailyChestXp(dropped as unknown as typeof fetch)).toEqual({ ok: false });
  });
});

describe('clearChestOpened', () => {
  it('gives the chest back when the XP never landed', async () => {
    const { clearChestOpened } = await import('../dailyChestStore');
    const now = new Date(2026, 8, 23, 9, 0);
    markChestOpened('u1', now);
    clearChestOpened('u1');
    expect(canOpenChest('u1', now)).toBe(true);
  });
});
