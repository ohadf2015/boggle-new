import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = { language: string; trust_tier: number; active: boolean; curator_points: number };
const state = {
  user: { id: 'u1' } as { id: string } | null,
  isAdmin: false,
  assignments: [] as Row[],
};

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: (table: string) => {
      const result =
        table === 'profiles'
          ? { data: state.user ? { is_admin: state.isAdmin } : null, error: null }
          : { data: state.assignments, error: null };
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.single = async () => result;
      (b as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(result);
      return b;
    },
  }),
}));

import { GET } from '../route';

const req = () => new Request('http://localhost/api/curator/status') as never;

beforeEach(() => {
  state.user = { id: 'u1' };
  state.isAdmin = false;
  state.assignments = [];
});

describe('GET /api/curator/status', () => {
  it('returns non-curator status for an anonymous user', async () => {
    state.user = null;
    const res = await GET(req());
    const json = await res.json();
    expect(json).toMatchObject({ isCurator: false, isAdmin: false, languages: [] });
  });

  it('returns non-curator status for a plain authenticated user', async () => {
    const res = await GET(req());
    const json = await res.json();
    expect(json.isCurator).toBe(false);
    expect(json.languages).toEqual([]);
  });

  it('returns active languages for a curator', async () => {
    state.assignments = [
      { language: 'he', trust_tier: 2, active: true, curator_points: 30 },
      { language: 'en', trust_tier: 1, active: true, curator_points: 0 },
    ];
    const res = await GET(req());
    const json = await res.json();
    expect(json.isCurator).toBe(true);
    expect(json.languages).toEqual(['en', 'he']);
    expect(json.assignments).toHaveLength(2);
  });

  it('treats an admin as a curator for all languages', async () => {
    state.isAdmin = true;
    const res = await GET(req());
    const json = await res.json();
    expect(json.isCurator).toBe(true);
    expect(json.isAdmin).toBe(true);
    expect(json.languages).toEqual(['en', 'es', 'he', 'ja', 'sv']);
  });
});
