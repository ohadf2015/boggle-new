import { describe, it, expect, vi, beforeEach } from 'vitest';

const publishLevelUp = vi.hoisted(() => vi.fn());
const postWithAuth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp }));
vi.mock('@/utils/authFetch', () => ({ postWithAuth, getWithAuth: vi.fn() }));

import { claimDayPrize } from '../dayPrizeStore';

const PRIZE = { kind: 'clear', tier: 'common', coins: 40, xp: 60, claimed: true };

function answer(body: unknown) {
  postWithAuth.mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

describe('claimDayPrize — level-ups', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given the prize XP crossed a level, When the box opens, Then the level-up is published', async () => {
    answer({ ...PRIZE, levelUp: { oldLevel: 4, newLevel: 5 } });
    const out = await claimDayPrize('clear');
    expect(out.ok).toBe(true);
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 4, newLevel: 5 }, 'dailyPrize');
  });

  it('Given no level-up, Then nothing is published', async () => {
    answer(PRIZE);
    await claimDayPrize('clear');
    expect(publishLevelUp).not.toHaveBeenCalled();
  });
});
