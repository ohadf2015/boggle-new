import { describe, it, expect } from 'vitest';
import {
  PRO_GRANT_DEFAULT_DAYS,
  proGrantExpiry,
  normalizeGrantEmail,
  proGrantStatus,
  resolveProEntitlement,
  isPaidProviderSubscription,
  proUserIdsFrom,
  type ProGrantRow,
  type SubscriptionRowLike,
} from '../proGrant';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 5, 12, 0, 0); // 2026-09-05T12:00Z

describe('proGrantExpiry', () => {
  it('defaults to one year', () => {
    expect(PRO_GRANT_DEFAULT_DAYS).toBe(365);
    expect(proGrantExpiry(NOW)).toBe(new Date(NOW + 365 * DAY).toISOString());
  });

  it('honours an explicit day count', () => {
    expect(proGrantExpiry(NOW, 30)).toBe(new Date(NOW + 30 * DAY).toISOString());
  });

  it('rejects non-positive or absurd durations', () => {
    expect(() => proGrantExpiry(NOW, 0)).toThrow();
    expect(() => proGrantExpiry(NOW, -5)).toThrow();
    expect(() => proGrantExpiry(NOW, 10_000)).toThrow();
  });
});

describe('normalizeGrantEmail', () => {
  it('lowercases and trims so a mixed-case address still matches on sign-in', () => {
    expect(normalizeGrantEmail('  Tori.Plant@Belcourt.K12.ND.US ')).toBe('tori.plant@belcourt.k12.nd.us');
  });

  it('returns null for something that is not an email', () => {
    expect(normalizeGrantEmail('not-an-email')).toBeNull();
    expect(normalizeGrantEmail('')).toBeNull();
  });
});

describe('proGrantStatus', () => {
  const base: ProGrantRow = {
    id: 'g1',
    email: 't@x.org',
    user_id: 'u1',
    expires_at: new Date(NOW + 300 * DAY).toISOString(),
    applied_at: new Date(NOW - DAY).toISOString(),
    revoked_at: null,
  };

  it('is active while applied and before expiry', () => {
    expect(proGrantStatus(base, NOW)).toBe('active');
  });

  it('is pending_signup when nobody has claimed the email yet', () => {
    expect(proGrantStatus({ ...base, user_id: null, applied_at: null }, NOW)).toBe('pending_signup');
  });

  it('is expired once the deadline passes, even if applied', () => {
    expect(proGrantStatus({ ...base, expires_at: new Date(NOW - 1).toISOString() }, NOW)).toBe('expired');
  });

  it('is revoked when revoked_at is set, regardless of expiry', () => {
    expect(proGrantStatus({ ...base, revoked_at: new Date(NOW).toISOString() }, NOW)).toBe('revoked');
  });
});

describe('isPaidProviderSubscription', () => {
  it('is true for an active Pro row that came from the payment provider', () => {
    expect(isPaidProviderSubscription({ tier: 'pro', status: 'active', source: 'polar', current_period_end: null })).toBe(true);
  });

  it('is true for a Polar trial — a grant must not overwrite it', () => {
    expect(isPaidProviderSubscription({ tier: 'pro', status: 'trialing', source: 'polar', current_period_end: null })).toBe(true);
  });

  it('is false for an admin grant, a free row, or a canceled paid row', () => {
    expect(isPaidProviderSubscription({ tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: null })).toBe(false);
    expect(isPaidProviderSubscription({ tier: 'free', status: 'active', source: 'polar', current_period_end: null })).toBe(false);
    expect(isPaidProviderSubscription({ tier: 'pro', status: 'canceled', source: 'polar', current_period_end: null })).toBe(false);
  });

  it('treats a missing source as the provider (rows that predate the column)', () => {
    expect(isPaidProviderSubscription({ tier: 'pro', status: 'active', current_period_end: null })).toBe(true);
  });
});

describe('resolveProEntitlement', () => {
  const grant = (periodEnd: string | null): SubscriptionRowLike => ({
    tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: periodEnd,
  });

  it('a provider subscription is Pro on tier+status alone — the webhook owns its lifecycle', () => {
    // Renewal webhooks can lag; a paying teacher must not lose Pro at 00:00 on renewal day.
    const r = resolveProEntitlement({ tier: 'pro', status: 'active', source: 'polar', current_period_end: new Date(NOW - DAY).toISOString() }, NOW);
    expect(r.hasPro).toBe(true);
    expect(r.source).toBe('polar');
  });

  it('an admin grant is Pro until its end date', () => {
    expect(resolveProEntitlement(grant(new Date(NOW + DAY).toISOString()), NOW).hasPro).toBe(true);
  });

  it('an admin grant past its end date is NOT Pro — nothing renews it', () => {
    const r = resolveProEntitlement(grant(new Date(NOW - 1).toISOString()), NOW);
    expect(r.hasPro).toBe(false);
    expect(r.source).toBe('admin_grant');
    expect(r.expired).toBe(true);
  });

  it('an admin grant with no end date is treated as expired, never as forever', () => {
    expect(resolveProEntitlement(grant(null), NOW).hasPro).toBe(false);
  });

  it('a free row or no row is not Pro', () => {
    expect(resolveProEntitlement({ tier: 'free', status: 'active', current_period_end: null }, NOW).hasPro).toBe(false);
    expect(resolveProEntitlement(null, NOW).hasPro).toBe(false);
  });

  it('a Polar trial (status trialing, tier pro) is Pro through its end date plus a day of webhook slack', () => {
    const r = resolveProEntitlement({
      tier: 'pro', status: 'trialing', source: 'polar',
      current_period_end: new Date(NOW - 60 * 60 * 1000).toISOString(),
    }, NOW);
    expect(r.hasPro).toBe(true);
    expect(r.source).toBe('polar');
    expect(r.expired).toBe(false);
    expect(r.paid).toBe(false);
  });

  it('a Polar trial more than a day past its end is not Pro even if the lapse webhook never came', () => {
    const r = resolveProEntitlement({
      tier: 'pro', status: 'trialing', source: 'polar',
      current_period_end: new Date(NOW - 2 * DAY).toISOString(),
    }, NOW);
    expect(r.hasPro).toBe(false);
  });

  it('a Polar trial with no end date stays Pro (nothing to backstop against)', () => {
    expect(resolveProEntitlement({ tier: 'pro', status: 'trialing', source: 'polar', current_period_end: null }, NOW).hasPro).toBe(true);
  });

  it('only an active provider row counts as paid', () => {
    expect(resolveProEntitlement({ tier: 'pro', status: 'active', source: 'polar', current_period_end: null }, NOW).paid).toBe(true);
    expect(resolveProEntitlement(grant(new Date(NOW + DAY).toISOString()), NOW).paid).toBe(false);
    expect(resolveProEntitlement(null, NOW).paid).toBe(false);
  });

  it('past_due keeps Pro for 7 days after the failed renewal date while the provider retries', () => {
    const pastDue = (endMs: number) => ({ tier: 'pro', status: 'past_due', source: 'polar', current_period_end: new Date(endMs).toISOString() });
    expect(resolveProEntitlement(pastDue(NOW - 6 * DAY), NOW).hasPro).toBe(true);
    expect(resolveProEntitlement(pastDue(NOW - 8 * DAY), NOW).hasPro).toBe(false);
    expect(resolveProEntitlement({ tier: 'pro', status: 'past_due', source: 'polar', current_period_end: null }, NOW).hasPro).toBe(false);
  });

  it('a canceled or paused Polar row is not Pro', () => {
    expect(resolveProEntitlement({ tier: 'pro', status: 'canceled', source: 'polar', current_period_end: new Date(NOW + DAY).toISOString() }, NOW).hasPro).toBe(false);
    expect(resolveProEntitlement({ tier: 'pro', status: 'paused', source: 'polar', current_period_end: null }, NOW).hasPro).toBe(false);
  });

  it('a trialing grant is still deadline-based, not a Polar trial', () => {
    const r = resolveProEntitlement({
      tier: 'pro', status: 'trialing', source: 'admin_grant',
      current_period_end: new Date(NOW + DAY).toISOString(),
    }, NOW);
    expect(r.hasPro).toBe(false);
    expect(r.source).toBe('admin_grant');
  });
});

describe('proUserIdsFrom', () => {
  it('keeps paying, trialing and live-grant users and drops lapsed ones', () => {
    const ids = proUserIdsFrom([
      { user_id: 'paid', tier: 'pro', status: 'active', source: 'polar', current_period_end: null },
      { user_id: 'trial', tier: 'pro', status: 'trialing', source: 'polar', current_period_end: null },
      { user_id: 'grant', tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: new Date(NOW + DAY).toISOString() },
      { user_id: 'oldGrant', tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: new Date(NOW - DAY).toISOString() },
      { user_id: 'canceled', tier: 'pro', status: 'canceled', source: 'polar', current_period_end: null },
      { user_id: 'free', tier: 'free', status: 'active', source: null, current_period_end: null },
    ], NOW);
    expect([...ids].sort()).toEqual(['grant', 'paid', 'trial']);
  });

  it('counts the same rows as Pro that the entitlement read does, for every lifecycle state', () => {
    const rows = [
      { user_id: 'polarActive', tier: 'pro', status: 'active', source: 'polar', current_period_end: '2026-09-01T00:00:00Z' },
      { user_id: 'legacyNullSource', tier: 'pro', status: 'active', source: null, current_period_end: null },
      { user_id: 'trialing', tier: 'pro', status: 'trialing', source: 'polar', current_period_end: '2026-09-10T00:00:00Z' },
      { user_id: 'staleTrial', tier: 'pro', status: 'trialing', source: 'polar', current_period_end: '2026-09-01T00:00:00Z' },
      { user_id: 'grantValid', tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: '2026-12-31T00:00:00Z' },
      { user_id: 'grantExpired', tier: 'pro', status: 'active', source: 'admin_grant', current_period_end: '2026-09-04T00:00:00Z' },
      { user_id: 'canceled', tier: 'pro', status: 'canceled', source: 'polar', current_period_end: '2026-10-01T00:00:00Z' },
      { user_id: 'revoked', tier: 'free', status: 'canceled', source: 'polar', current_period_end: null },
    ];
    expect([...proUserIdsFrom(rows, NOW)].sort()).toEqual(['grantValid', 'legacyNullSource', 'polarActive', 'trialing']);
  });
});
