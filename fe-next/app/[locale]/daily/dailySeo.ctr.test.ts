import { describe, it, expect } from 'vitest';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { dailySeoContent } from './dailySeo.data';

/**
 * CTR snippet contract for daily hubs (Growth Radar ctr_snippet).
 * Title <60 chars, query-first, free/no-signup before the brand.
 * generateMetadata reads translations `seo.daily`, not a hard-coded <head>.
 * /he/daily = rec #56; /sv/daily = rec #59 (PR #1290 did NOT cover this surface).
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

describe('daily hub CTR snippet (sv)', () => {
  const svDaily = seoDaily(sv as unknown as Record<string, unknown>);

  it('keeps the title under 60 characters with the brand last', () => {
    expect(svDaily.title.length).toBeLessThanOrEqual(60);
    expect(svDaily.title.endsWith('| LexiClash')).toBe(true);
  });

  it('leads with dagens ord and puts free/no-signup before the brand', () => {
    expect(svDaily.title.toLowerCase().startsWith('dagens ord')).toBe(true);
    expect(svDaily.title).toMatch(/gratis/i);
    expect(svDaily.title).toMatch(/utan konto|ingen registrering/i);
    const brandAt = svDaily.title.lastIndexOf('| LexiClash');
    const freeAt = svDaily.title.toLowerCase().indexOf('gratis');
    expect(freeAt).toBeGreaterThanOrEqual(0);
    expect(freeAt).toBeLessThan(brandAt);
  });

  it('answers dagens ord in the first 120 characters of the description', () => {
    const head = svDaily.description.slice(0, 120);
    expect(head.toLowerCase()).toMatch(/dagens ord/);
    expect(head.toLowerCase()).toMatch(/gratis|ingen registrering|utan konto/);
  });

  it('keeps JSON-LD dailySeoContent in sync with generateMetadata copy', () => {
    expect(dailySeoContent.sv.title).toBe(svDaily.title);
    expect(dailySeoContent.sv.description).toBe(svDaily.description);
  });
});
