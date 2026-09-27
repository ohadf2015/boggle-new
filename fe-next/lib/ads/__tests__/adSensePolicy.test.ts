import { describe, it, expect, afterEach } from 'vitest';
import {
  getAdSenseAccountMeta,
  getAdSenseClient,
  isAdSenseConfigured,
  shouldLoadAdSense,
  summarizeAdSenseFill,
} from '../adSensePolicy';

describe('adSensePolicy — config', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ADSENSE_ENABLED;
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  });

  it('defaults the client to the direct publisher id', () => {
    expect(getAdSenseClient()).toBe('ca-pub-1896836706464880');
  });

  it('allows overriding the client id via env', () => {
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = 'ca-pub-9999999999999999';
    expect(getAdSenseClient()).toBe('ca-pub-9999999999999999');
  });

  it('is dark (not configured) unless explicitly enabled', () => {
    expect(isAdSenseConfigured()).toBe(false);
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED = 'true';
    expect(isAdSenseConfigured()).toBe(true);
  });
});

describe('adSensePolicy — account verification meta', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ADSENSE_ENABLED;
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  });

  // The <meta name="google-adsense-account"> tag is Google's privacy-neutral
  // site-ownership signal: no script, no cookie, no tracking. It MUST render even
  // while ad *serving* is dark (NEXT_PUBLIC_ADSENSE_ENABLED unset), otherwise the
  // AdSense review crawler — which never grants cookie consent and so never
  // triggers the consent-gated adsbygoogle.js — cannot verify the site at all.
  it('returns the publisher id for verification regardless of the dark flag', () => {
    expect(isAdSenseConfigured()).toBe(false); // serving off
    expect(getAdSenseAccountMeta()).toBe('ca-pub-1896836706464880'); // verify still on
  });

  it('reflects the env-overridden client id', () => {
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = 'ca-pub-9999999999999999';
    expect(getAdSenseAccountMeta()).toBe('ca-pub-9999999999999999');
  });
});

describe('adSensePolicy — shouldLoadAdSense', () => {
  const base = {
    enabled: true,
    hasAdConsent: true,
    isNative: false,
    isCrazyGames: false,
    suppressedByTier: false,
  };

  it('loads only when enabled + ad-consent granted + web + adult', () => {
    expect(shouldLoadAdSense(base)).toBe(true);
  });

  it('does NOT load without advertising consent (GDPR — script withheld)', () => {
    expect(shouldLoadAdSense({ ...base, hasAdConsent: false })).toBe(false);
  });

  it('does NOT load when the integration is dark (env off)', () => {
    expect(shouldLoadAdSense({ ...base, enabled: false })).toBe(false);
  });

  it('does NOT load on native (Capacitor uses AdMob) or CrazyGames', () => {
    expect(shouldLoadAdSense({ ...base, isNative: true })).toBe(false);
    expect(shouldLoadAdSense({ ...base, isCrazyGames: true })).toBe(false);
  });

  it('does NOT load for a child tier (COPPA/Families — web ad suppression)', () => {
    expect(shouldLoadAdSense({ ...base, suppressedByTier: true })).toBe(false);
  });

  it('does NOT load while the FTUE onboarding overlay is active (ad-free first run)', () => {
    // Onboarding is the highest-leverage conversion funnel; an anchored Auto-Ads
    // banner there covers the "Continue" CTA and reads as aggressive monetization
    // before any value is delivered. Withhold the script until onboarding completes.
    expect(shouldLoadAdSense({ ...base, onboardingActive: true })).toBe(false);
  });

  it('still loads normally when onboarding is not active (flag omitted or false)', () => {
    expect(shouldLoadAdSense({ ...base, onboardingActive: false })).toBe(true);
    expect(shouldLoadAdSense(base)).toBe(true); // omitted → treated as not active
  });
});

describe('adSensePolicy — deployed env var name', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  });

  // The deployment (Railway) sets NEXT_PUBLIC_ADSENSE_CLIENT_ID, not the
  // NEXT_PUBLIC_ADSENSE_CLIENT this module originally read. The drift was
  // invisible only because both happened to hold the DEFAULT publisher id — so
  // changing the publisher id in the deployment silently did nothing. Accept
  // both names so the deployed override is actually live. Same class as the
  // LEMONSQUEEZY_*_VARIANT_ID drift.
  it('accepts the deployed NEXT_PUBLIC_ADSENSE_CLIENT_ID name', () => {
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1111111111111111';
    expect(getAdSenseClient()).toBe('ca-pub-1111111111111111');
  });

  it('prefers NEXT_PUBLIC_ADSENSE_CLIENT when both are set', () => {
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = 'ca-pub-2222222222222222';
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1111111111111111';
    expect(getAdSenseClient()).toBe('ca-pub-2222222222222222');
  });
});

describe('adSensePolicy — fill audit', () => {
  // WHY this exists: from 2026-06-08 (PurpleAds removed, direct AdSense in) the
  // web ad layer loaded adsbygoogle.js and rendered ZERO ad units — the only
  // <ins> on the page is Google's hidden `adsbygoogle-noablate` placeholder.
  // Nothing reported it, so ~5x the native session volume monetized at 0 for
  // two months. summarizeAdSenseFill turns that silent no-op into a signal.
  function insHtml(attrs: string): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = attrs;
    return root;
  }

  it('reports zero placements when only the hidden noablate placeholder exists', () => {
    const root = insHtml('<ins class="adsbygoogle adsbygoogle-noablate" style="display: none !important;"></ins>');
    expect(summarizeAdSenseFill(root)).toEqual({ units: 0, filled: 0, unfilled: 0 });
  });

  it('counts real placements and how many Google filled', () => {
    const root = insHtml(
      '<ins class="adsbygoogle" data-ad-status="filled"></ins>' +
        '<ins class="adsbygoogle" data-ad-status="unfilled"></ins>' +
        '<ins class="adsbygoogle"></ins>',
    );
    expect(summarizeAdSenseFill(root)).toEqual({ units: 3, filled: 1, unfilled: 2 });
  });

  it('reports nothing at all when the script placed no units', () => {
    expect(summarizeAdSenseFill(insHtml(''))).toEqual({ units: 0, filled: 0, unfilled: 0 });
  });
});

describe('adSensePolicy — ad-free routes (education)', () => {
  const base = {
    enabled: true,
    hasAdConsent: true,
    isNative: false,
    isCrazyGames: false,
    suppressedByTier: false,
    onboardingActive: false,
  };

  it('Given every other gate open, When the route is ad-free, Then AdSense must not load', () => {
    expect(shouldLoadAdSense({ ...base, adFreeRoute: true })).toBe(false);
  });

  it('Given every other gate open, When the route is monetizable, Then AdSense loads', () => {
    expect(shouldLoadAdSense({ ...base, adFreeRoute: false })).toBe(true);
    expect(shouldLoadAdSense(base)).toBe(true);
  });
});
