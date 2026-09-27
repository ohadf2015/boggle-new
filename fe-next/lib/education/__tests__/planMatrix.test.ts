import { describe, expect, it } from 'vitest';
import { PLAN_MATRIX_ROWS } from '../planMatrix';
import { FREE_TIER_LIMITS } from '../freeTierLimits';
import { getTierConfig } from '../../lemonsqueezy';
// @ts-expect-error — translations are untyped .js bundles
import { en } from '../../../translations/en';

/**
 * The plan matrix is the FOURTH surface in this app describing the same two tiers — after
 * `TIER_CONFIGS`, the landing page's `ProFramingSection` and the upgrade page's cards. Three
 * surfaces already drifted once: on 2026-08-25 the upgrade page advertised "Daily progress
 * reports" as free while ProGate refused reporting in the product, because the guard test
 * read two of the three surfaces and not the third.
 *
 * So this file exists before the matrix renders anywhere. A matrix is the worst possible
 * place for that class of bug: it is the one layout whose entire purpose is to be scanned
 * cell by cell, so a single wrong cell is both the most visible and the most load-bearing
 * error the pricing page can make.
 *
 * The binding is deliberately one-directional. `planMatrix.ts` imports ONLY
 * `freeTierLimits.ts` — it cannot import `lib/lemonsqueezy.ts`, which pulls
 * LemonSqueezyClient and its API key into whatever bundle touches it, and the matrix is
 * rendered by a client component. This test is the only place the two are allowed to meet.
 */
const LOCALES = ['en', 'es', 'he', 'ja', 'ru', 'sv'] as const;

/** `null` means unlimited — the same convention `TierConfig.classes_limit` already uses. */
const countRows = () => PLAN_MATRIX_ROWS.filter((r) => typeof r.free === 'number' || r.free === null);
const flagRows = () => PLAN_MATRIX_ROWS.filter((r) => typeof r.free === 'boolean');

/**
 * Meaning-carrying words of a feature line. The threshold is 3, not 5: "ads" and "zero" are
 * the only words that distinguish "Zero ads for students" from the free tier's student CAP,
 * and a 5-char filter drops both.
 */
const STOPWORDS = new Set(['for', 'and', 'per', 'the', 'with', 'your', 'all']);
const contentWords = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

/** Walk a dotted t() key through a locale bundle. Returns '' if the key is absent. */
function lookup(bundle: unknown, key: string): string {
  let node: unknown = bundle;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return '';
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : '';
}

describe('plan comparison matrix', () => {
  it('has rows at all, and every row differs or is deliberately shared', () => {
    expect(PLAN_MATRIX_ROWS.length).toBeGreaterThan(0);
    // A row where Pro is WORSE than Free is always a mistake — it would render a paid
    // column with a cross beside a free column with a tick.
    for (const row of PLAN_MATRIX_ROWS) {
      if (typeof row.free === 'boolean' && typeof row.pro === 'boolean') {
        expect(
          row.free && !row.pro,
          `row "${row.key}" gives Free something Pro does not`,
        ).toBe(false);
      }
    }
  });

  it('quotes the caps the server actually enforces', () => {
    const free = getTierConfig('free');
    const pro = getTierConfig('pro');

    const byKey = Object.fromEntries(PLAN_MATRIX_ROWS.map((r) => [r.key, r]));

    expect(byKey.classes, 'matrix has no "classes" row').toBeTruthy();
    expect(byKey.classes.free).toBe(FREE_TIER_LIMITS.classes);
    expect(byKey.classes.free).toBe(free.classes_limit);
    expect(byKey.classes.pro, 'Pro classes must be unlimited (null)').toBe(pro.classes_limit);

    expect(byKey.studentsPerClass, 'matrix has no "studentsPerClass" row').toBeTruthy();
    expect(byKey.studentsPerClass.free).toBe(FREE_TIER_LIMITS.studentsPerClass);
    expect(byKey.studentsPerClass.free).toBe(free.students_limit_per_class);
    expect(byKey.studentsPerClass.pro).toBe(pro.students_limit_per_class);

    // Every count row must be one of the two the config knows about. A third count row
    // would be a number with no enforcement behind it.
    expect(countRows().map((r) => r.key).sort()).toEqual(['classes', 'studentsPerClass']);
  });

  it('never ticks Free for something the product gates', () => {
    // Derived from the config at runtime rather than listed here, so moving a feature
    // across the paywall fails this test instead of silently disagreeing with it.
    const paidOnly = getTierConfig('pro')
      .features.filter((f) => f !== 'Everything in Free' && !/^Unlimited /.test(f));

    expect(paidOnly.length, 'Pro config lists no paid-only feature to check against').toBeGreaterThan(0);

    for (const row of flagRows().filter((r) => r.free === true)) {
      const label = lookup(en, `teacher.subscription.matrix.${row.key}`).toLowerCase();
      expect(label, `no en.js label for matrix row "${row.key}"`).not.toBe('');

      for (const feature of paidOnly) {
        // Content words of the paid feature, minus the connectives.
        const words = feature
          .toLowerCase()
          .split(/[^a-z]+/)
          .filter((w) => w.length > 4);
        for (const word of words) {
          expect(
            label.includes(word),
            `matrix ticks "${row.key}" for Free, but "${word}" is sold as Pro-only ("${feature}")`,
          ).toBe(false);
        }
      }
      // The mirror check: a row ticked free should be recognisable in the free config.
      //
      // Matched against ONE feature at a time, never the joined string. Joined, "Zero ads for
      // students" was satisfied by the word `students` bleeding out of the CAP line ("3
      // students per class") — so deleting the ads feature entirely would have left this
      // green. The cap lines are dropped for the same reason: they are what the count rows
      // represent, and a flag row must never lean on them.
      const freeFeatureWords = getTierConfig('free')
        .features.filter((f) => !/\d/.test(f))
        .map((f) => new Set(contentWords(f)));
      expect(
        freeFeatureWords.length,
        'every free feature quotes a number — nothing left to match a flag row against',
      ).toBeGreaterThan(0);

      const labelWords = contentWords(label);
      expect(
        freeFeatureWords.some((words) => labelWords.some((w) => words.has(w))),
        `matrix ticks "${row.key}" for Free but no free-tier feature mentions it`,
      ).toBe(true);
    }
  });

  it('crosses Free only for things Pro actually sells', () => {
    const paidOnly = getTierConfig('pro')
      .features.filter((f) => f !== 'Everything in Free' && !/^Unlimited /.test(f))
      .join(' ')
      .toLowerCase();

    const crossed = flagRows().filter((r) => r.free === false);
    expect(crossed.length, 'matrix crosses nothing for Free — it sells nothing').toBeGreaterThan(0);

    for (const row of crossed) {
      const label = lookup(en, `teacher.subscription.matrix.${row.key}`).toLowerCase();
      const words = label.split(/[^a-z]+/).filter((w) => w.length > 4);
      expect(
        words.some((w) => paidOnly.includes(w)),
        `matrix crosses "${row.key}" for Free, but Pro's config never sells it`,
      ).toBe(true);
    }
  });

  it.each(LOCALES)('translates every row label and cell word into %s', async (locale) => {
    const bundle = (await import(`../../../translations/${locale}.js`))[locale];
    expect(bundle, `translations/${locale}.js does not export "${locale}"`).toBeTruthy();

    for (const row of PLAN_MATRIX_ROWS) {
      expect(
        lookup(bundle, `teacher.subscription.matrix.${row.key}`),
        `${locale}.js is missing teacher.subscription.matrix.${row.key}`,
      ).not.toBe('');
    }

    // "Unlimited" and the section heading are rendered as words, not glyphs, so they need
    // translating too — a ✓/✗ needs no locale but "Unlimited" very much does.
    for (const key of [
      'matrix.title',
      'matrix.unlimited',
      'matrix.featureColumn',
      'matrix.included',
      'matrix.notIncluded',
    ]) {
      expect(
        lookup(bundle, `teacher.subscription.${key}`),
        `${locale}.js is missing teacher.subscription.${key}`,
      ).not.toBe('');
    }
  });
});
