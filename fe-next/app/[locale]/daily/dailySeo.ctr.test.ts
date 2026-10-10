import { describe, it, expect } from 'vitest';
import { he } from '@/translations/he.js';
import { dailySeoContent } from './dailySeo.data';

/**
 * CTR snippet contract for /he/daily (Growth Radar rec #56, ctr_snippet).
 * Title <60 chars, query-first (מילת היום), free/no-signup before the brand.
 * generateMetadata reads translations `seo.daily`, not a hard-coded <head>.
 * /sv/daily is out of scope (PR #1290).
 */
type SeoDaily = { title: string; description: string };

function seoDaily(bundle: Record<string, unknown>): SeoDaily {
  const seo = bundle.seo as Record<string, unknown> | undefined;
  const daily = seo?.daily as SeoDaily | undefined;
  if (!daily?.title || !daily?.description) {
    throw new Error('seo.daily.title/description missing');
  }
  return daily;
}

describe('daily hub CTR snippet (he)', () => {
  const heDaily = seoDaily(he as unknown as Record<string, unknown>);

  it('keeps the title under 60 characters with the brand last', () => {
    expect(heDaily.title.length).toBeLessThanOrEqual(60);
    expect(heDaily.title.endsWith('| LexiClash')).toBe(true);
  });

  it('leads with מילת היום and puts free/no-signup before the brand', () => {
    expect(heDaily.title.startsWith('מילת היום')).toBe(true);
    expect(heDaily.title).toMatch(/חינם/);
    expect(heDaily.title).toMatch(/ללא הרשמה/);
    const brandAt = heDaily.title.lastIndexOf('| LexiClash');
    const freeAt = heDaily.title.indexOf('חינם');
    expect(freeAt).toBeGreaterThanOrEqual(0);
    expect(freeAt).toBeLessThan(brandAt);
  });

  it('answers מילת היום in the first 120 characters of the description', () => {
    const head = heDaily.description.slice(0, 120);
    expect(head).toMatch(/מילת היום/);
    expect(head).toMatch(/חינם|ללא הרשמה/);
  });

  it('keeps JSON-LD dailySeoContent in sync with generateMetadata copy', () => {
    expect(dailySeoContent.he.title).toBe(heDaily.title);
    expect(dailySeoContent.he.description.slice(0, 40)).toBe(heDaily.description.slice(0, 40));
  });
});
