import { describe, it, expect, afterEach, vi } from 'vitest';
import { isCrawlerUserAgent, isCrawler } from '../isCrawler';

describe('isCrawlerUserAgent', () => {
  it('returns false for empty/missing UA', () => {
    expect(isCrawlerUserAgent('')).toBe(false);
    expect(isCrawlerUserAgent(null)).toBe(false);
    expect(isCrawlerUserAgent(undefined)).toBe(false);
  });

  it('detects JS-rendering Google crawlers (WRS keeps the token while rendering)', () => {
    // Real evergreen Googlebot UA (renders JS, the case our gate must catch).
    expect(
      isCrawlerUserAgent(
        'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      ),
    ).toBe(true);
    expect(isCrawlerUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
    expect(isCrawlerUserAgent('Mozilla/5.0 (compatible; Google-InspectionTool/1.0)')).toBe(true);
    expect(isCrawlerUserAgent('AdsBot-Google (+http://www.google.com/adsbot.html)')).toBe(true);
    expect(isCrawlerUserAgent('Mozilla/5.0 (compatible; Storebot-Google/1.0)')).toBe(true);
  });

  it('detects Bingbot (also renders JS)', () => {
    expect(
      isCrawlerUserAgent(
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      ),
    ).toBe(true);
    expect(isCrawlerUserAgent('Mozilla/5.0 (Windows Phone 8.1; ...) BingPreview/1.0b')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isCrawlerUserAgent('GOOGLEBOT')).toBe(true);
    expect(isCrawlerUserAgent('BingBot')).toBe(true);
  });

  it('returns false for real human browsers', () => {
    expect(
      isCrawlerUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false);
    expect(
      isCrawlerUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
  });
});

describe('isCrawler', () => {
  const originalNavigator = global.navigator;
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalNavigator) vi.stubGlobal('navigator', originalNavigator);
  });

  it('returns false when navigator is undefined (SSR)', () => {
    vi.stubGlobal('navigator', undefined);
    expect(isCrawler()).toBe(false);
  });

  it('reads navigator.userAgent', () => {
    vi.stubGlobal('navigator', { userAgent: 'Googlebot/2.1' });
    expect(isCrawler()).toBe(true);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/120 Safari/537.36' });
    expect(isCrawler()).toBe(false);
  });
});
