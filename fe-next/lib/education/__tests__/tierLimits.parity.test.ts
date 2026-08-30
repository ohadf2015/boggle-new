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
// @ts-expect-error — translations are untyped .js bundles
import { en } from '../../../translations/en';

const TRANSLATIONS = join(__dirname, '../../../translations');
const UPGRADE_PAGE = join(__dirname, '../../../app/[locale]/teacher/upgrade/PageClient.tsx');

/**
 * Quantity nouns are stoplisted: "1 class" on the free side and "Unlimited classes" on the Pro
 * side SHOULD share the word "class" — that is the upsell, not a contradiction. Short words go
 * too, so "for"/"and" cannot make two unrelated bullets look like the same promise.
 */
const STOPWORDS = new Set([
  'class', 'classes', 'classroom', 'student', 'students', 'teacher', 'teachers',
  'your', 'with', 'from', 'that', 'this', 'they', 'them', 'each', 'every',
  'more', 'plan', 'free', 'everything', 'unlimited', 'count',
]);

/** Lowercase content words, singularised crudely so "report"/"reports" collide. */
function contentWords(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 3)
        .map((w) => (w.endsWith('s') ? w.slice(0, -1) : w))
        .filter((w) => !STOPWORDS.has(w) && !STOPWORDS.has(`${w}s`)),
    ),
  ];
}

/** Walk a dotted t() key through the English bundle. Returns '' if the key is absent. */
function englishFor(key: string): string {
  let node: unknown = en;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return '';
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : '';
}

/**
 * The free column as the page actually renders it: every `t('…')` in the `freeFeatures` array
 * paired with the `included` flag that decides whether it draws a tick or a cross. Reading the
 * source is crude, but the alternative is rendering a client component that needs auth,
 * routing and a language provider to say something this test could just look up.
 */
function freeRowsOnUpgradePage(): Array<{ key: string; text: string; included: boolean }> {
  const src = readFileSync(UPGRADE_PAGE, 'utf8');
  const start = src.indexOf('const freeFeatures = [');
  expect(start, 'upgrade page no longer declares freeFeatures').toBeGreaterThan(-1);
  const block = src.slice(start, src.indexOf('\n  ];', start));

  const rows: Array<{ key: string; text: string; included: boolean }> = [];
  for (const [, key, included] of block.matchAll(
    /t\('([^']+)'[\s\S]*?included:\s*(true|false)/g,
  )) {
    const text = englishFor(key);
    expect(text, `upgrade page renders t('${key}') but en.js has no such key`).not.toBe('');
    // Interpolated count rows carry no feature claim — the interpolation tests below own them.
    if (text.includes('{count}')) continue;
    rows.push({ key, text, included: included === 'true' });
  }
  return rows;
}

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

  it('lets a real class run for free, because the paywall now sits after the lesson', () => {
    // REVERSED 2026-08-31. This assertion used to read `toBeLessThan(25)` — the tier was
    // tightened in 2026-08-23 precisely so a class of 25-30 could not fit for free.
    //
    // It bound as designed and monetized nothing: 35 approved teachers, 2 classrooms, and no
    // approved teacher ever active on a second day. A paywall that trips before the first
    // successful lesson removes the teacher rather than converting them.
    //
    // Verified first-party 2026-08-30, the category charges on the other side of the lesson:
    // Blooket free = 60 players, Gimkit free = unlimited on featured modes, and BOTH sell
    // reporting. Teacher Pro still sells analytics (ProGate) and unlimited classes.
    expect(FREE_TIER_LIMITS.studentsPerClass).toBeGreaterThanOrEqual(30);
  });

  it('does not trap a teacher on their very first classroom', () => {
    // Owner decision 2026-08-27, replacing an earlier `classes < 2` assertion here.
    //
    // `canCreateClass` allows iff currentCount < limit, so `classes: 1` meant a teacher's
    // first classroom was also their last: making a throwaway "Test" class while finding
    // your feet permanently blocked the real one. Production had 35 approved teachers and
    // 2 classrooms in total, and no approved teacher has ever been active on a second day —
    // a trap sprung at first use is sprung at the only use we get.
    //
    // KNOWN AND ACCEPTED: 3 classes x 10 students means a teacher COULD split 30 kids across
    // three free classrooms. That buys them three join codes, three leaderboards and three
    // separate analytics views, and it cannot produce one whole-class game — which is the
    // thing the module is actually for. The upsell lives in `studentsPerClass`, asserted
    // above; it does not need this line to survive.
    expect(FREE_TIER_LIMITS.classes).toBeGreaterThan(1);
  });

  it('sells nothing on Pro that the free tier already ships ungated', () => {
    // The reason the free tier felt "too generous": `has_pro` gated the two COUNTS and
    // nothing else, while the Pro card advertised analytics, custom word lists and classroom
    // duels — all three of which every free teacher already had. A Pro bullet is only a Pro
    // bullet if something in the codebase refuses it to a free teacher.
    const gated = readFileSync(join(__dirname, '../../../components/teacher/ProGate.tsx'), 'utf8');
    const pro = getTierConfig('pro').features;
    const countBullets = pro.filter((f) => /^Unlimited /.test(f));
    const featureBullets = pro.filter((f) => !countBullets.includes(f) && f !== 'Everything in Free');

    expect(countBullets.length, 'Pro must still sell the count headroom').toBe(2);
    expect(featureBullets.length, 'Pro must sell at least one real feature').toBeGreaterThan(0);
    for (const bullet of featureBullets) {
      // Each non-count Pro bullet names a `feature` key ProGate knows how to refuse.
      const key = bullet.toLowerCase().split(' ')[0];
      expect(gated, `Pro advertises "${bullet}" but ProGate cannot refuse it`).toContain(key);
    }
  });

  it('refuses the analytics dashboard to free teachers everywhere it renders', () => {
    // Two render sites, and a gate on only one of them is the asymmetric-path bug this repo
    // keeps shipping: the dashboard tab would paywall while the direct URL stayed open.
    const sites = [
      '../../../components/teacher/TeacherDashboard.tsx',
      '../../../app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx',
    ];
    for (const site of sites) {
      const src = readFileSync(join(__dirname, site), 'utf8');
      expect(src, `${site} renders AnalyticsDashboard`).toContain('AnalyticsDashboard');
      expect(src, `${site} renders AnalyticsDashboard without a ProGate`).toContain('ProGate');
    }
  });

  it('does not give away on the pricing page what ProGate refuses in the product', () => {
    // The third surface. `getTierConfig` and ProFramingSection agreed with each other; the
    // pricing page — the largest of the three and the only one with a Buy button — was never
    // read by this test, so it drifted alone. It listed "Daily progress reports" as a FREE
    // bullet while its own Pro column sold reporting, and while 2026-08-25 moved analytics and
    // printable reports behind ProGate. A teacher reads the free bullet, upgrades nothing,
    // opens the dashboard and meets an upsell for the thing the pricing page promised.
    //
    // The forbidden words are derived from the Pro config at runtime, never hardcoded: a test
    // that bans the literal "reports" goes stale the moment Pro sells something else, which is
    // exactly the hand-maintained-list failure it exists to prevent.
    const rows = freeRowsOnUpgradePage();
    expect(rows.length, 'could not parse freeFeatures out of the upgrade page').toBeGreaterThan(0);

    const proSells = getTierConfig('pro')
      .features.filter((f) => !/^Unlimited /.test(f) && f !== 'Everything in Free')
      .flatMap(contentWords);
    expect(proSells.length, 'Pro sells no nameable feature to check against').toBeGreaterThan(0);

    for (const row of rows.filter((r) => r.included)) {
      const shared = contentWords(row.text).filter((w) => proSells.includes(w));
      expect(
        shared,
        `the upgrade page gives away "${row.text}" for free, but Pro sells ${JSON.stringify(shared)}`,
      ).toEqual([]);
    }
  });

  it('advertises every free feature the config actually ships', () => {
    // The other half: drift can drop a real free feature as easily as invent one. Custom word
    // lists, duels and no-ads are what get a teacher to a first lesson — leaving them off the
    // free column makes the free tier look thinner than it is and the $9 harder to justify,
    // because the reader cannot see what the money adds ON TOP of.
    const shown = freeRowsOnUpgradePage()
      .filter((r) => r.included)
      .flatMap((r) => contentWords(r.text));

    const shipped = getTierConfig('free').features.filter((f) => !f.includes('{count}'));
    for (const feature of shipped) {
      const words = contentWords(feature);
      if (words.length === 0) continue; // a pure count row, covered by the interpolation tests
      expect(
        words.some((w) => shown.includes(w)),
        `free tier ships "${feature}" but the upgrade page never says so`,
      ).toBe(true);
    }
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

    // Retired 2026-08-25 with the free/Pro contradiction on the pricing page. Left in the
    // bundle they are live ammunition: a future edit reaches for a plausible-sounding
    // `dailyProgressReports` and re-promises for free the reporting ProGate refuses.
    for (const key of ['basicWordTracking', 'dailyProgressReports']) {
      expect(src, `${file} still has the retired key ${key}`).not.toContain(key);
    }
  });
});
