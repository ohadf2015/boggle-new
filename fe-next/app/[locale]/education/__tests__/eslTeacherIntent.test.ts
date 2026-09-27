/**
 * `esl-word-games` targets the TEACHER-LED query, not the bare head term.
 *
 * The page lost a blind comparison against 7esl.com/word-games/ — 24 self-serve
 * games, a faceted filter, ten million learners. A single-product page cannot beat
 * a student arcade on breadth for "ESL word games", and pretending otherwise means
 * competing where we are structurally weakest.
 *
 * Checked on the live SERP (2026-09-05): "ESL word games for the classroom" returns
 * Teach-This, the Bridge TEFL blog, FluentU's *Educator* blog, ESL KidStuff and
 * eslgamesworld — teacher content, top to bottom, with no student arcade in the set.
 * That is the query this product actually serves: one teacher, one projector, a room
 * of phones. So the page is aimed there, and these assertions keep it aimed there.
 *
 * The workflow section is the thing that won `vocabulary-games-classroom` its round:
 * a literal, timed sequence a teacher can follow on a Tuesday, not a feature list.
 */
import { describe, it, expect } from 'vitest';
import { getEslWordGamesContent } from '../esl-word-games/content';

const LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;

/** Words that say "classroom / teacher / class" in each locale we build. */
const TEACHER_INTENT: Record<string, RegExp> = {
  en: /classroom|teacher|class/i,
  he: /כית|מור/,
  es: /aula|clase|docente|maestr|profesor/i,
  sv: /klassrum|klass|lärar/i,
  ja: /教室|クラス|先生|授業/,
  ru: /класс|учител|урок/i,
};

describe.each(LOCALES)('%s — aimed at the teacher-led query', (locale) => {
  const c = getEslWordGamesContent(locale);
  const intent = TEACHER_INTENT[locale];

  it('names the classroom in the title', () => {
    expect(c.metaTitle).toMatch(intent);
  });

  it('names the classroom in the H1', () => {
    const h1 = `${c.heroH1.highlight} ${c.heroH1.rest1} ${c.heroH1.rest2}`;
    expect(h1).toMatch(intent);
  });

  it('names the classroom in the meta description', () => {
    expect(c.metaDescription).toMatch(intent);
  });

  it('title stays within a sane SERP length', () => {
    expect(c.metaTitle.length).toBeLessThanOrEqual(75);
  });
});

describe.each(LOCALES)('%s — the teacher workflow', (locale) => {
  const c = getEslWordGamesContent(locale);

  it('is a timed sequence of at least five steps', () => {
    expect(c.workflow.steps.length).toBeGreaterThanOrEqual(5);
  });

  it('every step has a time marker and an instruction', () => {
    for (const s of c.workflow.steps) {
      expect(s.when.trim().length).toBeGreaterThan(0);
      expect(s.what.trim().length).toBeGreaterThan(10);
    }
  });

  it('has a heading and an intro', () => {
    expect(c.workflow.heading.trim().length).toBeGreaterThan(0);
    expect(c.workflow.intro.trim().length).toBeGreaterThan(40);
  });
});

describe.each(LOCALES)('%s — the honest limit', (locale) => {
  const c = getEslWordGamesContent(locale);

  it('tells a reader when a student arcade is the better tool', () => {
    expect(c.arcadeNote.heading.trim().length).toBeGreaterThan(0);
    expect(c.arcadeNote.body.trim().length).toBeGreaterThan(80);
  });

  it('links out rather than pretending the alternative does not exist', () => {
    expect(c.arcadeNote.href).toMatch(/^https:\/\//);
  });
});

describe('no CEFR anywhere on this page', () => {
  it.each(LOCALES)('%s uses the real per-student tiers instead', (locale) => {
    const c = getEslWordGamesContent(locale);
    const all = JSON.stringify(c);
    // CEFR is implemented nowhere in this repo. `classroom_memberships.level` is
    // real (migration 20260905130000) and holds support | core | challenge.
    expect(all).not.toMatch(/CEFR|MCER|A1[–-]C2/i);
  });
});
