import { describe, it, expect } from 'vitest';
import { isAutomatedUserAgent } from '../botUa';

describe('isAutomatedUserAgent', () => {
  it('flags headless and automation browsers', () => {
    expect(isAutomatedUserAgent('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/147.0.0.0 Safari/537.36')).toBe(true);
    expect(isAutomatedUserAgent('Mozilla/5.0 (Linux) Chrome-Lighthouse')).toBe(true);
    expect(isAutomatedUserAgent('Mozilla/5.0 ... Google Page Speed Insights')).toBe(true);
    expect(isAutomatedUserAgent('python-requests/2.31')).toBe(true);
    expect(isAutomatedUserAgent('curl/8.4.0')).toBe(true);
    expect(isAutomatedUserAgent('Mozilla/5.0 (compatible; GTmetrix)')).toBe(true);
  });

  it('flags the SEO/social crawlers isBotUserAgent already knows', () => {
    expect(isAutomatedUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isAutomatedUserAgent('facebookexternalhit/1.1')).toBe(true);
  });

  it('does not flag real desktop and mobile browsers', () => {
    expect(isAutomatedUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36')).toBe(false);
    expect(isAutomatedUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isAutomatedUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:158.0) Gecko/20100101 Firefox/158.0')).toBe(false);
  });

  it('treats a missing user agent as not automated', () => {
    expect(isAutomatedUserAgent(null)).toBe(false);
    expect(isAutomatedUserAgent(undefined)).toBe(false);
    expect(isAutomatedUserAgent('')).toBe(false);
  });
});
