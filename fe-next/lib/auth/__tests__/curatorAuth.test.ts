/**
 * Tests for verifyCuratorAuth — the server-side gate for Language Curator API
 * routes. Mirrors verifyAdminAuth's shape but resolves the caller's active
 * language assignments and (optionally) checks a required language.
 *
 * TDD: written BEFORE implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Configurable Supabase mock ----------------------------------------------
type Row = { language: string; trust_tier: number; active: boolean };
const state: {
  user: { id: string; email?: string } | null;
  authError: boolean;
  isAdmin: boolean;
  assignments: Row[];
} = { user: { id: 'u1', email: 'c@x.com' }, authError: false, isAdmin: false, assignments: [] };

function makeClient() {
  return {
    auth: {
      getUser: vi.fn(async () =>
        state.authError || !state.user
          ? { data: { user: null }, error: { message: 'bad' } }
          : { data: { user: state.user }, error: null }
      ),
    },
    from: (table: string) => {
      // thenable query builder: chainable .eq(), terminal .single() or await
      const result =
        table === 'profiles'
          ? { data: { is_admin: state.isAdmin, username: 'cu' }, error: null }
          : { data: state.assignments, error: null };
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.single = async () => result;
      // make the builder awaitable for the assignments (no .single) path
      (builder as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(result);
      return builder;
    },
  };
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => makeClient() }));
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => makeClient() }));

import { verifyCuratorAuth } from '../curatorAuth';

function bearerReq(token = 'tok'): never {
  return new Request('http://localhost/api/curator/overview', {
    headers: { authorization: `Bearer ${token}` },
  }) as never;
}

beforeEach(() => {
  state.user = { id: 'u1', email: 'c@x.com' };
  state.authError = false;
  state.isAdmin = false;
  state.assignments = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://x';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
});

describe('verifyCuratorAuth', () => {
  it('401 when no authorization header and no cookie session', async () => {
    state.user = null; // cookie path also yields no user
    const noHeader = new Request('http://localhost/api/curator/overview') as never;
    const res = await verifyCuratorAuth(noHeader);
    expect(res.success).toBe(false);
    expect(res.response?.status).toBe(401);
  });

  it('401 on an invalid bearer token', async () => {
    state.authError = true;
    const res = await verifyCuratorAuth(bearerReq());
    expect(res.success).toBe(false);
    expect(res.response?.status).toBe(401);
  });

  it('403 when authenticated but holds no active curator assignment', async () => {
    state.assignments = [];
    const res = await verifyCuratorAuth(bearerReq());
    expect(res.success).toBe(false);
    expect(res.response?.status).toBe(403);
  });

  it('treats a revoked assignment as no access (403)', async () => {
    state.assignments = [{ language: 'he', trust_tier: 1, active: false }];
    const res = await verifyCuratorAuth(bearerReq());
    expect(res.success).toBe(false);
    expect(res.response?.status).toBe(403);
  });

  it('succeeds for a curator and returns their active languages', async () => {
    state.assignments = [
      { language: 'he', trust_tier: 2, active: true },
      { language: 'en', trust_tier: 1, active: true },
      { language: 'ja', trust_tier: 1, active: false },
    ];
    const res = await verifyCuratorAuth(bearerReq());
    expect(res.success).toBe(true);
    expect(res.user?.id).toBe('u1');
    expect(res.languages).toEqual(['en', 'he']);
    expect(res.isAdmin).toBe(false);
  });

  it('admins bypass with all supported languages even without an assignment row', async () => {
    state.isAdmin = true;
    state.assignments = [];
    const res = await verifyCuratorAuth(bearerReq());
    expect(res.success).toBe(true);
    expect(res.isAdmin).toBe(true);
    expect(res.languages).toEqual(['en', 'es', 'he', 'ja', 'sv']);
  });

  it('passes a required-language check for an assigned language', async () => {
    state.assignments = [{ language: 'he', trust_tier: 1, active: true }];
    const res = await verifyCuratorAuth(bearerReq(), { language: 'he' });
    expect(res.success).toBe(true);
  });

  it('403 on a required-language check for a non-assigned language', async () => {
    state.assignments = [{ language: 'he', trust_tier: 1, active: true }];
    const res = await verifyCuratorAuth(bearerReq(), { language: 'en' });
    expect(res.success).toBe(false);
    expect(res.response?.status).toBe(403);
  });

  it('admin passes a required-language check for any language', async () => {
    state.isAdmin = true;
    const res = await verifyCuratorAuth(bearerReq(), { language: 'sv' });
    expect(res.success).toBe(true);
  });

  it('returns the trust tier for a required language (admin → max)', async () => {
    state.assignments = [{ language: 'he', trust_tier: 3, active: true }];
    const res = await verifyCuratorAuth(bearerReq(), { language: 'he' });
    expect(res.tier).toBe(3);
  });
});
