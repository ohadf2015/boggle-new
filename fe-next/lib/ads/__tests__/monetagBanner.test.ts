import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(() => false),
}));

import { isNative } from '@/utils/platform';
import {
  shouldShowMonetagWebBanner,
  isMonetagBannerConfigured,
  getMonetagBannerZoneId,
  loadMonetagBannerSdk,
  __resetMonetagBannerForTests,
  type MonetagBannerGateInput,
} from '../monetagBanner';

const mockedIsNative = vi.mocked(isNative);

const allOk: MonetagBannerGateInput = {
  enabled: true,
  surfaceAllowed: true,
  routeAllowed: true,
  suppressed: false,
  childTier: false,
};

describe('monetagBanner — gate', () => {
  it('shows only when every condition holds', () => {
    expect(shouldShowMonetagWebBanner(allOk)).toBe(true);
  });

  it('stays dark when not enabled (no zone id / flag off)', () => {
    expect(shouldShowMonetagWebBanner({ ...allOk, enabled: false })).toBe(false);
  });

  it('never shows off a web top-frame surface (native app / portal iframe)', () => {
    expect(shouldShowMonetagWebBanner({ ...allOk, surfaceAllowed: false })).toBe(false);
  });

  it('hides on disallowed (gameplay) routes', () => {
    expect(shouldShowMonetagWebBanner({ ...allOk, routeAllowed: false })).toBe(false);
  });

  it('hides while suppressed (drawer / modal / onboarding / in-game)', () => {
    expect(shouldShowMonetagWebBanner({ ...allOk, suppressed: true })).toBe(false);
  });

  it('never shows to a declared under-13 player (Families policy)', () => {
    expect(shouldShowMonetagWebBanner({ ...allOk, childTier: true })).toBe(false);
  });
});

describe('monetagBanner — config + loader', () => {
  beforeEach(() => {
    __resetMonetagBannerForTests();
    mockedIsNative.mockReturnValue(false);
    delete process.env.NEXT_PUBLIC_MONETAG_BANNER_ZONE_ID;
    delete process.env.NEXT_PUBLIC_MONETAG_ADS_ENABLED;
  });

  it('is unconfigured (dark) with no zone id', () => {
    expect(getMonetagBannerZoneId()).toBe('');
    expect(isMonetagBannerConfigured()).toBe(false);
  });

  it('is configured only when the flag is on AND a zone id is set', () => {
    process.env.NEXT_PUBLIC_MONETAG_ADS_ENABLED = 'true';
    expect(isMonetagBannerConfigured()).toBe(false); // zone id still missing
    process.env.NEXT_PUBLIC_MONETAG_BANNER_ZONE_ID = '12345';
    expect(isMonetagBannerConfigured()).toBe(true);
  });

  it('loader is a no-op (no injection) inside the native app', async () => {
    mockedIsNative.mockReturnValue(true);
    await loadMonetagBannerSdk('12345');
    expect(document.getElementById('monetag-banner-sdk')).toBeNull();
  });

  it('loader is a no-op when no zone id is configured', async () => {
    await loadMonetagBannerSdk('');
    expect(document.getElementById('monetag-banner-sdk')).toBeNull();
  });

  it('injects the In-Page Push tag (NOT the rewarded show_<id> SDK)', () => {
    // Fire-and-forget — the env can't actually load the script, but it is appended
    // synchronously; swallow the resulting load-error rejection.
    loadMonetagBannerSdk('11197640').catch(() => {});
    const el = document.getElementById('monetag-banner-sdk') as HTMLScriptElement | null;
    expect(el).not.toBeNull();
    expect(el!.src).toContain('/tag.min.js'); // In-Page Push loader, not libtl/sdk.js
    expect(el!.dataset.zone).toBe('11197640');
    // In-Page Push auto-displays — it must NOT carry the rewarded show_<id> hook.
    expect(el!.dataset.sdk).toBeUndefined();
    el!.remove();
  });
});
