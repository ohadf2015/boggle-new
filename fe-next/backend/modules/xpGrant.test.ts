import { describe, it, expect, vi } from 'vitest';
import { grantPlayerXp, grantSoloGameXp, levelChangeFromRow, levelUpOf, scaleBreakdown } from './xpGrant';
import { xpForLevel } from '../../shared/xp/levelCurve';

function rpcReturning(row: Record<string, unknown> | null, error: unknown = null) {
  return { rpc: vi.fn().mockResolvedValue({ data: row ? [row] : [], error }) };
}

describe('levelChangeFromRow', () => {
  it('derives the level before the grant from the curve', () => {
    const total = xpForLevel(3) + 10;
    const change = levelChangeFromRow({ new_total_xp: total, xp_granted: 50, new_level: 3 });
    expect(change).toEqual({ xpEarned: 50, newTotalXp: total, oldLevel: 2, newLevel: 3, leveledUp: true });
  });

  it('reports no level-up inside a level', () => {
    const total = xpForLevel(3) + 200;
    expect(levelChangeFromRow({ new_total_xp: total, xp_granted: 20, new_level: 3 }).leveledUp).toBe(false);
  });
});

describe('levelUpOf', () => {
  it('is null without a level-up and the level pair with one', () => {
    expect(levelUpOf(null)).toBeNull();
    expect(levelUpOf({ xpEarned: 5, newTotalXp: 10, oldLevel: 1, newLevel: 1, leveledUp: false })).toBeNull();
    expect(levelUpOf({ xpEarned: 5, newTotalXp: 10, oldLevel: 1, newLevel: 2, leveledUp: true })).toEqual({ oldLevel: 1, newLevel: 2 });
  });
});

describe('grantPlayerXp', () => {
  it('passes the amount to increment_player_xp and returns the granted amount, not the asked one', async () => {
    const client = rpcReturning({ new_total_xp: xpForLevel(2) + 5, xp_granted: 30, new_level: 2 });
    const result = await grantPlayerXp(client, 'u1', 90);
    expect(client.rpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: 'u1', p_xp_amount: 90 });
    expect(result).toMatchObject({ xpEarned: 30, newLevel: 2, oldLevel: 1, leveledUp: true });
  });

  it('skips the call for a zero amount', async () => {
    const client = rpcReturning(null);
    expect(await grantPlayerXp(client, 'u1', 0)).toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('returns null when the RPC fails', async () => {
    const client = rpcReturning(null, { message: 'boom' });
    expect(await grantPlayerXp(client, 'u1', 40)).toBeNull();
  });
});

describe('scaleBreakdown', () => {
  it('shrinks the parts so they add up to what was granted', () => {
    const scaled = scaleBreakdown({ gameCompletion: 50, scoreXp: 400, winBonus: 0, achievementXp: 50 }, 137);
    expect(scaled.gameCompletion + scaled.scoreXp + scaled.winBonus + scaled.achievementXp).toBe(137);
    expect(scaled.winBonus).toBe(0);
  });

  it('zeroes every part when nothing was granted', () => {
    const scaled = scaleBreakdown({ gameCompletion: 50, scoreXp: 10, winBonus: 0, achievementXp: 0 }, 0);
    expect(Object.values(scaled).every(v => v === 0)).toBe(true);
  });
});

describe('grantSoloGameXp', () => {
  it('uses the solo game formula and returns the breakdown', async () => {
    const client = rpcReturning({ new_total_xp: 500, xp_granted: 25, new_level: 3 });
    const result = await grantSoloGameXp(client, 'u1', { score: 100 });
    const asked = client.rpc.mock.calls[0][1].p_xp_amount;
    expect(asked).toBeGreaterThan(0);
    expect(result?.xpBreakdown.gameCompletion).toBeGreaterThan(0);
    expect(result?.xpEarned).toBe(25);
    const b = result!.xpBreakdown;
    expect(b.gameCompletion + b.scoreXp + b.winBonus + b.achievementXp).toBe(25);
  });
});
