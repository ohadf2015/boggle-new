import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AdMobProvider, useAdMobContext } from '../AdMobContext';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';

// Web platform → no native AdMob init noise.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
    isPluginAvailable: vi.fn(() => true),
  },
}));
vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: vi.fn(() => Promise.resolve()),
    requestConsentInfo: vi.fn(() => Promise.resolve({ status: 'NOT_REQUIRED' })),
    showConsentForm: vi.fn(() => Promise.resolve({ status: 'OBTAINED' })),
  },
  AdmobConsentStatus: { UNKNOWN: 'UNKNOWN', NOT_REQUIRED: 'NOT_REQUIRED', REQUIRED: 'REQUIRED', OBTAINED: 'OBTAINED' },
}));

// Guest session: not authenticated, no profile. We deliberately do NOT mock
// useSocialCapabilities — this proves the REAL guest-age path reaches the
// provider, which the unit test (mocked hook) structurally cannot.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));

/**
 * One real tree: AdMobProvider (its own useSocialCapabilities instance) wrapping
 * a consumer with a SEPARATE useSocialCapabilities instance. The consumer
 * declares the guest age — if propagation works, the provider's instance must
 * re-read and `hasNoAds()` must flip. This is the cross-instance scenario.
 */
function Harness({
  capture,
  captureDeclare,
}: {
  capture: (ctx: ReturnType<typeof useAdMobContext>) => void;
  captureDeclare: (declare: (year: number) => void) => void;
}) {
  const adMob = useAdMobContext();
  const social = useSocialCapabilities();
  capture(adMob);
  // Hand the test this instance's declare fn — it lives in a DIFFERENT
  // useSocialCapabilities instance than the provider's, so triggering it proves
  // cross-instance propagation reaches the provider.
  captureDeclare(social.setGuestBirthYear);
  return null;
}

describe('AdMobProvider — guest declares under-13 mid-session', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('suppresses ads once a guest declares an under-13 age, without reload', async () => {
    let ctx: ReturnType<typeof useAdMobContext> | null = null;
    let declare: ((year: number) => void) | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <Harness capture={(c) => { ctx = c; }} captureDeclare={(d) => { declare = d; }} />
        </AdMobProvider>
      );
    });

    // Guest, no age declared yet → unknown tier → ads served.
    expect(ctx!.hasNoAds()).toBe(false);

    // Guest declares an under-13 birth year mid-session (from a DIFFERENT hook instance).
    const underThirteen = new Date().getFullYear() - 6;
    await act(async () => {
      declare!(underThirteen);
    });

    // The provider's own instance must have re-read → child tier → ads suppressed.
    expect(ctx!.hasNoAds()).toBe(true);
  });
});
