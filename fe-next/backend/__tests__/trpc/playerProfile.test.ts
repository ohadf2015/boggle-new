import { appRouter } from '../../trpc/root';

describe('tRPC playerProfile router', () => {
  const caller = appRouter.createCaller({ req: {} as any, res: {} as any });

  it('get returns expected shape', async () => {
    const result = await caller.playerProfile.get({ userId: 'test-user' });
    expect(result.userId).toBe('test-user');
  });

  it('get rejects missing userId', async () => {
    await expect(
      caller.playerProfile.get({} as any)
    ).rejects.toThrow();
  });
});
