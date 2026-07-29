import { describe, it, expect } from 'vitest';
import { enOnlyAlternates } from '../enOnlyAlternates';

const BASE = 'https://www.lexiclash.live';

describe('enOnlyAlternates', () => {
  // These pages render English-only content (anagram solver, word lists) and
  // are noindex for he/sv/ja/es. An indexed EN page must NOT declare its
  // noindexed siblings as hreflang alternates — that is an invalid cluster
  // ("alternate page with noindex"). The cluster must self-reference EN only.
  it('canonicalizes to the /en variant of the path', () => {
    expect(enOnlyAlternates('/anagram/aelrst').canonical).toBe(`${BASE}/en/anagram/aelrst`);
  });

  it('emits only x-default + en hreflang, both pointing at /en', () => {
    const { languages } = enOnlyAlternates('/words/3-letter-words');
    expect(languages).toEqual({
      'x-default': `${BASE}/en/words/3-letter-words`,
      en: `${BASE}/en/words/3-letter-words`,
    });
  });

  it('never lists a noindexed non-EN sibling as an alternate', () => {
    const { languages } = enOnlyAlternates('/anagram/aelrst');
    const values = Object.values(languages);
    for (const loc of ['he', 'sv', 'ja', 'es']) {
      expect(values.some((u) => u.includes(`/${loc}/`))).toBe(false);
    }
  });
});
