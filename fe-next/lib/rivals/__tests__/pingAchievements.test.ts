import { describe, it, expect, vi } from 'vitest';
import { grantPingAchievements } from '../pingServer';
import { RIVAL_PING_ENTITY_PREFIX } from '../pings';

function fakeDb(count: number | null, error: { message: string } | null = null) {
  const calls: Record<string, unknown[]> = {};
  const q = {
    select: (...a: unknown[]) => ((calls.select = a), q),
    eq: (...a: unknown[]) => ((calls.eq = a), q),
    like: async (...a: unknown[]) => ((calls.like = a), { count, error }),
  };
  const rpc = vi.fn(async (_fn: string, args: { p_keys: string[] }) => ({ data: args.p_keys, error: null }));
  return { db: { from: vi.fn(() => q), rpc }, calls, rpc };
}

describe('grantPingAchievements', () => {
  it('counts the sender\'s rival pings and grants the reached rungs', async () => {
    // Given a sender who has now sent their first ping
    const { db, calls, rpc } = fakeDb(1);
    await grantPingAchievements(db, 'me');
    // Then the count is scoped to their rival pings and PING_FIRST is granted
    expect(calls.eq).toEqual(['sender_id', 'me']);
    expect(calls.like).toEqual(['related_entity_type', `${RIVAL_PING_ENTITY_PREFIX}%`]);
    expect(rpc).toHaveBeenCalledWith('grant_achievements', { p_user_id: 'me', p_keys: ['PING_FIRST'] });
  });

  it('25 pings grants both rungs', async () => {
    const { db, rpc } = fakeDb(25);
    await grantPingAchievements(db, 'me');
    expect(rpc).toHaveBeenCalledWith('grant_achievements', { p_user_id: 'me', p_keys: ['PING_FIRST', 'PING_25'] });
  });

  it('a failed count grants nothing and does not throw', async () => {
    const { db, rpc } = fakeDb(null, { message: 'boom' });
    await expect(grantPingAchievements(db, 'me')).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});
