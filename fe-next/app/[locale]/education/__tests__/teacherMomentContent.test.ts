import { describe, it, expect } from 'vitest';
import type { EducationLandingContent } from '@/lib/seo/educationLanding';
import { getBrainBreaksContent } from '../brain-breaks-word-games/content';
import { getIndoorRecessContent } from '../indoor-recess-games/content';
import { getEndOfYearContent } from '../end-of-year-classroom-activities/content';
import { getIcebreakersContent } from '../first-day-of-school-icebreakers/content';
import { getEarlyFinishersContent } from '../early-finishers-activities/content';
import { getMiddleSchoolContent } from '../middle-school-word-games/content';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

/**
 * Length floors have to be per-language. Japanese writes no spaces and packs far
 * more meaning per character; Hebrew and Russian carry roughly 3/4 of English's
 * word count for the same content. A single English-shaped threshold would either
 * wave through thin Japanese copy or reject perfectly full Hebrew copy.
 */
const DENSITY: Record<string, { answerWords: number; faqChars: number; descChars: number }> = {
  en: { answerWords: 35, faqChars: 40, descChars: 40 },
  es: { answerWords: 35, faqChars: 40, descChars: 40 },
  sv: { answerWords: 32, faqChars: 40, descChars: 40 },
  he: { answerWords: 24, faqChars: 30, descChars: 35 },
  ru: { answerWords: 28, faqChars: 35, descChars: 38 },
  // Japanese is measured in characters, not words, throughout.
  ja: { answerWords: 80, faqChars: 22, descChars: 24 },
};

const PAGES: Array<{ slug: string; get: (l: string) => EducationLandingContent }> = [
  { slug: 'brain-breaks-word-games', get: getBrainBreaksContent },
  { slug: 'indoor-recess-games', get: getIndoorRecessContent },
  { slug: 'end-of-year-classroom-activities', get: getEndOfYearContent },
  { slug: 'first-day-of-school-icebreakers', get: getIcebreakersContent },
  { slug: 'early-finishers-activities', get: getEarlyFinishersContent },
  { slug: 'middle-school-word-games', get: getMiddleSchoolContent },
];

/** Icon names EducationLandingSections can actually render. */
const ICONS = new Set([
  'book', 'clock', 'coins', 'globe', 'grid', 'graduation', 'list', 'lock',
  'monitor', 'sparkles', 'timer', 'trending', 'upload', 'users', 'wifi', 'zap',
]);

/**
 * Claims the code contradicts. `lib/education/freeTierLimits.ts` enforces
 * 3 classrooms x 10 students with a $9/mo Teacher Pro tier, the app ships six
 * locales, and two different join-code generators exist (4-digit numeric in
 * backend/utils/gameUtils.ts, 6-char alphanumeric in utils/utils.ts and the SQL
 * function) so no page may state a code length at all.
 */
const FORBIDDEN: Array<[RegExp, string]> = [
  [/free forever|חינם לתמיד|gratis para siempre|gratis för alltid|永久に無料|навсегда бесплатн/i, 'promises "free forever" — a paid Teacher Pro tier exists'],
  [/no premium|premium tier|per-seat|sin plan premium|utan premium/i, 'denies the premium tier'],
  [/\b\d-digit\b|\b\d\s?digit code|4 ספרות|4-siffrig|4桁|4 dígitos|4-значн/i, 'states a join-code length (unresolved in code)'],
  [/\bup to \d+ students\b|\b30 students\b|30 תלמידים|30 elever|30人の生徒|30 estudiantes|30 учеников/i, 'states a student cap the free tier does not deliver'],
  [/\bfive languages\b|\b5 languages\b|5 idiomas|fem språk|5つの言語|5 שפות|5 языков/i, 'says five languages — there are six'],
];

describe.each(PAGES)('$slug content', ({ slug, get }) => {
  it('returns distinct, non-empty content for all six locales', () => {
    const titles = new Set<string>();
    for (const locale of LOCALES) {
      const c = get(locale);
      expect(c, `${slug}/${locale} missing`).toBeTruthy();
      expect(c.meta.title.length, `${slug}/${locale} empty title`).toBeGreaterThan(5);
      expect(c.meta.description.length, `${slug}/${locale} description too short`)
        .toBeGreaterThanOrEqual(DENSITY[locale].descChars);
      expect(c.meta.keywords.length, `${slug}/${locale} no keywords`).toBeGreaterThan(2);
      titles.add(c.meta.title);
    }
    // Six distinct titles: a locale silently falling back to English would collide.
    expect(titles.size, `${slug} has locales sharing a meta title (untranslated fallback?)`).toBe(6);
  });

  it('carries at least one information-bearing section per locale, not just prose and cards', () => {
    // The anti-thin-content rule: each page must own a real artifact — a word
    // list, a timed plan, or a comparison table — not the same features under a
    // different heading.
    for (const locale of LOCALES) {
      const kinds = get(locale).sections.map((s) => s.kind);
      const hasArtifact = kinds.some((k) => k === 'wordlist' || k === 'steps' || k === 'table');
      expect(hasArtifact, `${slug}/${locale} sections are ${kinds.join()} — no artifact`).toBe(true);
    }
  });

  it('keeps the answer-first block quotable (35-110 words)', () => {
    for (const locale of LOCALES) {
      const { answer } = get(locale);
      expect(answer.question.length, `${slug}/${locale} empty answer question`).toBeGreaterThan(10);
      // CJK has no spaces, so count characters there instead of words.
      // ja is counted in characters; every other locale in words.
      const size = locale === 'ja' ? answer.answer.length : answer.answer.trim().split(/\s+/).length;
      const min = DENSITY[locale].answerWords;
      expect(size, `${slug}/${locale} answer is ${size} (min ${min})`).toBeGreaterThanOrEqual(min);
      expect(size, `${slug}/${locale} answer is ${size} (max ${min * 3.2})`).toBeLessThanOrEqual(min * 3.2);
    }
  });

  it('makes no claim the code contradicts', () => {
    for (const locale of LOCALES) {
      const blob = JSON.stringify(get(locale));
      for (const [re, why] of FORBIDDEN) {
        const hit = blob.match(re);
        expect(hit, `${slug}/${locale} ${why} — found "${hit?.[0]}"`).toBeNull();
      }
    }
  });

  it('uses only renderable icon names', () => {
    for (const locale of LOCALES) {
      for (const s of get(locale).sections) {
        if (s.kind !== 'features') continue;
        for (const item of s.items) {
          expect(ICONS.has(item.icon), `${slug}/${locale} unknown icon "${item.icon}"`).toBe(true);
        }
      }
    }
  });

  it('keeps every table rectangular', () => {
    for (const locale of LOCALES) {
      for (const s of get(locale).sections) {
        if (s.kind !== 'table') continue;
        for (const row of s.rows) {
          expect(row.length, `${slug}/${locale} table row has ${row.length} cells, header has ${s.columns.length}`)
            .toBe(s.columns.length);
        }
      }
    }
  });

  it('ships enough FAQ depth to be worth a FAQPage node', () => {
    for (const locale of LOCALES) {
      const { faqs } = get(locale);
      expect(faqs.length, `${slug}/${locale} only ${faqs.length} FAQs`).toBeGreaterThanOrEqual(5);
      for (const f of faqs) {
        expect(f.a.length, `${slug}/${locale} FAQ answer too short: "${f.q}"`)
          .toBeGreaterThanOrEqual(DENSITY[locale].faqChars);
      }
    }
  });

  it('links only to education routes that exist', () => {
    const KNOWN = new Set([
      '/education', '/education/classroom-game', '/education/duels', '/education/for-schools',
      '/education/vocabulary-games-classroom', '/education/esl-word-games',
      '/education/games-for-teachers', '/education/spelling-bee-practice',
      '/education/sight-words-practice', '/teacher/upgrade',
      // Non-education destinations these pages legitimately point at.
      '/multiplayer', '/daily', '/teacher',
      ...PAGES.map((p) => `/education/${p.slug}`),
    ]);
    for (const locale of LOCALES) {
      const c = get(locale);
      for (const r of c.related) {
        expect(KNOWN.has(r.href), `${slug}/${locale} related link ${r.href} is not a known route`).toBe(true);
      }
      for (const cta of [c.hero.primaryCta, c.hero.secondaryCta]) {
        if (cta) expect(KNOWN.has(cta.href), `${slug}/${locale} CTA ${cta.href} is not a known route`).toBe(true);
      }
    }
  });
});

describe('the teacher-moment set as a whole', () => {
  it('gives every page a distinct English meta title', () => {
    const titles = PAGES.map((p) => p.get('en').meta.title);
    expect(new Set(titles).size, 'two pages share a meta title').toBe(PAGES.length);
  });

  it('keeps English answer blocks distinct from each other', () => {
    // Near-identical answers across the set is the scaled-content signature.
    const answers = PAGES.map((p) => p.get('en').answer.answer);
    expect(new Set(answers).size).toBe(PAGES.length);
  });

  it('cross-links the set so no page is an orphan', () => {
    const inbound = new Map(PAGES.map((p) => [`/education/${p.slug}`, 0]));
    for (const p of PAGES) {
      for (const r of p.get('en').related) {
        if (inbound.has(r.href)) inbound.set(r.href, inbound.get(r.href)! + 1);
      }
    }
    for (const [href, count] of inbound) {
      expect(count, `${href} has no inbound link from a sibling page`).toBeGreaterThan(0);
    }
  });
});
