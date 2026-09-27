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
 * Translating a Next `source` to a RegExp has one trap worth spelling out — a
 * naive `:param` pass eats the `:en` inside an already-expanded `(?:en|he|…)`
 * group and yields a pattern that silently matches the wrong things. So the
 * locale alternation is substituted LAST, after the generic params are gone.
 */
function sourceToRegExp(source: string): RegExp {
  const LOCALE_TOKEN = 'LOCALE_ALTERNATION_TOKEN';
  let alternation = '';
  const pattern = source
    .replace(/:locale\(([^)]+)\)/, (_m, group: string) => {
      alternation = group;
      return LOCALE_TOKEN;
    })
    .replace(/:\w+\*/g, '.*')
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

  it('sends the practice hub to the real single-player game', () => {
    const rule = match(rules(), '/en/practice');
    expect(rule).toBeDefined();
    expect(rule?.destination).toBe('/:locale/singleplayer');
    expect(rule?.permanent).toBe(true);
  });

  it('sends each mode to the real game it was wrapping', () => {
    const all = rules();
    expect(match(all, '/en/practice/classic')?.destination).toBe('/:locale/singleplayer');
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

  it('covers every supported locale, not just English', () => {
    const all = rules();
    for (const locale of ['he', 'sv', 'ja', 'es', 'ru']) {
      expect(match(all, `/${locale}/practice`)).toBeDefined();
      expect(match(all, `/${locale}/practice/wheelRush`)?.destination).toBe(
        '/:locale/daily/word-wheel',
      );
    }
  });
});
