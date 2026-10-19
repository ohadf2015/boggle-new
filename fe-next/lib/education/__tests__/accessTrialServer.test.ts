import { describe, it, expect, vi, beforeEach } from 'vitest';

let row: { trial_expires_at: string | null } | null = null;
let error: unknown = null;
let adminAvailable = true;
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () =>
    adminAvailable
      ? {
          from: () => {
            const chain: Record<string, unknown> = {};
            chain.select = () => chain;
            chain.eq = () => chain;
            chain.order = () => chain;
            chain.limit = () => chain;
            chain.maybeSingle = async () => ({ data: row, error });
            return chain;
          },
        }
      : null,
}));

import { liveAccessTrialExpiry, teacherHasProAccess } from '../accessTrialServer';

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

describe('access trial (server)', () => {
  beforeEach(() => {
    row = null;
    error = null;
    adminAvailable = true;
  });

  it('returns the end of a live window', async () => {
    const end = inDays(5);
    row = { trial_expires_at: end };
    expect(await liveAccessTrialExpiry('u1')).toBe(end);
  });

  it('is null when expired, missing, errored or the admin client is unavailable', async () => {
    row = { trial_expires_at: inDays(-1) };
    expect(await liveAccessTrialExpiry('u1')).toBeNull();
    row = null;
    expect(await liveAccessTrialExpiry('u1')).toBeNull();
    row = { trial_expires_at: inDays(5) };
    error = { message: 'boom' };
    expect(await liveAccessTrialExpiry('u1')).toBeNull();
    error = null;
    adminAvailable = false;
    expect(await liveAccessTrialExpiry('u1')).toBeNull();
  });

  it('teacherHasProAccess: paid Pro wins without a lookup, a live trial counts, a lapsed one does not', async () => {
    expect(await teacherHasProAccess('u1', { has_pro: true })).toBe(true);
    row = { trial_expires_at: inDays(3) };
    expect(await teacherHasProAccess('u1', { has_pro: false })).toBe(true);
    row = { trial_expires_at: inDays(-3) };
    expect(await teacherHasProAccess('u1', { has_pro: false })).toBe(false);
  });
});
