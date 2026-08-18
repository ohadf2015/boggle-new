import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AdMobProvider, useAdMobContext } from '../AdMobContext';

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
    requestConsentInfo: vi.fn(() => Promise.resolve({ status: 'NOT_REQUIRED', canRequestAds: true })),
    showConsentForm: vi.fn(() => Promise.resolve({ status: 'OBTAINED', canRequestAds: true })),
  },
  AdmobConsentStatus: {
    UNKNOWN: 'UNKNOWN',
    NOT_REQUIRED: 'NOT_REQUIRED',
    REQUIRED: 'REQUIRED',
    OBTAINED: 'OBTAINED',
  },
}));

// Control the social tier the provider sees. Families Policy: a known child
// (actual knowledge of under-13) must get NO ads.
const social = vi.hoisted(() => ({
  tier: 'unknown' as 'adult' | 'child' | 'unknown',
  // authResolved flips true once auth settles. Init is deferred until then so a
  // logged-in adult (whose tier resolves async) is not child-directed for the
  // whole session. Default true so existing tests init synchronously.
  authResolved: true,
}));
vi.mock('@/hooks/useSocialCapabilities', () => ({
  useSocialCapabilities: () => ({ tier: social.tier, authResolved: social.authResolved }),
}));

import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';

function TestConsumer({ onMount }: { onMount: (ctx: ReturnType<typeof useAdMobContext>) => void }) {
  const ctx = useAdMobContext();
  onMount(ctx);
  return null;
}

describe('AdMobProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    social.tier = 'unknown';
    social.authResolved = true;
    // The game-end counter is persisted now (lc_total_game_ends), so it would
    // otherwise leak across cases in this file.
    localStorage.clear();
  });

  it('does not initialize AdMob on web', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const onMount = vi.fn();
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={onMount} />
        </AdMobProvider>
      );
    });
    expect(AdMob.initialize).not.toHaveBeenCalled();
  });

  it('initializes AdMob on native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={vi.fn()} />
        </AdMobProvider>
      );
    });
    // Families: child-directed init config travels across the bridge to the
    // native plugin. Default test tier is 'unknown' → treated as child-directed.
    expect(AdMob.initialize).toHaveBeenCalledWith({
      initializeForTesting: true,
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
      maxAdContentRating: 'General',
    });
  });

  it('DEFERS AdMob.initialize until auth resolves, then inits with the real adult tier', async () => {
    // First render: auth still loading → tier reads 'unknown'. Initializing here
    // would child-direct a logged-in adult for the whole session.
    social.authResolved = false;
    social.tier = 'unknown';
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    let result: ReturnType<typeof render> | null = null;
    await act(async () => {
      result = render(
        <AdMobProvider>
          <TestConsumer onMount={vi.fn()} />
        </AdMobProvider>
      );
    });
    expect(AdMob.initialize).not.toHaveBeenCalled();

    // Auth resolves: known adult.
    social.authResolved = true;
    social.tier = 'adult';
    await act(async () => {
      result!.rerender(
        <AdMobProvider>
          <TestConsumer onMount={vi.fn()} />
        </AdMobProvider>
      );
    });
    expect(AdMob.initialize).toHaveBeenCalledWith({
      initializeForTesting: true,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      maxAdContentRating: 'General',
    });
  });

  it('requests UMP consent BEFORE AdMob.initialize on native (EU/GDPR gate)', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    const order: string[] = [];
    vi.mocked(AdMob.requestConsentInfo).mockImplementationOnce(async () => {
      order.push('requestConsentInfo');
      return { status: 'NOT_REQUIRED' as never, canRequestAds: true };
    });
    vi.mocked(AdMob.initialize).mockImplementationOnce(async () => {
      order.push('initialize');
    });
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await captured!.whenReady();
    expect(order).toEqual(['requestConsentInfo', 'initialize']);
  });

  it('shows UMP consent form when status === REQUIRED and form available', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValueOnce({
      status: 'REQUIRED' as never,
      isConsentFormAvailable: true,
      canRequestAds: false,
    } as never);
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await captured!.whenReady();
    expect(AdMob.showConsentForm).toHaveBeenCalled();
  });

  it('skips showConsentForm when status === NOT_REQUIRED (non-EEA)', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValueOnce({
      status: 'NOT_REQUIRED' as never,
      canRequestAds: true,
    } as never);
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await captured!.whenReady();
    expect(AdMob.showConsentForm).not.toHaveBeenCalled();
    expect(AdMob.initialize).toHaveBeenCalled();
  });

  it('still initializes AdMob even if requestConsentInfo throws (graceful degrade)', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(AdMob.requestConsentInfo).mockRejectedValueOnce(new Error('UMP network fail'));
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await captured!.whenReady();
    expect(AdMob.initialize).toHaveBeenCalled();
  });

  it('does NOT call requestConsentInfo on web', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={vi.fn()} />
        </AdMobProvider>
      );
    });
    expect(AdMob.requestConsentInfo).not.toHaveBeenCalled();
  });

  it('hasNoAds serves ads to unknown-age users (no actual knowledge of a child)', async () => {
    social.tier = 'unknown';
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    expect(captured!.hasNoAds()).toBe(false);
  });

  it('hasNoAds serves ads to adults', async () => {
    social.tier = 'adult';
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    expect(captured!.hasNoAds()).toBe(false);
  });

  it('hasNoAds suppresses ads for a known child (Families Policy / COPPA actual knowledge)', async () => {
    social.tier = 'child';
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    expect(captured!.hasNoAds()).toBe(true);
  });

  it('shouldShowInterstitial returns false during warmup (first 3 game ends)', async () => {
    social.tier = 'adult'; // interstitials are adult-only; isolate the warmup gate
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    captured!.recordGameEnd();
    captured!.recordGameEnd();
    captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(false);
  });

  it('shouldShowInterstitial returns true on 3rd game after warmup', async () => {
    social.tier = 'adult'; // only known adults are eligible for interstitials
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    captured!.recordGameEnd(); // 1
    captured!.recordGameEnd(); // 2
    captured!.recordGameEnd(); // 3
    captured!.recordGameEnd(); // 4
    captured!.recordGameEnd(); // 5
    captured!.recordGameEnd(); // 6
    expect(captured!.shouldShowInterstitial()).toBe(true);
  });

  it('counts game ends across sessions, so the slot does not need 6 games in one sitting', async () => {
    social.tier = 'adult';
    let first: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { first = ctx; }} />
        </AdMobProvider>
      );
    });
    // Five games, then the user closes the app. No slot yet.
    for (let i = 0; i < 5; i++) first!.recordGameEnd();
    expect(first!.shouldShowInterstitial()).toBe(false);

    // Fresh launch — a brand-new provider, as on a cold start.
    let second: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { second = ctx; }} />
        </AdMobProvider>
      );
    });
    expect(second!.shouldShowInterstitial()).toBe(false); // 5 lifetime games, not due
    second!.recordGameEnd(); // 6th game overall
    expect(second!.shouldShowInterstitial()).toBe(true);
  });

  it('falls back to session-scoped counting when localStorage throws', async () => {
    social.tier = 'adult';
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    try {
      let captured: ReturnType<typeof useAdMobContext> | null = null;
      await act(async () => {
        render(
          <AdMobProvider>
            <TestConsumer onMount={(ctx) => { captured = ctx; }} />
          </AdMobProvider>
        );
      });
      for (let i = 0; i < 6; i++) captured!.recordGameEnd();
      expect(captured!.shouldShowInterstitial()).toBe(true);
    } finally {
      spy.mockRestore();
      setSpy.mockRestore();
    }
  });

  it('caps interstitials at MAX_INTERSTITIALS_PER_SESSION (4) regardless of game-end count', async () => {
    social.tier = 'adult';
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    // Warmup (3 game-ends, no ads)
    for (let i = 0; i < 3; i++) captured!.recordGameEnd();
    // Four eligible cycles: each = 3 more game-ends, gate true, record show
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) captured!.recordGameEnd();
      expect(captured!.shouldShowInterstitial()).toBe(true);
      captured!.recordInterstitialShown();
    }
    // 5th eligible cycle: gate must now block on session cap
    for (let j = 0; j < 3; j++) captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(false);
  });

  it('recordInterstitialShown only blocks after cap reached, not before', async () => {
    social.tier = 'adult';
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    // Warmup + 1 cycle, record only 1 show
    for (let i = 0; i < 6; i++) captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(true);
    captured!.recordInterstitialShown();
    // Cap not reached — gate should still pass on next eligible cycle
    for (let j = 0; j < 3; j++) captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(true);
  });

  // Families Ad Format Requirements: interstitials are the cited format and must
  // not reach anyone we don't KNOW is an adult. These are the v5740 fix.
  it('shouldShowInterstitial NEVER fires for undeclared guests, even past warmup', async () => {
    social.tier = 'unknown';
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    // Six game-ends would make an adult eligible; an undeclared guest stays blocked.
    for (let i = 0; i < 6; i++) captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(false);
  });

  it('shouldShowInterstitial NEVER fires for a known child', async () => {
    social.tier = 'child';
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    for (let i = 0; i < 6; i++) captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(false);
  });

  it('initializes AdMob WITHOUT child-directed tags for a known adult', async () => {
    social.tier = 'adult';
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={vi.fn()} />
        </AdMobProvider>
      );
    });
    expect(AdMob.initialize).toHaveBeenCalledWith({
      initializeForTesting: true,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      maxAdContentRating: 'General',
    });
  });

  it('getConfig returns null on web', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    expect(captured!.getConfig()).toBeNull();
  });

  it('exposes whenReady() that resolves after AdMob.initialize settles on native', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    let resolveInit: (() => void) | null = null;
    vi.mocked(AdMob.initialize).mockImplementationOnce(
      () => new Promise<void>((res) => { resolveInit = () => res(); })
    );
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    let resolved = false;
    const ready = captured!.whenReady().then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    resolveInit!();
    await ready;
    expect(resolved).toBe(true);
  });

  it('whenReady() resolves immediately on web', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await expect(captured!.whenReady()).resolves.toBeUndefined();
  });

  it('throws when used outside provider', () => {
    expect(() => {
      render(<TestConsumer onMount={vi.fn()} />);
    }).toThrow('useAdMobContext must be used within AdMobProvider');
  });

  // Age-gate opportunity: interstitials are suppressed for the 'unknown' tier,
  // which (post-Families-exit, 13+ listing) left the format earning ₪0. When
  // the cadence would have fired but the ONLY blocker is the undeclared tier,
  // the provider raises a flag so the UI can ask for the user's age at that
  // natural break instead of showing an ad. Declared 13+ → 'adult' → real
  // interstitials from the next eligible game.
  describe('ageGatePromptOpportunity', () => {
    async function renderCaptured() {
      let captured: ReturnType<typeof useAdMobContext> | null = null;
      await act(async () => {
        render(
          <AdMobProvider>
            <TestConsumer onMount={(ctx) => { captured = ctx; }} />
          </AdMobProvider>
        );
      });
      return () => captured!;
    }

    it('flags the opportunity when the cadence hits and tier is unknown', async () => {
      social.tier = 'unknown';
      const ctx = await renderCaptured();
      expect(ctx().ageGatePromptOpportunity).toBe(false);
      await act(async () => {
        for (let i = 0; i < 6; i++) ctx().recordGameEnd(); // warmup 3 + cadence 3
      });
      expect(ctx().ageGatePromptOpportunity).toBe(true);
    });

    it('does not flag during warmup', async () => {
      social.tier = 'unknown';
      const ctx = await renderCaptured();
      await act(async () => {
        for (let i = 0; i < 3; i++) ctx().recordGameEnd();
      });
      expect(ctx().ageGatePromptOpportunity).toBe(false);
    });

    it('does not flag for a declared adult (the real interstitial shows instead)', async () => {
      social.tier = 'adult';
      const ctx = await renderCaptured();
      await act(async () => {
        for (let i = 0; i < 6; i++) ctx().recordGameEnd();
      });
      expect(ctx().ageGatePromptOpportunity).toBe(false);
    });

    it('does not flag for a declared child (age already known, no ads at all)', async () => {
      social.tier = 'child';
      const ctx = await renderCaptured();
      await act(async () => {
        for (let i = 0; i < 6; i++) ctx().recordGameEnd();
      });
      expect(ctx().ageGatePromptOpportunity).toBe(false);
    });
  });
});
