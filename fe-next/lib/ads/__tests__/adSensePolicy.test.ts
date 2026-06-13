import { describe, it, expect, afterEach } from 'vitest';
import {
  getAdSenseAccountMeta,
  getAdSenseClient,
  isAdSenseConfigured,
  shouldLoadAdSense,
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
});
