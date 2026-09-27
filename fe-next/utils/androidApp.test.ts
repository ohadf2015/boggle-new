/**
 * Tests for Play Store install-referrer URL builder.
 * The referrer param is how Google Play attributes installs back to the
 * SEO landing page (Play Console → install attribution).
 */
import { describe, it, expect } from 'vitest';
import { playStoreUrlWithReferrer, PLAY_STORE_URL } from './androidApp';

describe('playStoreUrlWithReferrer', () => {
  it('appends an encoded install referrer carrying the campaign', () => {
    const url = playStoreUrlWithReferrer('download-word-game-android');
    expect(url).toBe(
      `${PLAY_STORE_URL}&referrer=utm_source%3Dseo%26utm_medium%3Dlanding%26utm_campaign%3Ddownload-word-game-android`,
    );
  });

  it('keeps the canonical package id in the base URL', () => {
    expect(playStoreUrlWithReferrer('x')).toContain('id=live.lexiclash.app');
  });

  it('URL-encodes campaigns containing reserved characters', () => {
    const url = playStoreUrlWithReferrer('a/b&c');
    // entire referrer string is encoded, so / → %2F and & → %26 inside campaign
    expect(url).toContain('utm_campaign%3Da%2Fb%26c');
    // no raw ampersand from the campaign should leak as a query separator
    expect(url.split('referrer=')[1]).not.toContain('&');
  });

  it('adds utm_content with the locale when provided', () => {
    const url = playStoreUrlWithReferrer('camp', 'he');
    expect(url).toContain('utm_content%3Dhe');
  });

  it('omits utm_content when no locale is given', () => {
    expect(playStoreUrlWithReferrer('camp')).not.toContain('utm_content');
  });
});
