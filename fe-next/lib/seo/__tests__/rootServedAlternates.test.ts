/**
 * The root-served page (`/` answering 200 with a locale bundle) must
 * self-canonicalize and its hreflang set must contain an entry that points
 * back at the served URL — x-default, the negotiating root itself. The set is
 * otherwise identical to the locale-homepage cluster so the sitemap and the
 * tags keep agreeing (Google discards non-reciprocated annotations).
 */
import { describe, it, expect } from 'vitest';
import {
  HREFLANG_BASE_URL,
  HREFLANG_LOCALES,
  ROOT_CANONICAL,
  ROOT_SERVED_HEADER,
  hreflangAlternates,
  rootServedAlternates,
} from '../hreflang';

describe('rootServedAlternates', () => {
  it('names the bare root as x-default', () => {
    expect(ROOT_CANONICAL).toBe('https://www.lexiclash.live/');
    expect(rootServedAlternates()['x-default']).toBe(ROOT_CANONICAL);
  });

  it('contains an entry that points back at the served page itself', () => {
    expect(Object.values(rootServedAlternates())).toContain(ROOT_CANONICAL);
  });

  it('keeps every per-locale and regional entry identical to the locale cluster', () => {
    const root = rootServedAlternates();
    const locale = hreflangAlternates('');
    for (const [code, url] of Object.entries(locale)) {
      if (code === 'x-default') continue;
      expect(root[code]).toBe(url);
    }
    expect(Object.keys(root).sort()).toEqual(Object.keys(locale).sort());
    // Every real locale build is represented exactly once.
    for (const l of HREFLANG_LOCALES) {
      expect(root[l]).toBe(`${HREFLANG_BASE_URL}/${l}`);
    }
  });

  it('exports the marker header name the rewrite layers set', () => {
    expect(ROOT_SERVED_HEADER).toBe('x-lc-root-served');
  });
});
