import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Regression test for Sentry JAVASCRIPT-NEXTJS-1M8:
 *   "[FLAGS] Error checking admin status for user 00000000-…-0001"
 *   logger.data: "Cannot coerce the result to a single JSON object" (PGRST116)
 *
 * checkIsAdmin() queried profiles with .single(), which errors when the
 * user has no profile row (e.g. the all-zeros sentinel UUID probed via curl).
 * getFeatureFlag() was already migrated to .maybeSingle() for the same reason
 * (featureFlags.ts:46). checkIsAdmin() was missed. Missing profile must mean
 * "not admin" silently — never an error-level log.
 */

const flagSingleMock = vi.fn();
const flagMaybeSingleMock = vi.fn();
const profileSingleMock = vi.fn();
const profileMaybeSingleMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: fromMock }),
}));

const errorMock = vi.fn();
vi.mock('../logger', () => ({
  default: {
    warn: vi.fn(),
    error: errorMock,
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

/** Route .from('feature_flags') vs .from('profiles') to separate mock chains. */
function setupTables(opts: {
  flag: { data: unknown; error?: unknown };
  profile: { data: unknown; error?: unknown };
}) {
  flagSingleMock.mockResolvedValue({ data: opts.flag.data, error: opts.flag.error ?? null });
  flagMaybeSingleMock.mockResolvedValue({ data: opts.flag.data, error: opts.flag.error ?? null });
  profileSingleMock.mockResolvedValue({ data: opts.profile.data, error: opts.profile.error ?? null });
  profileMaybeSingleMock.mockResolvedValue({ data: opts.profile.data, error: opts.profile.error ?? null });

  fromMock.mockImplementation((table: string) => {
    const single = table === 'profiles' ? profileSingleMock : flagSingleMock;
    const maybeSingle = table === 'profiles' ? profileMaybeSingleMock : flagMaybeSingleMock;
    const eq: ReturnType<typeof vi.fn> = vi.fn(() => ({ single, maybeSingle, eq }));
    return { select: vi.fn(() => ({ eq })) };
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkIsAdmin (via canAccessFeature) — missing profile row', () => {
  it('treats a missing profile as not-admin WITHOUT logging an error', async () => {
    // Enabled, non-admin-only flag at <100% rollout so the path reaches checkIsAdmin.
    setupTables({
      flag: {
        data: {
          flag_name: 'some_feature',
          enabled: true,
          admin_only: false,
          rollout_percentage: 50,
          created_at: '2026-01-01',
        },
      },
      // Missing row: .single() yields PGRST116; .maybeSingle() yields {data:null,error:null}.
      profile: {
        data: null,
        error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' },
      },
    });
    // maybeSingle path (the fix) returns a clean null for the missing row.
    profileMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    const { canAccessFeature, __clearFlagCache } = await import('../featureFlags');
    __clearFlagCache();

    await canAccessFeature('00000000-0000-0000-0000-000000000001', 'some_feature');

    // The bug: .single() surfaced PGRST116 → logger.error('FLAGS', 'Error checking admin status…').
    // The fix: .maybeSingle() returns null cleanly → no admin lookup error is ever logged.
    const adminErrors = errorMock.mock.calls.filter(
      ([, msg]) => typeof msg === 'string' && msg.includes('Error checking admin status'),
    );
    expect(adminErrors).toHaveLength(0);

    // And we must use .maybeSingle() (tolerant of 0 rows), never .single().
    expect(profileMaybeSingleMock).toHaveBeenCalled();
    expect(profileSingleMock).not.toHaveBeenCalled();
  });
});
