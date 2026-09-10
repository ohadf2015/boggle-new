import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EDUCATION_PAGES } from '@/lib/seo/educationPageLinks';

/**
 * public/llms-full.txt is the deep reference every locale llms.txt points at
 * ("Full reference: /llms-full.txt"). It drifted: it still said "5 languages"
 * after Russian shipped, listed none of the twelve education SEO landings
 * (the pages that actually rank), and claimed "no premium tiers" while
 * Teacher Pro is a real $9/month plan — a claim class educationClaims.test.ts
 * already forbids everywhere it scans. This pins the file to the registry and
 * to the pricing ground truth so the drift cannot come back silently.
 */
const LLMS_FULL = readFileSync(
  join(__dirname, '..', '..', '..', 'public', 'llms-full.txt'),
  'utf8',
);

describe('public/llms-full.txt — GEO reference accuracy', () => {
  it('states 6 languages and includes Russian', () => {
    expect(LLMS_FULL).toContain('6 languages');
    expect(LLMS_FULL).not.toMatch(/\b5 languages\b/);
    expect(LLMS_FULL).toContain('Russian');
  });

  it('lists every registered education landing', () => {
    for (const page of EDUCATION_PAGES) {
      expect(LLMS_FULL).toContain(`/education/${page.slug}`);
    }
  });

  it('does not deny the paid Teacher Pro tier', () => {
    expect(LLMS_FULL).not.toMatch(/no premium tiers?/i);
    expect(LLMS_FULL).toContain('Teacher Pro');
  });
});
