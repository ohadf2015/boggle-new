import { describe, expect, it } from 'vitest';
import { generatePageMetadata } from '../generatePageMetadata';

// Meta descriptions longer than 155 chars are truncated by Google, hurting CTR.
// This test catches regressions on pages that have historically exceeded the limit.
const MAX_DESC = 155;
const PAGES = ['adventure', 'wordTowerV2'] as const;

describe('meta description length (≤155 chars)', () => {
  for (const seoKey of PAGES) {
    it(`${seoKey} en description stays within ${MAX_DESC} chars`, async () => {
      const meta = await generatePageMetadata({ seoKey, path: `/${seoKey}`, locale: 'en' });
      const desc = typeof meta.description === 'string' ? meta.description : '';
      expect(desc.length).toBeLessThanOrEqual(MAX_DESC);
    });
  }
});
