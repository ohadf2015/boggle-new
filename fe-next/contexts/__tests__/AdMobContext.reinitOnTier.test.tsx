import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AdMob } from '@capacitor-community/admob';
import { AdMobProvider, useAdMobContext } from '../AdMobContext';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';

// Native platform — the AdMob SDK is actually initialized here.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => 'android'),
    isPluginAvailable: vi.fn(() => true),
  },
}));
vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: vi.fn(() => Promise.resolve()),
    requestConsentInfo: vi.fn(() => Promise.resolve({ status: 'NOT_REQUIRED' })),
    showConsentForm: vi.fn(() => Promise.resolve({ status: 'OBTAINED' })),
    prepareInterstitial: vi.fn(() => Promise.resolve()),
  },
  AdmobConsentStatus: {
    UNKNOWN: 'UNKNOWN',
    NOT_REQUIRED: 'NOT_REQUIRED',
    REQUIRED: 'REQUIRED',
    OBTAINED: 'OBTAINED',
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));

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
  captureDeclare(social.setGuestBirthYear);
  return null;
}

/**
 * Recurring-pitfall Class 1 (dual source of truth + async resolution).
 *
 * `AdMob.initialize()` bakes tagForChildDirectedTreatment / tagForUnderAgeOfConsent
 * / maxAdContentRating into the SDK's RequestConfiguration. A brand-new guest is
 * tier 'unknown' at mount, so the SDK initializes CHILD-DIRECTED. The age gate
 * then flips that same guest to 'adult' — which is exactly what makes them
 * eligible for interstitials — but the old one-shot `initStarted` latch meant the
 * SDK kept serving every one of those interstitials from the child-directed,
 * non-personalized, mediation-disabled, G-rated-only pool for the whole session.
 *
 * The plugin re-applies the RequestConfiguration on EVERY initialize() call
 * (AdMob.java:67 `setRequestConfiguration(call)` runs before MobileAds.initialize),
 * so re-initializing on a tier change is the fix.
 */
describe('AdMobProvider — re-initializes the SDK when the ad-policy tier changes', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('re-applies a non-child-directed config after a guest declares 13+', async () => {
    let declare: ((year: number) => void) | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <Harness capture={() => {}} captureDeclare={(d) => { declare = d; }} />
        </AdMobProvider>
      );
    });

    // First init: undeclared guest → treated as a child.
    expect(AdMob.initialize).toHaveBeenCalledTimes(1);
    expect(vi.mocked(AdMob.initialize).mock.calls[0][0]).toMatchObject({
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
    });

    // The age gate flips the guest to a known adult.
    const adultYear = new Date().getFullYear() - 30;
    await act(async () => {
      declare!(adultYear);
    });

    // The SDK must be re-initialized with the adult config — otherwise every
    // interstitial this now-eligible user sees is served child-directed.
    expect(AdMob.initialize).toHaveBeenCalledTimes(2);
    expect(vi.mocked(AdMob.initialize).mock.calls[1][0]).toMatchObject({
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
  });

  it('does not re-initialize when the tier is unchanged', async () => {
    let ctx: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <Harness capture={(c) => { ctx = c; }} captureDeclare={() => {}} />
        </AdMobProvider>
      );
    });
    expect(AdMob.initialize).toHaveBeenCalledTimes(1);

    // A plain re-render (recordGameEnd → state update) must not re-init.
    await act(async () => {
      ctx!.recordGameEnd();
    });
    expect(AdMob.initialize).toHaveBeenCalledTimes(1);
  });

  it('never enables AdMob test mode implicitly — only via ADMOB_TEST_MODE', async () => {
    await act(async () => {
      render(
        <AdMobProvider>
          <Harness capture={() => {}} captureDeclare={() => {}} />
        </AdMobProvider>
      );
    });
    // capacitor.config.ts already documents that deriving this from NODE_ENV
    // shipped Google TEST ads to every non-production build. Same rule here.
    expect(vi.mocked(AdMob.initialize).mock.calls[0][0]).toMatchObject({
      initializeForTesting: false,
    });
  });

  it('shows the consent form at most once even across re-inits', async () => {
    let declare: ((year: number) => void) | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <Harness capture={() => {}} captureDeclare={(d) => { declare = d; }} />
        </AdMobProvider>
      );
    });
    const consentCalls = vi.mocked(AdMob.requestConsentInfo).mock.calls.length;

    await act(async () => {
      declare!(new Date().getFullYear() - 30);
    });

    expect(AdMob.initialize).toHaveBeenCalledTimes(2);
    expect(vi.mocked(AdMob.requestConsentInfo).mock.calls.length).toBe(consentCalls);
  });
});
