/**
 * Locale parity test: every practice-screen translation key must exist as a
 * non-empty string in all 5 locales.
 *
 * Regression guard for two classes of gap discovered 2026-05-20:
 *
 *  1. DYNAMIC keys the static `check:translations` scanner cannot see, because
 *     they are built from template literals at runtime and were therefore never
 *     added to ANY locale (not even en) — so `t()` returned the raw key string
 *     in all 5 languages. Sources:
 *       - PracticeCompleteBanner   t(`practice.complete.${mode}`)
 *       - PracticeChainCta         t(`practice.continueTo.${next}`)   next ∈ {wordHunt, wheelRush}
 *       - PracticeCompletePopup    t(`practice.${mode}.playRealCta`)
 *       - Practice*Sandbox         t('practice.wordHunt.playRealCta' | 'practice.wordHunt.bailoutCta')
 *       - PracticeMistakeCoach     t(`practice.mistakeCoach.${kind}.title|body`)  kind ∈ MistakeCoachKind
 *       - PracticeDesktopWelcome   t(`practice.tips.${mode}.line${n}`)
 *       - PracticeModeSelector     t(`education.practice.mastery.${mastery}`)
 *
 *  2. STATIC `practice.*` keys present in en/he but whose entire sub-blocks
 *     (complete, classic, wordHunt, wheelRush, mistakeCoach) were absent in
 *     sv/ja/es — so those locales rendered raw keys too.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { en } from '../translations/en.js';
import { he } from '../translations/he.js';
import { sv } from '../translations/sv.js';
import { ja } from '../translations/ja.js';
import { es } from '../translations/es.js';

const LOCALES: Record<string, Record<string, unknown>> = { en, he, sv, ja, es };

const TRANSLATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'translations');

const PRACTICE_MODES = ['classic', 'wordHunt', 'wheelRush'] as const;
const NEXT_MODES = ['wordHunt', 'wheelRush'] as const; // getNextPracticeMode never yields 'classic'
const MISTAKE_KINDS = ['notAWord', 'notAdjacent', 'diagonalsOk', 'needsCenter'] as const;
const MASTERY = ['started', 'practicing', 'mastered'] as const;

// Build the full required dotted-path set the practice surface actually calls.
const REQUIRED_KEYS: string[] = [
  // --- dynamic keys (were missing in ALL locales incl. en) ---
  ...PRACTICE_MODES.map((m) => `practice.complete.${m}`),
  ...NEXT_MODES.map((m) => `practice.continueTo.${m}`),
  ...PRACTICE_MODES.map((m) => `practice.${m}.playRealCta`),
  'practice.wordHunt.bailoutCta',
  ...MISTAKE_KINDS.flatMap((k) => [
    `practice.mistakeCoach.${k}.title`,
    `practice.mistakeCoach.${k}.body`,
  ]),
  ...PRACTICE_MODES.flatMap((m) => [
    `practice.tips.${m}.line1`,
    `practice.tips.${m}.line2`,
    `practice.tips.${m}.line3`,
  ]),
  ...MASTERY.map((m) => `education.practice.mastery.${m}`),

  // --- static practice.* keys (en/he had these; sv/ja/es did not) ---
  'practice.again',
  'practice.allDone',
  'practice.classic.notAWord',
  'practice.coach.dismiss',
  'practice.coach.label',
  'practice.complete.title',
  'practice.endRun',
  'practice.instructions.cta',
  'practice.instructions.title',
  'practice.keepPracticing',
  'practice.mistakeCoach.ariaLabel',
  'practice.mistakeCoach.cta',
  'practice.modifier.bonus',
  'practice.modifier.todayLabel',
  'practice.wheelRush.builderHint',
  'practice.wheelRush.duplicate',
  'practice.wheelRush.found',
  'practice.wheelRush.needsCenter',
  'practice.wheelRush.notAWord',
  'practice.wheelRush.reset',
  'practice.wheelRush.scoreChip',
  'practice.wheelRush.shuffle',
  'practice.wordHunt.discoveryHint',
  'practice.wordHunt.discoveryTip',
  'practice.wordHunt.discoveryTipNoClue',
  'practice.wordHunt.goalChip',
  'practice.wordHunt.livesNote',
  'practice.wordHunt.realGameLabel',
  'practice.wordHunt.shortWordTip',
];

function resolve(dict: Record<string, unknown>, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, dict);
}

/**
 * Root-cause guard: a SECOND top-level `"practice": {` block in sv/ja/es was
 * silently shadowing the rich one (JS keeps the last duplicate key), so the
 * whole practice surface fell back to raw keys in those locales. Catch any
 * recurrence of duplicate top-level namespaces before it ships.
 */
describe('no duplicate top-level "practice" namespace', () => {
  for (const code of Object.keys(LOCALES)) {
    it(`${code}.js declares "practice" exactly once at top level`, () => {
      const src = readFileSync(join(TRANSLATIONS_DIR, `${code}.js`), 'utf8');
      const count = (src.match(/^ {2}"practice": \{/gm) ?? []).length;
      expect(count).toBe(1);
    });
  }
});

describe('practice locale parity (dynamic + static keys)', () => {
  for (const [code, dict] of Object.entries(LOCALES)) {
    describe(`locale: ${code}`, () => {
      for (const key of REQUIRED_KEYS) {
        it(`has ${key} as a non-empty string`, () => {
          const val = resolve(dict, key);
          expect(typeof val).toBe('string');
          expect((val as string).length).toBeGreaterThan(0);
        });
      }
    });
  }
});
