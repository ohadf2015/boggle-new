import { describe, it, expect, vi } from 'vitest';
import { grantAchievements, grantCountLadder } from './grantAchievements';
import { COUNT_LADDERS } from './progressionAchievements';

function client(result: { data: unknown; error: { message: string } | null }) {
  return { rpc: vi.fn(async () => result) };
}

describe('grantAchievements', () => {
  it('calls the atomic grant RPC and returns the newly earned keys', async () => {
    const c = client({ data: ['PING_FIRST'], error: null });
    const got = await grantAchievements(c, 'u1', ['PING_FIRST']);
    expect(c.rpc).toHaveBeenCalledWith('grant_achievements', { p_user_id: 'u1', p_keys: ['PING_FIRST'] });
    expect(got).toEqual(['PING_FIRST']);
  });

  it('skips the call when there is nothing to grant', async () => {
    const c = client({ data: [], error: null });
    expect(await grantAchievements(c, 'u1', [])).toEqual([]);
    expect(await grantAchievements(c, null, ['X'])).toEqual([]);
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it('an RPC error is reported and never breaks the caller', async () => {
    const onError = vi.fn();
    const c = client({ data: null, error: { message: 'boom' } });
    expect(await grantAchievements(c, 'u1', ['PING_FIRST'], onError)).toEqual([]);
    expect(onError).toHaveBeenCalledWith('boom');
  });

  it('a thrown client is caught too', async () => {
    const c = { rpc: vi.fn(async () => { throw new Error('network'); }) };
    expect(await grantAchievements(c, 'u1', ['PING_FIRST'])).toEqual([]);
  });

  it('grantCountLadder grants the rungs the count reached', async () => {
    const c = client({ data: ['FIRST_FRIEND', 'FRIENDS_5'], error: null });
    await grantCountLadder(c, 'u1', COUNT_LADDERS.friends, 5);
    expect(c.rpc).toHaveBeenCalledWith('grant_achievements', { p_user_id: 'u1', p_keys: ['FIRST_FRIEND', 'FRIENDS_5'] });
  });
});

describe('recordPersonalBest', () => {
  it('bumps the server record counter through its RPC', async () => {
    const { recordPersonalBest } = await import('./grantAchievements');
    const c = { rpc: vi.fn(async () => ({ data: ['RECORD_FIRST'], error: null })) };
    expect(await recordPersonalBest(c, 'u1')).toEqual(['RECORD_FIRST']);
    expect(c.rpc).toHaveBeenCalledWith('record_personal_best', { p_user_id: 'u1' });
  });

  it('never throws', async () => {
    const { recordPersonalBest } = await import('./grantAchievements');
    const c = { rpc: vi.fn(async () => { throw new Error('x'); }) };
    expect(await recordPersonalBest(c, 'u1', () => {})).toEqual([]);
  });
});
