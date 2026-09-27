import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { locales } from '@/lib/i18n';

/**
 * Two independent ways the teacher-acquisition hero can ship broken. Both are
 * asserted against SOURCE, not a jsdom render, on purpose: jsdom does not
 * compute the fold and silently drops modern CSS, so a render-based version of
 * either check passes while the bug ships. Same reasoning as
 * `lib/__tests__/placeholderContrast.test.ts`.
 *
 * 1. Dark-on-dark copy. The section background was flipped from a
 *    `neo-cream → neo-white` gradient to `bg-neo-navy` without moving the
 *    foreground tokens with it, leaving the h1, the sub and both CTA notes at
 *    `text-neo-navy` on `bg-neo-navy` — an invisible headline on the page whose
 *    only job is converting teachers.
 *
 *    `text-neo-navy` is NOT banned outright here: it is the correct foreground
 *    for the `bg-neo-lime` CTA and `border-neo-navy` is a legitimate border.
 *    So this scopes to the copy elements rather than grepping the whole file.
 *
 * 2. Mock hoisted above the copy. `order-first` unprefixed applies at every
 *    breakpoint; `lg:order-none` only restores natural order at ≥1024px. The
 *    mock is already the second child of the `lg:grid-cols-2`, so the `lg:`
 *    half is a no-op and the pair's only effect is pushing the h1, the sub and
 *    the CTA below the fold on every viewport under 1024px. Verified on
 *    production at 390×844 in both `en` and `he`.
 */
const HERO = path.resolve(__dirname, '../EducationHero.tsx');

/** className string of the first element opened by `<tag`, e.g. `<h1`. */
function classNameOf(src: string, tag: string): string {
  const open = src.indexOf(`<${tag}`);
  if (open === -1) throw new Error(`no <${tag}> in EducationHero.tsx`);
  const match = /className="([^"]*)"/.exec(src.slice(open, open + 900));
  if (!match) throw new Error(`<${tag}> has no className`);
  return match[1];
}

describe('EducationHero', () => {
  const src = fs.readFileSync(HERO, 'utf8');
  const sectionIsDark = /<section[^>]*className="[^"]*bg-neo-navy/.test(src);

  it('does not put navy copy on a navy section', () => {
    expect(sectionIsDark, 'expected the hero section to be bg-neo-navy').toBe(true);

    // The h1 and the sub carry the value proposition. Neither may be navy.
    // The sub is addressed by its own `education-hero-sub` class rather than by
    // tag: the first <p> in the file is the pink eyebrow, so a `<p>` lookup
    // would assert against an element that was never navy and pass vacuously.
    const sub = /className="([^"]*education-hero-sub[^"]*)"/.exec(src)?.[1];
    expect(sub, 'no .education-hero-sub element found').toBeTruthy();

    for (const [label, cls] of [['h1', classNameOf(src, 'h1')], ['sub', sub!]]) {
      expect(
        cls,
        `${label} is navy-on-navy — invisible against bg-neo-navy`,
      ).not.toMatch(/text-neo-navy/);
    }
  });

  it('keeps every dimmed note legible on the dark ground', () => {
    // Opacity-dimmed navy is the same bug, quieter: `text-neo-navy/60` over
    // `bg-neo-navy` composites to the background itself.
    const dimmedNavy = src.match(/text-neo-navy\/\d+/g) ?? [];
    expect(
      dimmedNavy,
      `dimmed navy copy on a navy ground: ${dimmedNavy.join(', ')}`,
    ).toEqual([]);
  });

  it('derives its language claim from the shipped locale list', () => {
    // The hero advertised "EN / HE / SV / JA / ES" and "Built natively for 5
    // languages" while `lib/i18n.js` shipped six locales including `ru`. A Russian
    // teacher read a list that excluded them, on the page whose only job is getting
    // them to request access. Same hand-maintained-list shape as the classroom-create
    // Zod enum that 400'd every `es` teacher.
    //
    // Asserting "contains RU" would just restart the clock on the next locale, so the
    // requirement is that the claim is computed from `locales`, never spelled out.
    // Scoped to the two education-hero lines on purpose. `en.js` carries roughly ten
    // more "5 languages" claims in SEO descriptions and the about page; those are a
    // separate sweep and a whole-file assertion would fail on them.
    const en = fs
      .readFileSync(path.resolve(__dirname, '../../../translations/en.js'), 'utf8')
      .split('\n');

    const eyebrow = en.find((l) => l.includes('"eyebrow"') && /teacher/i.test(l));
    const sub = en.find((l) => l.includes('"sub"') && /classroom|word list/i.test(l));
    expect(eyebrow, 'could not locate the education hero eyebrow in en.js').toBeTruthy();
    expect(sub, 'could not locate the education hero sub in en.js').toBeTruthy();

    // The count is interpolated, so it can never disagree with what ships.
    expect(sub!, 'hero sub must interpolate {count}, not hardcode a number').toContain(
      '{count}',
    );
    expect(sub!, 'hero sub still hardcodes a language count').not.toMatch(
      /\b\d+ languages\b/i,
    );
    expect(src, 'hero must read the locale count from lib/i18n').toMatch(/\blocales\b/);

    // Tripwire. The eyebrow names the languages in each locale's own words
    // ("עברית, אנגלית…", "英語・ヘブライ語…"), which reads better than injected
    // ASCII codes — so it stays hand-written, and this fails when a seventh
    // locale ships so somebody has to go update that copy on purpose.
    expect(
      locales.length,
      'a locale was added or removed: update education.landing.hero.eyebrow in all '
      + `${locales.length} translation files, then bump this number`,
    ).toBe(6);
  });

  it('renders the copy before the product mock on mobile', () => {
    // Scan only what Tailwind actually compiles — the contents of className
    // strings. Scanning the whole file matches the word in an explanatory
    // comment and fails on prose, which is a false positive, not a bug.
    const classNames = [...src.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
    expect(classNames.length, 'no className attributes found').toBeGreaterThan(0);

    // Unprefixed `order-first` only — a `sm:`/`md:`/`lg:` prefixed order is fine.
    const offenders = classNames.filter((c) => /(?<![\w:-])order-first/.test(c));
    expect(
      offenders,
      `unprefixed \`order-first\` hoists the mock above the h1 and the CTA below 1024px: ${offenders.join(' | ')}`,
    ).toEqual([]);
  });
});
