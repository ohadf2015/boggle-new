/**
 * Every education landing page must describe itself in the language it is
 * actually written in.
 *
 * Six pages predate `lib/seo/educationLanding.ts` and built their JSON-LD inline.
 * All six shipped `inLanguage: 'en'` and a provider `@id` of `/en/education#org`
 * on the he/es/sv/ja/ru builds — so a Japanese page, correctly titled and indexed
 * in Japanese, told Google and every answer engine that it was English and that
 * its publisher was the English org. They also hand-rolled a 7-entry hreflang map
 * while `app/sitemap.ts` emits the ~24-entry map from `lib/seo/hreflang.ts`;
 * `hreflang.ts`'s own header states the consequence — an annotation the other side
 * does not reciprocate is discarded, taking the cluster with it.
 *
 * Rather than port six bespoke content shapes onto `EducationLandingContent` (and
 * lose the comparison tables that are these pages' best asset), the locale-sensitive
 * FIELDS moved into shared builders. This test covers both halves: the builders are
 * unit-tested per locale, and the page sources are scanned so the next page cannot
 * reintroduce a hardcoded English node where no unit test can reach it.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  EDUCATION_LOCALES,
  educationContentLang,
  educationProviderNode,
  educationBreadcrumbLabels,
  educationBreadcrumbJsonLd,
  educationLearningResourceJsonLd,
  educationFaqJsonLd,
} from '@/lib/seo/educationLanding';
import { hreflangAlternates } from '@/lib/seo/hreflang';

const EDUCATION_DIR = join(__dirname, '..');

/**
 * The one page exempt from the per-locale rule, and why: its BODY is English in
 * every build (`sight-words-practice/content.ts` has no per-locale blocks) and the
 * non-EN routes are noindex. `inLanguage: 'en'` there is the truth, not a bug.
 * Declaring `ja` on an English page would be a worse lie than the one being fixed.
 */
const ENGLISH_BODY_PAGES = new Set(['sight-words-practice']);

/** Landing directories, discovered — never a hand-maintained list. */
function landingDirs(): string[] {
  return readdirSync(EDUCATION_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('__'))
    .map((e) => e.name)
    .filter((name) => existsSync(join(EDUCATION_DIR, name, 'page.tsx')))
    .sort();
}

describe('educationContentLang', () => {
  it.each(EDUCATION_LOCALES)('maps %s to itself', (locale) => {
    expect(educationContentLang(locale)).toBe(locale);
  });

  it('falls back to en for a locale with no education build', () => {
    expect(educationContentLang('fr')).toBe('en');
  });
});

describe.each(EDUCATION_LOCALES)('shared JSON-LD builders — %s', (locale) => {
  const path = '/education/vocabulary-games-classroom';

  it('provider org is the locale org, not the English one', () => {
    const org = educationProviderNode(locale);
    expect(org['@id']).toBe(`https://www.lexiclash.live/${locale}/education#org`);
    expect(org.url).toBe(`https://www.lexiclash.live/${locale}/education`);
  });

  it('LearningResource declares the page language', () => {
    const node = educationLearningResourceJsonLd({
      locale,
      path,
      name: 'n',
      description: 'd',
      teaches: 't',
    });
    expect(node.inLanguage).toBe(locale);
    expect((node.provider as { '@id': string })['@id']).toContain(`/${locale}/education#org`);
  });

  it('FAQPage declares the page language', () => {
    const node = educationFaqJsonLd({ locale, path, faqs: [{ q: 'q', a: 'a' }] });
    expect(node.inLanguage).toBe(locale);
  });

  it('breadcrumb names are in the page language', () => {
    const labels = educationBreadcrumbLabels(locale);
    const node = educationBreadcrumbJsonLd({ locale, path, current: 'C' });
    const names = (node.itemListElement as Array<{ name: string }>).map((i) => i.name);
    expect(names).toEqual([labels.home, labels.hub, 'C']);
    if (locale !== 'en') {
      expect(names.slice(0, 2)).not.toEqual(['Home', 'Education']);
    }
  });
});

describe('page sources', () => {
  const dirs = landingDirs();

  it('discovers the landing pages', () => {
    expect(dirs).toContain('vocabulary-games-classroom');
    expect(dirs.length).toBeGreaterThanOrEqual(12);
  });

  it.each(landingDirs())('%s does not hardcode an English JSON-LD language', (dir) => {
    if (ENGLISH_BODY_PAGES.has(dir)) return;
    const src = readFileSync(join(EDUCATION_DIR, dir, 'page.tsx'), 'utf8');
    expect(src).not.toMatch(/inLanguage:\s*['"]en['"]/);
  });

  it.each(landingDirs())('%s does not pin the provider org to /en', (dir) => {
    const src = readFileSync(join(EDUCATION_DIR, dir, 'page.tsx'), 'utf8');
    expect(src).not.toMatch(/\/en\/education#org/);
  });

  it.each(landingDirs())('%s builds hreflang from lib/seo/hreflang, not by hand', (dir) => {
    const src = readFileSync(join(EDUCATION_DIR, dir, 'page.tsx'), 'utf8');
    // A hand-rolled map always spells out 'x-default'. The shared helper never does.
    expect(src).not.toContain("'x-default'");
  });
});

describe('hreflang parity with the sitemap', () => {
  const path = '/education/vocabulary-games-classroom';

  it('the shared map carries the regional codes a 7-entry hand map omits', () => {
    const alts = hreflangAlternates(path);
    expect(alts['es-MX']).toBe(`https://www.lexiclash.live/es${path}`);
    expect(alts['x-default']).toBe(`https://www.lexiclash.live/en${path}`);
    expect(Object.keys(alts).length).toBeGreaterThan(20);
  });
});
