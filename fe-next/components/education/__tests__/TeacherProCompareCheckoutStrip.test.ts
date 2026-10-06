/**
 * Public classroom compare pages must link Teacher Pro checkout.
 * Schools & departments ($49/teacher/year) stay lead-capture and are not linked here.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { teacherProCompareCheckoutCopy } from '@/components/education/TeacherProCompareCheckoutStrip';

const ROOT = join(__dirname, '..', '..', '..');
const LOCALE = join(ROOT, 'app', '[locale]');
const STRIP = join(ROOT, 'components', 'education', 'TeacherProCompareCheckoutStrip.tsx');

/** Classroom compare pages, not consumer word-game foils. */
const EDUCATION = [
  'lexiclash-vs-kahoot',
  'lexiclash-vs-mentimeter',
  'lexiclash-vs-padlet',
  'lexiclash-vs-peardeck',
  'lexiclash-vs-gimkit',
  'lexiclash-vs-blooket',
  'lexiclash-vs-quizlet',
  'lexiclash-vs-socrative',
  'lexiclash-vs-wayground',
  'lexiclash-vs-wooclap',
  'lexiclash-vs-classpoint',
  'lexiclash-vs-nearpod',
  'lexiclash-vs-wordwall',
  'lexiclash-vs-flocabulary',
  'lexiclash-vs-freerice',
  'lexiclash-vs-kahoot-gimkit-vocabulary',
  'lexiclash-vs-vocabularyspellingcity',
  'lexiclash-vs-wordwall-kahoot-quizlet',
] as const;

const NOT_EDUCATION = [
  'lexiclash-vs-apalabrados',
  'lexiclash-vs-cabanagrams',
  'lexiclash-vs-popple',
  'lexiclash-vs-puzzly-words',
  'lexiclash-vs-scrabble',
  'lexiclash-vs-wordfeud',
  'lexiclash-vs-wordle',
] as const;

describe('Teacher Pro checkout strip on classroom compare pages', () => {
  const strip = readFileSync(STRIP, 'utf8');

  it('is a server component that links /teacher/upgrade at the real $9 caps', () => {
    expect(strip).not.toMatch(/^['"]use client['"]/m);
    expect(strip).not.toMatch(/useLanguage/);
    expect(strip).toContain("'/teacher/upgrade'");
    expect(strip).toContain('TEACHER_PRO_PRICE_USD');
    expect(strip).toContain('FREE_TIER_LIMITS');
    expect(strip).not.toMatch(/lexiclash\.com/);
    expect(strip).not.toMatch(/\b39\b/);
    expect(strip).not.toMatch(/classroom-plan|plan=classroom/);
  });

  it('fills $9, 3 classes, and 50 students without a forever-free claim', () => {
    const copy = teacherProCompareCheckoutCopy('en');
    expect(copy.heading).toContain(`$${TEACHER_PRO_PRICE_USD}`);
    expect(copy.body).toContain(String(FREE_TIER_LIMITS.classes));
    expect(copy.body).toContain(String(FREE_TIER_LIMITS.studentsPerClass));
    expect(copy.cta).toContain(`$${TEACHER_PRO_PRICE_USD}`);
    expect(`${copy.heading} ${copy.body} ${copy.cta} ${copy.note}`).not.toMatch(/free forever|forever free|\$0 forever/i);
    expect(TEACHER_PRO_PRICE_USD).toBe(9);
    expect(FREE_TIER_LIMITS.classes).toBe(3);
    expect(FREE_TIER_LIMITS.studentsPerClass).toBe(50);
  });

  it('mounts once on every education compare page and nowhere on word-game foils', () => {
    for (const slug of EDUCATION) {
      const page = readFileSync(join(LOCALE, slug, 'page.tsx'), 'utf8');
      expect(page, slug).toContain('TeacherProCompareCheckoutStrip');
      expect(page, slug).toContain('<TeacherProCompareCheckoutStrip locale={locale} />');
      expect(page.match(/<TeacherProCompareCheckoutStrip/g)?.length, slug).toBe(1);
      expect(page, slug).not.toMatch(/lexiclash\.com/);
    }
    for (const slug of NOT_EDUCATION) {
      const page = readFileSync(join(LOCALE, slug, 'page.tsx'), 'utf8');
      expect(page, slug).not.toContain('TeacherProCompareCheckoutStrip');
      expect(page, slug).not.toContain('teacher/upgrade');
    }
    const discovered = readdirSync(LOCALE).filter((n) => n.startsWith('lexiclash-vs-'));
    const known = new Set<string>([...EDUCATION, ...NOT_EDUCATION]);
    expect(discovered.filter((n) => !known.has(n))).toEqual([]);
  });

  it('stops claiming the free tier has no upgrade on Kahoot and Wordwall', () => {
    const kahoot = readFileSync(join(LOCALE, 'lexiclash-vs-kahoot', 'page.tsx'), 'utf8');
    const wordwall = readFileSync(join(LOCALE, 'lexiclash-vs-wordwall', 'page.tsx'), 'utf8');
    expect(kahoot).not.toMatch(/no upgrade screen/i);
    expect(kahoot).toMatch(/Teacher Pro \(\$9\/mo\)/);
    expect(kahoot).toMatch(/calm-mode pressure dials/);
    expect(kahoot).toMatch(/3 classes × 50 students/);
    expect(wordwall).not.toMatch(/never gates features behind a paywall/);
    expect(wordwall).not.toMatch(/\$0 forever/);
    expect(wordwall).toMatch(/Teacher Pro \(\$9\/mo\)/);
    expect(wordwall).toMatch(/calm-mode pressure dials/);
  });
});

describe('classroom SEO landings that already name Teacher Pro', () => {
  const CLASSROOM_SEO = [
    'word-games-for-the-classroom',
    'bell-ringer-word-games',
    'substitute-teacher-word-games',
    'vocabulary-games-for-middle-school',
  ] as const;

  it('mounts the server checkout strip once and does not open a Classroom checkout', () => {
    for (const slug of CLASSROOM_SEO) {
      const page = readFileSync(join(LOCALE, slug, 'page.tsx'), 'utf8');
      const content = readFileSync(join(LOCALE, slug, 'content.ts'), 'utf8');
      expect(content, slug).toMatch(/Teacher Pro/);
      expect(content, slug).toMatch(/\$9/);
      expect(page, slug).toContain('<TeacherProCompareCheckoutStrip locale={locale} />');
      expect(page.match(/<TeacherProCompareCheckoutStrip/g)?.length, slug).toBe(1);
      expect(page, slug).not.toMatch(/^['"]use client['"]/m);
      expect(page, slug).not.toMatch(/\b39\b/);
      expect(page, slug).not.toMatch(/plan=classroom/);
    }
  });
});
