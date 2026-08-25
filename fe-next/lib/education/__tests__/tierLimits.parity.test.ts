/**
 * The paywall and the page that advertises it must never disagree.
 *
 * Before 2026-08-23 the free caps existed in SEVEN places: the tier config, and "2"/"30"
 * typed into four copy strings across six locale files. Tightening the paywall in the config
 * alone would have advertised two classes of thirty while enforcing one of ten — on the only
 * page in the portfolio that can take money, which is a refund conversation, not a bug.
 *
 * The fix was to interpolate `{count}` from `FREE_TIER_LIMITS`. This test is what keeps it
 * that way: it fails if anyone retypes a literal number back into the copy, and it fails if
 * the config drifts from the shared constant.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { FREE_TIER_LIMITS } from '../freeTierLimits';
import { getTierConfig } from '../../lemonsqueezy';

const TRANSLATIONS = join(__dirname, '../../../translations');

describe('free tier limits', () => {
  it('enforces exactly the shared constant, not a retyped copy of it', () => {
    const free = getTierConfig('free');
    expect(free.classes_limit).toBe(FREE_TIER_LIMITS.classes);
    expect(free.students_limit_per_class).toBe(FREE_TIER_LIMITS.studentsPerClass);
  });

  it('leaves Pro unlimited, so there is something to sell', () => {
    const pro = getTierConfig('pro');
    expect(pro.classes_limit).toBeNull();
    expect(pro.students_limit_per_class).toBeNull();
  });

  it('is restrictive enough that a real class cannot run for free', () => {
    // A real class is 25-30 students. This is the whole reason the tier was tightened: at
    // 30 per class the cap could never bind. If someone raises it back above a class size,
    // the free tier silently becomes the product again.
    expect(FREE_TIER_LIMITS.studentsPerClass).toBeLessThan(25);
    expect(FREE_TIER_LIMITS.classes).toBeLessThan(2);
  });

  it('has no hardcoded fallback limit left in the enforcement path', () => {
    // The hole this test was added for. lib/subscriptions.ts carried its OWN copies of the
    // caps as `?? 2` / `?? 30` / `limit: 30` fallbacks, taken whenever the subscription row
    // is missing or a Pro subscription is not active. They matched the config only by
    // coincidence, so tightening the config left those paths serving the old generous cap —
    // a "non-active pro" still got 2 classes. Reading the file is crude but it is the only
    // thing that catches a literal typed back in.
    const src = readFileSync(join(__dirname, '../../subscriptions.ts'), 'utf8');
    expect(src).not.toMatch(/\?\?\s*\d+/);
    expect(src).not.toMatch(/limit:\s*\d+/);
    expect(src).toContain('FREE_TIER_LIMITS');
  });

  // Every locale, not just en: the copy was wrong in six files last time.
  const locales = readdirSync(TRANSLATIONS).filter((f) => /^[a-z]{2}\.js$/.test(f));

  it('has locale files to check at all', () => {
    // Guards the guard: a bad glob would make every assertion below vacuously pass.
    expect(locales.length).toBeGreaterThanOrEqual(6);
  });

  it.each(locales)('%s advertises the caps by interpolation, never a literal', (file) => {
    const src = readFileSync(join(TRANSLATIONS, file), 'utf8');

    // `classLimit`/`studentLimit` belong to the Pro-framing block on the education landing
    // page, added after this test was written — it advertises the same caps from a second
    // place, which is how the original bug happened. Each of these key names is unique
    // across the file, so the first match is the right one.
    for (const key of ['freeClasses', 'freeStudents', 'classLimit', 'studentLimit']) {
      const match = src.match(new RegExp(`"${key}":\\s*"([^"]*)"`));
      expect(match, `${file} is missing "${key}"`).not.toBeNull();
      const value = match![1];
      // The number must come from the config at render time.
      expect(value, `${file} "${key}" must interpolate {count}`).toContain('{count}');
      // …and must not ALSO carry a hardcoded quantity that would contradict it.
      expect(value, `${file} "${key}" still hardcodes a number`).not.toMatch(/\d/);
    }

    // `whyNow` names the student cap inside a sentence, so it cannot use the no-digits rule
    // above — it legitimately carries the Pro figures ("500+", "50+"). It must still take the
    // cap by interpolation, and must not restate it as a literal beside the interpolated one.
    const whyNow = src.match(/"whyNow":\s*"([^"]*)"/);
    expect(whyNow, `${file} is missing "whyNow"`).not.toBeNull();
    expect(whyNow![1], `${file} "whyNow" must interpolate {count}`).toContain('{count}');
    const bareCap = new RegExp(`(?<!\\d)${FREE_TIER_LIMITS.studentsPerClass}(?!\\d)`);
    expect(
      whyNow![1].replace('{count}', ''),
      `${file} "whyNow" hardcodes the student cap`,
    ).not.toMatch(bareCap);

    // The retired keys must be gone, or a stale bundle could render the old promise.
    expect(src, `${file} still has the pre-2026-08-23 key free2Classes`).not.toContain(
      'free2Classes',
    );
    expect(src, `${file} still has the pre-2026-08-23 key free30Students`).not.toContain(
      'free30Students',
    );
  });
});
