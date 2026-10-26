import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  captureFirstTouch,
  getFirstTouchAttribution,
  sanitizeLandingPath,
  FIRST_TOUCH_TTL_MS,
} from '../utmCapture';

/**
 * First-touch attribution (t_a80f937b): recorded once per device on the first
 * pageview, first touch wins, 90-day expiry, no PII beyond referrer domain +
 * landing path (query strings stripped except utm_*).
 */
const KEY = 'lexiclash_first_touch';

function setUrl(path: string): void {
  window.history.replaceState({}, '', path);
}

describe('captureFirstTouch / getFirstTouchAttribution', () => {
  beforeEach(() => {
    localStorage.clear();
    setUrl('/he?utm_source=google&utm_campaign=sp-boggle&token=secret123');
  });
  afterEach(() => {
    localStorage.clear();
    setUrl('/');
  });

  it('captures referrer domain, landing path and utm_* on the first pageview', () => {
    captureFirstTouch(1_000);
    const ft = getFirstTouchAttribution(1_000);
    expect(ft).not.toBeNull();
    expect(ft!.utm_source).toBe('google');
    expect(ft!.utm_campaign).toBe('sp-boggle');
    expect(ft!.landing_path).toBe('/he?utm_source=google&utm_campaign=sp-boggle');
    expect(ft!.captured_at).toBe(1_000);
  });

  it('strips non-utm query params from the landing path (no PII)', () => {
    expect(sanitizeLandingPath('/en/play', '?token=abc&email=x@y.z&utm_source=bing'))
      .toBe('/en/play?utm_source=bing');
    expect(sanitizeLandingPath('/en', '')).toBe('/en');
    expect(sanitizeLandingPath('/en', '?code=pkce-secret')).toBe('/en');
  });

  it('first touch wins: a later visit never overwrites an unexpired record', () => {
    captureFirstTouch(1_000);
    setUrl('/en/pricing?utm_source=facebook');
    captureFirstTouch(2_000);
    const ft = getFirstTouchAttribution(2_000);
    expect(ft!.utm_source).toBe('google'); // still the FIRST touch
    expect(ft!.landing_path).toBe('/he?utm_source=google&utm_campaign=sp-boggle');
    expect(ft!.captured_at).toBe(1_000);
  });

  it('an expired record (90d) is replaced by the current visit', () => {
    captureFirstTouch(1_000);
    const later = 1_000 + FIRST_TOUCH_TTL_MS + 1;
    setUrl('/en?utm_source=tiktok');
    captureFirstTouch(later);
    const ft = getFirstTouchAttribution(later);
    expect(ft!.utm_source).toBe('tiktok');
    expect(ft!.captured_at).toBe(later);
  });

  it('getFirstTouchAttribution returns null for an expired record', () => {
    captureFirstTouch(1_000);
    expect(getFirstTouchAttribution(1_000 + FIRST_TOUCH_TTL_MS + 1)).toBeNull();
  });

  it('a corrupt stored record is replaced, not kept', () => {
    localStorage.setItem(KEY, '{not json');
    captureFirstTouch(5_000);
    const ft = getFirstTouchAttribution(5_000);
    expect(ft!.utm_source).toBe('google');
    expect(ft!.captured_at).toBe(5_000);
  });

  it('records nulls (not missing keys) when the visit has no attribution data', () => {
    setUrl('/en');
    captureFirstTouch(1_000);
    const ft = getFirstTouchAttribution(1_000);
    expect(ft).toMatchObject({
      referrer_domain: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      landing_path: '/en',
    });
  });
});
