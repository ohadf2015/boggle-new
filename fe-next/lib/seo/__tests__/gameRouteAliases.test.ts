/**
 * `/play` and `/room` are the two URLs a person types when they want to get
 * into a word game, and neither has ever been a route: `app/[locale]` swallows
 * `/play` as a locale segment and renders the word-validation 404, `/room`
 * lands on the generic one. Both are dead ends at the top of the funnel.
 *
 * Aliases, not canonical moves — `permanent: false`, so making either a real
 * page later is not blocked by a 301 cached in every browser that probed it.
 */

import { describe, it, expect } from 'vitest';
import { GAME_ROUTE_ALIASES } from '@/lib/seo/gameRouteAliases.mjs';

interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

const rules = GAME_ROUTE_ALIASES as RedirectRule[];
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

describe('game route aliases', () => {
  it('sends /play to the solo game and /room to multiplayer, per locale', () => {
    for (const alias of ['play', 'room'] as const) {
      const rule = rules.find((r) => r.source.endsWith(`/${alias}`) && r.source.includes(':locale'));
      expect(rule, `missing locale rule for /${alias}`).toBeDefined();
      expect(rule?.destination).toBe(
        alias === 'play' ? '/:locale/quick-play?mode=random' : '/:locale/multiplayer',
      );
    }
  });

  it('covers the locale-less shapes too', () => {
    expect(rules.find((r) => r.source === '/play')?.destination).toBe(
      '/en/quick-play?mode=random',
    );
    expect(rules.find((r) => r.source === '/room')?.destination).toBe('/en/multiplayer');
  });

  it('sends shared /room/CODE invites to the join page, like the apps do', () => {
    expect(rules.find((r) => r.source.endsWith('/room/:code') && r.source.includes(':locale'))?.destination).toBe(
      '/:locale/join/:code',
    );
    expect(rules.find((r) => r.source === '/room/:code')?.destination).toBe('/en/join/:code');
  });

  it('lists every supported locale in the alternation', () => {
    for (const rule of rules.filter((r) => r.source.includes(':locale'))) {
      const group = rule.source.match(/:locale\(([^)]+)\)/)?.[1]?.split('|');
      expect(group).toEqual(LOCALES);
    }
  });

  it('sends /multiplayer/join to the code entry page', () => {
    expect(rules.find((r) => r.source.endsWith('/multiplayer/join') && r.source.includes(':locale'))?.destination).toBe(
      '/:locale/join',
    );
    expect(rules.find((r) => r.source.endsWith('/multiplayer/join/:code'))?.destination).toBe('/:locale/join/:code');
    expect(rules.find((r) => r.source === '/multiplayer/join')?.destination).toBe('/en/join');
  });

  it('sends /ranks to the leaderboard, per locale and bare', () => {
    // The nav labels the page "Ranks" but the route is /leaderboard — typed
    // /ranks 404'd on every locale.
    expect(rules.find((r) => r.source.endsWith('/ranks') && r.source.includes(':locale'))?.destination).toBe(
      '/:locale/leaderboard',
    );
    expect(rules.find((r) => r.source === '/ranks')?.destination).toBe('/en/leaderboard');
  });

  it('stays a temporary alias so /play can become a real page', () => {
    for (const rule of rules) expect(rule.permanent).toBe(false);
  });

  it('matches the exact segment — never shadows /connections/play or the boggle landing', () => {
    // A `:rest*` or prefix shape here would eat `/en/connections/play` and
    // `/en/play-boggle-online-free`, both real pages.
    for (const rule of rules) {
      expect(rule.source).toMatch(/^(\/:locale\(.+\))?\/(play|room|room\/:code|ranks|multiplayer\/join|multiplayer\/join\/:code)$/);
    }
  });
});
