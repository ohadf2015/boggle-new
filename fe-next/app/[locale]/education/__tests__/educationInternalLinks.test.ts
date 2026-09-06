/**
 * No education landing page may be an orphan.
 *
 * The six teacher-moment pages (brain-breaks, indoor-recess, early-finishers,
 * first-day, end-of-year, middle-school) shipped with the best schema in the
 * module and ZERO inbound internal links — not from the footer, not from the
 * `/education` hub, not from any of the six older pages, which linked only to
 * each other. Their only discovery paths were the XML sitemap and llms.txt.
 *
 * These assertions are written against DISCOVERED directories, never a list, for
 * the same reason `educationClaims.test.ts` discovers its comparison pages: a
 * hand-maintained list only protects the pages someone remembered, and the next
 * page ships unguarded by default.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  EDUCATION_PAGES,
  EDUCATION_LINK_LOCALES,
  educationPageLabel,
  educationRelatedPages,
} from '@/lib/seo/educationPageLinks';

const EDUCATION_DIR = join(__dirname, '..');

/**
 * Routes under `/education` that are app surfaces, not SEO landing pages: the
 * signed-in classroom flows and the noindexed internal pages. They are excluded
 * from the registry on purpose and must stay excluded.
 */
const NON_LANDING = new Set([
  'access',
  'chatgpt-reteach',
  'class-gap',
  'classroom-game',
  'duels',
  'unplugged-reteach',
]);

function landingDirs(): string[] {
  return readdirSync(EDUCATION_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('__'))
    .map((e) => e.name)
    .filter((n) => !NON_LANDING.has(n) && existsSync(join(EDUCATION_DIR, n, 'page.tsx')))
    .sort();
}

describe('registry coverage', () => {
  it('covers every landing directory on disk', () => {
    const onDisk = landingDirs();
    const registered = EDUCATION_PAGES.map((p) => p.slug).sort();
    expect(registered).toEqual(onDisk);
  });

  it('has a non-empty label in all six locales for every page', () => {
    for (const page of EDUCATION_PAGES) {
      for (const locale of EDUCATION_LINK_LOCALES) {
        expect(educationPageLabel(page.slug, locale), `${page.slug}/${locale}`).toBeTruthy();
      }
    }
  });

  it('localizes labels — only the English-bodied page repeats the English label', () => {
    const englishEverywhere = EDUCATION_PAGES.filter((p) =>
      EDUCATION_LINK_LOCALES.every((l) => p.label[l] === p.label.en),
    ).map((p) => p.slug);
    expect(englishEverywhere).toEqual(['sight-words-practice']);
  });
});

describe('related-page rotation', () => {
  it('gives every page three distinct siblings', () => {
    for (const page of EDUCATION_PAGES) {
      const related = educationRelatedPages(page.slug);
      expect(related).toHaveLength(3);
      expect(new Set(related.map((r) => r.slug)).size).toBe(3);
      expect(related.map((r) => r.slug)).not.toContain(page.slug);
    }
  });

  it('leaves no page uncited — every page is someone else\'s sibling', () => {
    const cited = new Set<string>();
    for (const page of EDUCATION_PAGES) {
      for (const r of educationRelatedPages(page.slug)) cited.add(r.slug);
    }
    expect([...cited].sort()).toEqual(EDUCATION_PAGES.map((p) => p.slug).sort());
  });
});

describe('the hub links every landing page', () => {
  const hub = readFileSync(join(EDUCATION_DIR, 'page.tsx'), 'utf8');

  it.each(EDUCATION_PAGES.map((p) => p.slug))('hub reaches %s', (slug) => {
    expect(hub).toContain(slug);
  });
});

/**
 * The footer assertion lives with the footer, in
 * `components/__tests__/Footer.educationLinks.test.tsx`, because the links are now
 * rendered from this registry rather than written as literal paths — a source scan
 * would pass on a footer that maps over an empty array. That test renders the
 * component and compares the href set against `EDUCATION_PAGES`.
 */

describe('each landing page links three siblings', () => {
  it.each(landingDirs())('%s has a related block', (slug) => {
    const src = readFileSync(join(EDUCATION_DIR, slug, 'page.tsx'), 'utf8');
    const siblings = educationRelatedPages(slug).map((r) => r.slug);
    // Three ways to satisfy this, all of which put the rotation on the page:
    // the thin pages render `EducationLandingTemplate`, which mounts the shared
    // rail; the older pages mount `EducationRelatedLinks` directly; or a page
    // names all three siblings itself.
    const usesShared =
      src.includes('EducationRelatedLinks') || src.includes('EducationLandingTemplate');
    const namesAll = siblings.every((s) => src.includes(s));
    expect(usesShared || namesAll, `${slug} links none of ${siblings.join(', ')}`).toBe(true);
  });
});
