const single = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
    auth: { onAuthStateChange: vi.fn() },
  }),
}));

describe('getProfile', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('keeps the PostgREST code so a missing row reaches the profile auto-create', async () => {
    single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' },
    });
    const { getProfile } = await import('../supabase');

    const { error } = await getProfile('u1');

    expect(error).toEqual({ code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' });
  });
});
