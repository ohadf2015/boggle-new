/**
 * The depth blocks added 2026-09-05 must stay true to the code they describe.
 *
 * These sections exist because the older landing pages lose to teacher-blog
 * listicles on length, and the only thing we can say that a listicle cannot is
 * what the product actually does. That advantage evaporates the moment a number
 * here drifts from the constant it came from — a specific wrong fact is worse
 * than vague copy, and this module has shipped 140+ false claims once already.
 *
 * So every figure is asserted against its source of truth rather than reviewed
 * by eye. The GEO answers are length-checked too: an answer an engine cannot
 * quote whole is an answer that does not get quoted.
 */
import { describe, it, expect } from 'vitest';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';
import { BASE_PRACTICE_MODES } from '@/lib/education/practicePicker';
import { LEVEL_ORDER } from '@/lib/education/differentiation';
import { getSightWordsContent } from '../sight-words-practice/content';
import { getVocabClassroomContent } from '../vocabulary-games-classroom/content';
import { getEslWordGamesContent } from '../esl-word-games/content';
import type { DepthSection } from '@/components/education/EducationDepthSections';

function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const SIGHT = getSightWordsContent('en').depth;
const VOCAB = getVocabClassroomContent('en').depth;
const ESL = getEslWordGamesContent('en').depth;

const ALL: Array<[string, readonly DepthSection[]]> = [
  ['sight-words-practice', SIGHT],
  ['vocabulary-games-classroom', VOCAB],
  ['esl-word-games', ESL],
];

describe.each(ALL)('%s depth blocks', (_page, sections) => {
  it('has at least two sections', () => {
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('every answer is quotable on its own — 40 to 60 words', () => {
    const bad = sections
      .map((s) => [s.heading, words(s.answer)] as const)
      .filter(([, n]) => n < 40 || n > 60);
    expect(bad).toEqual([]);
  });

  it('every section carries concrete points', () => {
    for (const s of sections) expect(s.points.length).toBeGreaterThanOrEqual(3);
  });

  it('headings read as questions or topics, never as slogans with an exclamation', () => {
    for (const s of sections) expect(s.heading).not.toMatch(/!/);
  });
});

describe('the numbers match their source of truth', () => {
  const text = ALL.flatMap(([, ss]) =>
    ss.flatMap((s) => [s.answer, ...s.points]),
  ).join('\n');

  it('quotes the enforced free-tier caps, not remembered ones', () => {
    expect(text).toContain(`${FREE_TIER_LIMITS.studentsPerClass} students`);
    expect(text).toContain(`${FREE_TIER_LIMITS.classes} classes`);
  });

  it('quotes the real Teacher Pro price', () => {
    expect(text).toContain(`$${TEACHER_PRO_PRICE_USD}/month`);
  });

  it('quotes the real room ceiling, and it still equals the free per-class cap', () => {
    expect(MAX_PLAYERS_PER_ROOM).toBe(FREE_TIER_LIMITS.studentsPerClass);
    expect(text).toContain(`${MAX_PLAYERS_PER_ROOM} students`);
  });

  it('counts the practice modes that actually exist', () => {
    expect(BASE_PRACTICE_MODES.length).toBe(7);
    expect(text).toMatch(/[Ss]even (list-driven )?(practice )?modes|seven modes/);
  });

  it('counts the differentiation tiers that actually exist', () => {
    expect(LEVEL_ORDER).toEqual(['support', 'core', 'challenge']);
    expect(text).toMatch(/support, core, (and )?challenge/);
  });

  it('never claims a language count other than six', () => {
    expect(text).not.toMatch(/\bfive languages\b|\b5 languages\b/);
  });

  it('states dictionary sizes as floors, never as exact totals', () => {
    // Dictionary set sizes grow every time a community word is approved, so a floor
    // stays true and an exact total is wrong the next time someone approves a word.
    // The floors were measured by rebuilding each Set the way backend/dictionaryLoaders.ts
    // does — normalised and deduped — NOT by counting lines in the source files. Counting
    // lines is how "over 1,400,000" Russian shipped: 1,415,065 lines collapse to 1,347,105.
    const bigNumbers = [...text.matchAll(/(\S+\s+)?(\d{1,3}(?:,\d{3}){1,3})/g)];
    const notFloored = bigNumbers
      .filter(([, prefix]) => (prefix ?? '').trim().toLowerCase() !== 'over')
      .map(([m]) => m.trim());
    expect(notFloored).toEqual([]);
  });
});
