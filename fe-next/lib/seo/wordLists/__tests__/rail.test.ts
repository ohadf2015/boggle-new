import { describe, it, expect } from 'vitest';
import { EDUCATION_PAGES } from '@/lib/seo/educationPageLinks';
import { wordListRail } from '../rail';
import { getCatalog, findGradeHub, findList, findTopicHub, findLangHub } from '../catalog';

const LOCALES = ['en', 'he', 'es', 'sv', 'ja'];

function resolves(href: string): boolean {
  const [, locale, , , a, b, c] = href.split('/');
  if (a === undefined) return true;
  if (a === 'topic') return !!findTopicHub(b)?.locales.includes(locale as never);
  if (b === undefined) return !!findLangHub(a)?.locales.includes(locale as never);
  const hub = findGradeHub(a, b);
  if (hub) return hub.locales.includes(locale as never);
  return !!findList(a, b)?.locales.includes(locale as never) && c === undefined;
}

describe('word-list rail on the education landing pages', () => {
  it('gives every landing page three to six word-list links that resolve in the linked locale', () => {
    for (const page of EDUCATION_PAGES.filter((p) => p.slug !== 'lists')) {
      for (const locale of LOCALES) {
        const rail = wordListRail(page.slug, locale);
        expect(rail.length, `${page.slug}/${locale}`).toBeGreaterThanOrEqual(3);
        expect(rail.length).toBeLessThanOrEqual(6);
        for (const r of rail) {
          expect(r.href, r.href).toMatch(/^\/(en|he|es|sv|ja)\/education\/lists/);
          expect(resolves(r.href), r.href).toBe(true);
          expect(r.label).not.toMatch(/eg2Seo\./);
        }
      }
    }
  });

  it('matches the page topic: irregular verbs link verb lists, middle school links grades 6-8', () => {
    expect(wordListRail('irregular-verbs-games', 'en').some((r) => r.href.endsWith('/topic/verbs'))).toBe(true);
    const ms = wordListRail('middle-school-word-games', 'en').map((r) => r.href);
    expect(ms).toEqual(expect.arrayContaining(['/en/education/lists/english/grade-7']));
  });

  it('stays off Russian pages, which have no word-list copy', () => {
    expect(wordListRail('esl-word-games', 'ru')).toEqual([]);
  });

  it('is never empty for the catalog it ships with', () => {
    expect(getCatalog().gradeHubs.length).toBeGreaterThan(0);
  });
});
