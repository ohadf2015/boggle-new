import { appRouter } from '../../trpc/root';

describe('tRPC leaderboard router', () => {
  const caller = appRouter.createCaller({ req: {} as any, res: {} as any });

  it('getTop returns expected shape', async () => {
    const result = await caller.leaderboard.getTop({ period: 'weekly', limit: 10 });
    expect(result.period).toBe('weekly');
    expect(result.limit).toBe(10);
    expect(Array.isArray(result.entries)).toBe(true);
  });

  it('getTop uses defaults when no input provided', async () => {
    const result = await caller.leaderboard.getTop({});
    expect(result.period).toBe('weekly');
    expect(result.limit).toBe(20);
  });

  it('getTop validates input — rejects invalid period', async () => {
    await expect(
      caller.leaderboard.getTop({ period: 'invalid' as any, limit: 10 })
    ).rejects.toThrow();
  });

  it('getTop validates input — rejects limit out of range', async () => {
    await expect(
      caller.leaderboard.getTop({ period: 'weekly', limit: 200 })
    ).rejects.toThrow();
  });

  it('getPlayerRank returns expected shape', async () => {
    const result = await caller.leaderboard.getPlayerRank({ userId: 'test-user' });
    expect(result.userId).toBe('test-user');
    expect(result.rank).toBeNull();
  });
});
