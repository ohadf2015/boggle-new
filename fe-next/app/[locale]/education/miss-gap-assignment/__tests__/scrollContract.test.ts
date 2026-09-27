/**
 * The scroll contract for every miss-gap route, pinned as source shape.
 *
 * Why a source-shape test and not a render test: these are async server
 * components, jsdom has no layout, and the bug is CSS geometry — a rendering
 * test here would pass vacuously while the page scrolled 441px in a real
 * browser. What CAN be pinned cheaply is the three-part contract that the live
 * measurement showed is necessary and sufficient, because each part has already
 * been got wrong once:
 *
 *  1. `MissGapShellLock` is mounted. Without it `<body>` keeps `.screen-fit`
 *     plus the bottom-nav / cookie-sheet `padding-bottom` — 441px measured at
 *     390x844, for a 1285px document against an 844px viewport. That is HEIGHT,
 *     not overflow, so no `overflow` rule can remove it.
 *  2. No `<style>` tag writing `html{overflow:hidden}`. That was the previous
 *     attempt; `app/globals.css:2853` declares `html { overflow: visible
 *     !important }` and wins on order, so it was dead code that read as
 *     protection — pitfalls Class 4 exactly.
 *  3. The shell takes the space it is given (`flex-1 min-h-0`) rather than a
 *     fixed `100dvh`/`min-h-dvh`, and exactly one inner region scrolls, tagged
 *     `edu-shell-scroll` so globals.css moves the cookie-sheet clearance there.
 *
 * Verified against the pre-fix source: every one of these assertions fails on
 * the version that shipped into the round the critic rejected.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROUTES = [
  'miss-gap-assignment',
  'miss-gap-practice',
  'miss-gap-grade-passback',
  'miss-gap-whatsapp',
] as const;

function source(route: string): string {
  return readFileSync(
    join(process.cwd(), 'app', '[locale]', 'education', route, 'page.tsx'),
    'utf8',
  );
}

describe.each(ROUTES)('%s — page scroll contract', (route) => {
  const src = source(route);

  it('mounts the education shell lock', () => {
    // Props allowed, mount required. This used to demand the literal
    // `<MissGapShellLock />`, which went red the moment the assignment route
    // started passing `chromeFree` — a false failure about formatting, not
    // about the contract, which is only ever "the lock is mounted on this
    // route". The nav flag is asserted where it belongs, in pageShell.test.tsx.
    expect(src).toMatch(/<MissGapShellLock(\s[^>]*)?\/>/);
    expect(src).toContain("from '@/components/education/missGap/MissGapShellLock'");
  });

  it('drops the player bottom nav — every miss-gap route is a link destination', () => {
    // Measured at 390x844 on 2026-09-12: practice, whatsapp and grade-passback
    // each rendered the global PLAYER nav (QUESTS / FRIENDS / HOME), three
    // borderless controls on navy (`edgeRatio 0`) and three of the four
    // contrast flags on each screen. None of the four routes is a tab
    // destination — a teacher arrives from the results card, a student or
    // parent from a share link — so the nav is wrong chrome as well as a
    // failing control. The assignment route replaces it with `MissGapExitLink`;
    // the three leaf cards carry their own actions and need nothing.
    expect(src).toMatch(/<MissGapShellLock\s+chromeFree\s*\/>/);
  });

  it('does not hand-roll a document overflow lock that globals.css overrides', () => {
    expect(src).not.toMatch(/<style>/);
    expect(src).not.toMatch(/html\s*,\s*body\s*\{/);
  });

  it('lets the shell take the space it is given instead of pinning a viewport height', () => {
    expect(src).toContain('flex-1 min-h-0');
    expect(src).not.toMatch(/className="min-h-dvh/);
    expect(src).not.toMatch(/className="h-dvh/);
  });

  it('marks exactly one inner scroll region', () => {
    // Count class attributes, not mentions — the comment above the shell names
    // the class too, and two scrollers on one screen is the actual failure this
    // guards (a page that scrolls in two places reads as a page that scrolls).
    const matches = src.match(/className="[^"]*\bedu-shell-scroll\b/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(src).toMatch(/className="[^"]*\bedu-shell-scroll\b[^"]*overflow-y-auto/);
  });
});
