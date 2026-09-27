/**
 * Tests for the player-list filter builder used by GET /api/admin/players.
 * Validates the Supabase query chain receives the right .eq()/.gte()/.lte()
 * calls for each filter input.
 */

import { applyPlayerListFilters, type PlayerListFilters } from '../playerListFilters';

function makeQuery() {
  const calls: { method: string; args: unknown[] }[] = [];
  const query = {
    eq: vi.fn((col: string, val: unknown) => { calls.push({ method: 'eq', args: [col, val] }); return query; }),
    gte: vi.fn((col: string, val: unknown) => { calls.push({ method: 'gte', args: [col, val] }); return query; }),
    lte: vi.fn((col: string, val: unknown) => { calls.push({ method: 'lte', args: [col, val] }); return query; }),
    lt: vi.fn((col: string, val: unknown) => { calls.push({ method: 'lt', args: [col, val] }); return query; }),
    or: vi.fn((expr: string) => { calls.push({ method: 'or', args: [expr] }); return query; }),
    calls,
  };
  return query;
}

describe('applyPlayerListFilters', () => {
  it('applies country filter when set', () => {
    const q = makeQuery();
    applyPlayerListFilters(q as never, { country: 'IL' });
    expect(q.calls).toContainEqual({ method: 'eq', args: ['country_code', 'IL'] });
  });

  it('applies admin role filter as is_admin=true', () => {
    const q = makeQuery();
    applyPlayerListFilters(q as never, { role: 'admin' });
    expect(q.calls).toContainEqual({ method: 'eq', args: ['is_admin', true] });
  });

  it('applies teacher role filter as user_role=teacher', () => {
    const q = makeQuery();
    applyPlayerListFilters(q as never, { role: 'teacher' });
    expect(q.calls).toContainEqual({ method: 'eq', args: ['user_role', 'teacher'] });
  });

  it('applies hasBlast filter as blast_access=true', () => {
    const q = makeQuery();
    applyPlayerListFilters(q as never, { hasBlast: true });
    expect(q.calls).toContainEqual({ method: 'eq', args: ['blast_access', true] });
  });

  it('applies hasBeta filter as is_beta_tester=true', () => {
    const q = makeQuery();
    applyPlayerListFilters(q as never, { hasBeta: true });
    expect(q.calls).toContainEqual({ method: 'eq', args: ['is_beta_tester', true] });
  });

  it('applies mmrMin / mmrMax as gte / lte on ranked_mmr', () => {
    const q = makeQuery();
    applyPlayerListFilters(q as never, { mmrMin: 1200, mmrMax: 1800 });
    expect(q.calls).toContainEqual({ method: 'gte', args: ['ranked_mmr', 1200] });
    expect(q.calls).toContainEqual({ method: 'lte', args: ['ranked_mmr', 1800] });
  });

  it('applies daysSinceActive as lt last_game_at < cutoff', () => {
    const q = makeQuery();
    const before = Date.now();
    applyPlayerListFilters(q as never, { daysSinceActive: 14 });
    const ltCalls = q.calls.filter(c => c.method === 'lt' && c.args[0] === 'last_game_at');
    expect(ltCalls).toHaveLength(1);
    const cutoff = new Date(ltCalls[0].args[1] as string).getTime();
    expect(cutoff).toBeLessThanOrEqual(before - 14 * 86_400_000 + 5_000); // tolerate 5s drift
    expect(cutoff).toBeGreaterThanOrEqual(before - 14 * 86_400_000 - 5_000);
  });

  it('applies search via or() across username + display_name', () => {
    const q = makeQuery();
    applyPlayerListFilters(q as never, { search: 'alice' });
    const orCalls = q.calls.filter(c => c.method === 'or');
    expect(orCalls).toHaveLength(1);
    expect(orCalls[0].args[0]).toContain('username.ilike.%alice%');
    expect(orCalls[0].args[0]).toContain('display_name.ilike.%alice%');
  });

  it('escapes Postgres LIKE pattern chars in search input', () => {
    const q = makeQuery();
    // Without escaping, "ev%il_one" would match anything containing "ev" and "one".
    applyPlayerListFilters(q as never, { search: 'ev%il_one' });
    const orCalls = q.calls.filter(c => c.method === 'or');
    expect(orCalls[0].args[0]).not.toContain('ev%il_one');
    // Backslash-escaped variants should be present (% and _).
    expect(orCalls[0].args[0]).toContain('ev\\%il\\_one');
  });

  it('combines all filters at once', () => {
    const q = makeQuery();
    const filters: PlayerListFilters = {
      search: 'al',
      country: 'IL',
      role: 'teacher',
      hasBlast: true,
      mmrMin: 1000,
      daysSinceActive: 7,
    };
    applyPlayerListFilters(q as never, filters);
    expect(q.calls.find(c => c.method === 'eq' && c.args[0] === 'country_code')).toBeTruthy();
    expect(q.calls.find(c => c.method === 'eq' && c.args[0] === 'user_role')).toBeTruthy();
    expect(q.calls.find(c => c.method === 'eq' && c.args[0] === 'blast_access')).toBeTruthy();
    expect(q.calls.find(c => c.method === 'gte' && c.args[0] === 'ranked_mmr')).toBeTruthy();
    expect(q.calls.find(c => c.method === 'lt' && c.args[0] === 'last_game_at')).toBeTruthy();
    expect(q.calls.find(c => c.method === 'or')).toBeTruthy();
  });

  it('applies no filters when none are set', () => {
    const q = makeQuery();
    applyPlayerListFilters(q as never, {});
    expect(q.calls).toEqual([]);
  });
});
