/**
 * Practice is retired. The routes must REDIRECT, not 404.
 *
 * Nothing in the app links to them any more (steps 1 and 2 removed the
 * onboarding exit, the landing cards and the blog CTA), but /practice and
 * /practice/<mode> have been live for months — they are in browser histories,
 * bookmarks, shared links and old Play-listing screenshots. A 404 turns each of
 * those into a dead end for the exact cohort we are trying to get INTO the game.
 *
 * Destinations are per-mode rather than one blanket bounce, because each
 * practice mode was a wrapper around a specific real game: sending a wheel link
 * to the classic board is a worse landing than the 404 it replaces.
 *
 * Both practice pages are already `robots: noindex, follow`, so nothing is lost
 * in search by removing them — these redirects exist purely for humans holding
 * an old link.
 */

import { describe, it, expect } from 'vitest';
import { RETIRED_PRACTICE_REDIRECTS } from '@/lib/seo/retiredPracticeRedirects.mjs';

interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

function rules(): RedirectRule[] {
  return RETIRED_PRACTICE_REDIRECTS as RedirectRule[];
}

/**
 * Resolve a concrete path through the rules the way Next does: first match wins.
 *
 * Translating a Next `source` to a RegExp has two traps worth spelling out:
 *
 * 1. A naive `:param` pass eats the `:en` inside an already-expanded `(?:en|he|…)`
 *    group and yields a pattern that silently matches the wrong things. So the
 *    locale alternation is substituted LAST, after the generic params are gone.
 *
 * 2. Next's optional catch-all `:param*` matches ZERO or more segments — including
 *    the bare parent path with no trailing slash/segment. A naive `:*` → `.*`
 *    after a required `/` does NOT match `/en/practice`, so a hub rule listed
 *    AFTER a `:rest*` catch-all would falsely pass here while Next would send
 *    `/en/practice` to the catch-all (bare singleplayer / bots). Map `/ :param*`
 *    to `(?:/.*)?` so that regression is caught. Prefer `:param+` in the real
 *    rules so the catch-all cannot swallow the hub even if order slips.
 */
function sourceToRegExp(source: string): RegExp {
  const LOCALE_TOKEN = 'LOCALE_ALTERNATION_TOKEN';
  let alternation = '';
  const pattern = source
    .replace(/:locale\(([^)]+)\)/, (_m, group: string) => {
      alternation = group;
      return LOCALE_TOKEN;
    })
    // Optional catch-all (:param*) — zero or more segments, like Next.
    .replace(/\/:\w+\*/g, '(?:/.*)?')
    // Required catch-all (:param+) — one or more segments.
    .replace(/\/:\w+\+/g, '/.+')
    .replace(/:\w+/g, '[^/]+')
    .replace(LOCALE_TOKEN, `(?:${alternation})`);
  return new RegExp(`^${pattern}$`);
}

function match(all: RedirectRule[], path: string): RedirectRule | undefined {
  return all.find((r) => sourceToRegExp(r.source).test(path));
}

describe('retired practice routes', () => {
  // Guard on the matcher itself. An earlier version of sourceToRegExp mangled
  // the locale group into a top-level alternation, which matched almost any
  // path and made every assertion below pass for the wrong reason.
  it('matches only practice paths — the matcher is not a rubber stamp', () => {
    const all = rules();
    expect(match(all, '/en')).toBeUndefined();
    expect(match(all, '/en/singleplayer')).toBeUndefined();
    expect(match(all, '/en/daily/word-wheel')).toBeUndefined();
    expect(match(all, '/practice')).toBeUndefined(); // no locale segment
    expect(match(all, '/de/practice')).toBeUndefined(); // unsupported locale
  });

  it('sends the practice hub to a coached single-player round (not bots)', () => {
    // Live bug after #1229: catch-all `:rest*` before the hub made
    // GET /en/practice → 308 /en/singleplayer (bots). Intent + classic sibling
    // both require ?autoStart=coach.
    const rule = match(rules(), '/en/practice');
    expect(rule).toBeDefined();
    expect(rule?.destination).toBe('/:locale/singleplayer?autoStart=coach');
    expect(rule?.permanent).toBe(true);
  });

  it('sends each mode to the real game it was wrapping', () => {
    const all = rules();
    expect(match(all, '/en/practice/classic')?.destination).toBe('/:locale/singleplayer?autoStart=coach');
    expect(match(all, '/en/practice/wordHunt')?.destination).toBe('/:locale/daily/word-hunt');
    expect(match(all, '/en/practice/wheelRush')?.destination).toBe('/:locale/daily/word-wheel');
  });

  it('catches any other practice path rather than 404ing it', () => {
    // e.g. /practice/brain, which SixModeTour still links and which was never
    // even a valid practice mode.
    const rule = match(rules(), '/en/practice/brain');
    expect(rule).toBeDefined();
    expect(rule?.destination).toBe('/:locale/singleplayer');
  });

  it('lists hub before catch-all and uses :rest+ so order cannot swallow the hub', () => {
    const all = rules();
    const hubIdx = all.findIndex((r) => r.source.endsWith('/practice'));
    const catchIdx = all.findIndex((r) => /:rest[+*]/.test(r.source));
    expect(hubIdx).toBeGreaterThanOrEqual(0);
    expect(catchIdx).toBeGreaterThanOrEqual(0);
    expect(hubIdx).toBeLessThan(catchIdx);
    expect(all[catchIdx]?.source).toMatch(/:rest\+/);
  });

  it('covers every supported locale, not just English', () => {
    const all = rules();
    for (const locale of ['he', 'sv', 'ja', 'es', 'ru']) {
      expect(match(all, `/${locale}/practice`)?.destination).toBe(
        '/:locale/singleplayer?autoStart=coach',
      );
      expect(match(all, `/${locale}/practice/wheelRush`)?.destination).toBe(
        '/:locale/daily/word-wheel',
      );
    }
  });
});
