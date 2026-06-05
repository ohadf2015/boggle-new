import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAyetOfferwallAdslot,
  isAyetOfferwallConfigured,
  getAyetOfferwallUrl,
  isOfferwallAvailable,
} from '../ayetOfferwall';

describe('ayetOfferwall — config + url', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_AYET_OFFERWALL_ENABLED;
    delete process.env.NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT;
  });

  it('is unconfigured (dark) by default', () => {
    expect(isAyetOfferwallConfigured()).toBe(false);
    expect(getAyetOfferwallAdslot()).toBe('');
  });

  it('is configured only when the flag is true AND an adslot is set', () => {
    process.env.NEXT_PUBLIC_AYET_OFFERWALL_ENABLED = 'true';
    expect(isAyetOfferwallConfigured()).toBe(false); // adslot still missing
    process.env.NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT = 'web_ow_1';
    expect(isAyetOfferwallConfigured()).toBe(true);
  });

  it('builds the offerwall url with the authed user id as external_identifier', () => {
    process.env.NEXT_PUBLIC_AYET_OFFERWALL_ENABLED = 'true';
    process.env.NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT = 'web_ow_1';
    const url = getAyetOfferwallUrl('user-uuid-42');
    expect(url).toContain('/web_ow_1?');
    expect(url).toContain('external_identifier=user-uuid-42');
  });

  it('returns empty url when unconfigured or no user id (never opens a bare offerwall)', () => {
    expect(getAyetOfferwallUrl('user-uuid-42')).toBe(''); // unconfigured
    process.env.NEXT_PUBLIC_AYET_OFFERWALL_ENABLED = 'true';
    process.env.NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT = 'web_ow_1';
    expect(getAyetOfferwallUrl('')).toBe(''); // no user
  });
});

describe('ayetOfferwall — isOfferwallAvailable (CTA visibility gate)', () => {
  const base = { configured: true, isProd: true, hasTestFlag: false, isNative: false, isCrazyGames: false };

  it('shows when configured + prod + web (auth NOT required — guests route to signup)', () => {
    expect(isOfferwallAvailable(base)).toBe(true);
  });

  it('hides on native (Capacitor / Families app) regardless of config', () => {
    expect(isOfferwallAvailable({ ...base, isNative: true })).toBe(false);
  });

  it('hides on the CrazyGames portal', () => {
    expect(isOfferwallAvailable({ ...base, isCrazyGames: true })).toBe(false);
  });

  it('hides when not configured', () => {
    expect(isOfferwallAvailable({ ...base, configured: false })).toBe(false);
  });

  it('shows in non-prod only with the test flag', () => {
    expect(isOfferwallAvailable({ ...base, isProd: false, hasTestFlag: false })).toBe(false);
    expect(isOfferwallAvailable({ ...base, isProd: false, hasTestFlag: true })).toBe(true);
  });
});
