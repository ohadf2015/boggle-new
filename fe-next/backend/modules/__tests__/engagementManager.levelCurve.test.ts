import { describe, it, expect, vi } from 'vitest';
import { xpForLevel } from '../../../shared/xp/levelCurve';

const rows = vi.hoisted(() => ({
  player_engagement: { current_streak: 0, longest_streak: 0, games_today: 0 } as Record<string, unknown>,
  profiles: { total_xp: 0, current_level: 1, total_coins: 0 } as Record<string, unknown>,
}));

vi.mock('../supabaseServer', () => ({
  getSupabase: () => ({
    from: (table: 'player_engagement' | 'profiles') => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.single = async () => ({ data: rows[table], error: null });
      chain.maybeSingle = async () => ({ data: rows[table], error: null });
      return chain;
    },
  }),
}));
vi.mock('../engagementComeback', () => ({
  COMEBACK_TIERS: [],
  checkComebackBonus: vi.fn(async () => ({ eligible: false })),
  claimComebackBonus: vi.fn(),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } }));

import { getEngagementStatus } from '../engagementManager';

describe('getEngagementStatus level progress', () => {
  it('Given a level-3 player, When status is read, Then XP to next level follows the player level curve', async () => {
    const totalXp = xpForLevel(3) + 50;
    rows.profiles = { total_xp: totalXp, current_level: 3, total_coins: 0 };

    const status = await getEngagementStatus('p1');

    expect(status.level).toBe(3);
    expect(status.xpToNextLevel).toBe(xpForLevel(4) - totalXp);
  });
});
