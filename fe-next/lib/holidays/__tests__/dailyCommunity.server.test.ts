import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { COMMUNITY_TTL_MS, communityCount, resetCommunityCache } from '../dailyCommunity.server';

function counter(result: { count: number | null; error: { message: string } | null }) {
  const calls: unknown[][] = [];
  const q = {
    select: (...a: unknown[]) => (calls.push(['select', ...a]), q),
    eq: (...a: unknown[]) => (calls.push(['eq', ...a]), q),
    not: (...a: unknown[]) => (calls.push(['not', ...a]), q),
    then: (res: (v: typeof result) => unknown) => Promise.resolve(res(result)),
  };
  return { calls, supabase: { from: (t: string) => (calls.push(['from', t]), q) } as unknown as SupabaseClient };
}

beforeEach(() => resetCommunityCache());

describe('communityCount', () => {
  it('Given rows lit tonight, Then it counts them for that event and date', async () => {
    const db = counter({ count: 42, error: null });
    expect(await communityCount({ supabase: db.supabase, holiday: 'hanukkah', localDate: '2026-12-06' })).toBe(42);
    expect(db.calls).toContainEqual(['eq', 'event_key', 'hanukkah-2026']);
    expect(db.calls).toContainEqual(['eq', 'played_on', '2026-12-06']);
  });

  it('Given test accounts and players with no country set, Then both events count every real player (no country filter)', async () => {
    const h = counter({ count: 1, error: null });
    await communityCount({ supabase: h.supabase, holiday: 'hanukkah', localDate: '2026-12-06' });
    expect(h.calls).toContainEqual(['not', 'profiles.is_test_account', 'is', true]);
    expect(h.calls).not.toContainEqual(['eq', 'profiles.country_code', 'IL']);
    const c = counter({ count: 1, error: null });
    await communityCount({ supabase: c.supabase, holiday: 'christmas', localDate: '2026-12-15' });
    expect(c.calls).toContainEqual(['not', 'profiles.is_test_account', 'is', true]);
    expect(c.calls).not.toContainEqual(['eq', 'profiles.country_code', 'IL']);
  });

  it('Given a second read inside a minute, Then the cached count is served without a query', async () => {
    const db = counter({ count: 5, error: null });
    const now = 1_000_000;
    await communityCount({ supabase: db.supabase, holiday: 'christmas', localDate: '2026-12-15', now });
    const before = db.calls.length;
    expect(await communityCount({ supabase: db.supabase, holiday: 'christmas', localDate: '2026-12-15', now: now + COMMUNITY_TTL_MS - 1 })).toBe(5);
    expect(db.calls.length).toBe(before);
    await communityCount({ supabase: db.supabase, holiday: 'christmas', localDate: '2026-12-15', now: now + COMMUNITY_TTL_MS + 1 });
    expect(db.calls.length).toBeGreaterThan(before);
  });

  it('Given the query errors or the date is outside the holiday, Then it returns null', async () => {
    expect(await communityCount({ supabase: counter({ count: null, error: { message: 'x' } }).supabase, holiday: 'hanukkah', localDate: '2026-12-06' })).toBeNull();
    expect(await communityCount({ supabase: counter({ count: 1, error: null }).supabase, holiday: 'hanukkah', localDate: '2026-11-01' })).toBeNull();
  });
});

describe('locale-extended christmas', () => {
  it('Given an es player on Jan 4 and a ru player on Jan 7, Then the counter counts; an en player on Jan 4 gets null', async () => {
    expect(await communityCount({ supabase: counter({ count: 7, error: null }).supabase, holiday: 'christmas', localDate: '2027-01-04', locale: 'es' })).toBe(7);
    expect(await communityCount({ supabase: counter({ count: 8, error: null }).supabase, holiday: 'christmas', localDate: '2027-01-07', locale: 'ru' })).toBe(8);
    expect(await communityCount({ supabase: counter({ count: 9, error: null }).supabase, holiday: 'christmas', localDate: '2027-01-05', locale: 'en' })).toBeNull();
  });
});
