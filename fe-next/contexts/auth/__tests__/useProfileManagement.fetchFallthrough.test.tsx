/**
 * `fetchUserData` had two outcomes and no third.
 *
 * A `PGRST116` error auto-creates the row, and truthy `profileData` sets it.
 * There was no `else`. A network failure, a non-PGRST116 PostgREST error, or the
 * own-row `profiles` RLS shape this repo has hit before — 0 rows returned with
 * `error: null` — all fell straight through: `setProfile` never called, nothing
 * logged, nothing retried. `profile` stayed null for the life of the session,
 * and the student hub sat on a spinner that could not resolve.
 *
 * Recurring pitfall class 4: the failure path emitted nothing, so it looked
 * exactly like "nothing to do". It now retries once and, if that also comes back
 * empty, says so in the log.
 */
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockGetProfile, mockGetRankedProgress, mockCreateProfile, mockLoggerError, mockLoggerWarn } = vi.hoisted(() => ({
  mockGetProfile: vi.fn(),
  mockGetRankedProgress: vi.fn(),
  mockCreateProfile: vi.fn(),
  mockLoggerError: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getProfile: mockGetProfile,
  createProfile: mockCreateProfile,
  getRankedProgress: mockGetRankedProgress,
  updateProfile: vi.fn(async () => ({ data: null })),
  getGuestToken: vi.fn(() => null),
  claimGuestToken: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: mockLoggerError, warn: mockLoggerWarn, info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/utils/guestManager', () => ({
  getGuestSessionId: vi.fn(() => null),
  clearGuestData: vi.fn(),
  hashToken: vi.fn(() => ''),
}));
vi.mock('@/utils/utmCapture', () => ({ getUtmDataForProfile: vi.fn(() => ({})) }));
vi.mock('@/utils/dailyChallenge', () => ({ syncGuestDailyResultsToAccount: vi.fn() }));
vi.mock('@/utils/sentry', () => ({ captureBackgroundError: vi.fn() }));
vi.mock('@/utils/onboardingStorage', () => ({ getOnboardingData: vi.fn(() => null) }));

import { useProfileManagement } from '../hooks/useProfileManagement';

function setup() {
  const setProfile = vi.fn();
  const setRankedProgress = vi.fn();
  const { result } = renderHook(() =>
    useProfileManagement({
      user: null,
      setters: { setProfile, setRankedProgress } as never,
      submitPendingDailyResult: vi.fn(),
    } as never)
  );
  return { result, setProfile };
}

describe('fetchUserData — the silent fall-through', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRankedProgress.mockResolvedValue({ data: null });
  });

  it('retries once when the read returns 0 rows with no error', async () => {
    // GIVEN the own-row RLS shape: no data, no error
    mockGetProfile
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'u1', username: 'Maya' }, error: null });
    const { result, setProfile } = setup();

    // WHEN the profile is fetched
    await act(async () => { await result.current.fetchUserData('u1'); });

    // THEN the retry rescues it instead of leaving profile null forever
    await waitFor(() => expect(mockGetProfile).toHaveBeenCalledTimes(2));
    expect(setProfile).toHaveBeenCalled();
  });

  it('logs when both attempts come back empty instead of vanishing', async () => {
    // GIVEN a read that keeps failing the same silent way
    mockGetProfile.mockResolvedValue({ data: null, error: null });
    const { result } = setup();

    // WHEN the profile is fetched
    await act(async () => { await result.current.fetchUserData('u1'); });

    // THEN the failure is on the record, not swallowed
    expect(mockGetProfile).toHaveBeenCalledTimes(2);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('does not retry the PGRST116 path — that one auto-creates the row', async () => {
    // GIVEN a genuinely absent profile
    mockGetProfile.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockCreateProfile.mockResolvedValue({ data: { id: 'u1' }, error: null });
    const { result } = setup();

    // WHEN the profile is fetched (the create branch pulls in geo/avatar
    // helpers this focused test does not stub — its outcome is not the point)
    await act(async () => {
      await result.current.fetchUserData('u1').catch(() => undefined);
    });

    // THEN the read was NOT retried: PGRST116 already has an owner
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });
});
