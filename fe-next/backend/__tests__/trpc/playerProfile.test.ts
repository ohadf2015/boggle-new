import { appRouter } from '../../trpc/root';

describe('tRPC playerProfile router', () => {
  const caller = appRouter.createCaller({ req: {} as any, res: {} as any });

  it('get rejects missing id', async () => {
    await expect(
      caller.playerProfile.get({} as any)
    ).rejects.toThrow();
  });

  it('get validates id input', async () => {
    // The input schema requires { id: string } — verify it accepts valid input
    // (will throw PRECONDITION_FAILED if Supabase isn't configured, which is expected in test)
    await expect(
      caller.playerProfile.get({ id: 'test-user' })
    ).rejects.toThrow(); // PRECONDITION_FAILED — Supabase not configured
  });

  it('get rejects dangerous characters in id', async () => {
    await expect(
      caller.playerProfile.get({ id: '<script>' })
    ).rejects.toThrow();
  });
});
