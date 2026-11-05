/**
 * `/play` and `/room` are the two URLs a person types when they want to get
 * into a word game, and neither has ever been a route: `app/[locale]` swallows
 * `/play` as a locale segment and renders the word-validation 404, `/room`
 * lands on the generic one. Both are dead ends at the top of the funnel.
 *
 * `/ranks` is the same class from the other direction: the nav label is
 * "Ranks", so users (and older deploys' nav) hit /[locale]/ranks, which never
 * resolved — QA 2026-11-05 caught live /en/ranks → 404. It aliases to the
 * canonical /leaderboard.
 *
 * Aliases, not canonical moves — `permanent: false`, so making any of them a
 * real page later is not blocked by a 301 cached in every browser that
 * probed it.
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
      // ?autoStart=bots, not bare /singleplayer — see redirectLogic.ts: bare
      // entries are resolved to bots on the client, and carrying the param
      // skips that hop.
      expect(rule?.destination).toBe(
        alias === 'play' ? '/:locale/singleplayer?autoStart=bots' : '/:locale/multiplayer',
      );
    }
  });

  it('covers the locale-less shapes too', () => {
    expect(rules.find((r) => r.source === '/play')?.destination).toBe(
      '/en/singleplayer?autoStart=bots',
    );
    expect(rules.find((r) => r.source === '/room')?.destination).toBe('/en/multiplayer');
  });

  it('sends shared /room/CODE invites to the join page, like the apps do', () => {
    expect(rules.find((r) => r.source.endsWith('/room/:code') && r.source.includes(':locale'))?.destination).toBe(
      '/:locale/join/:code',
    );
    expect(rules.find((r) => r.source === '/room/:code')?.destination).toBe('/en/join/:code');
  });

  it('sends /ranks to the leaderboard, per locale and bare', () => {
    // QA 2026-11-05: the global nav "Ranks" tab linked /en/ranks on every page
    // and it 404'd — the leaderboard is the retention hook, so the alias lands
    // on the canonical page instead of the 404.
    const localeRule = rules.find((r) => r.source.endsWith('/ranks') && r.source.includes(':locale'));
    expect(localeRule?.destination).toBe('/:locale/leaderboard');
    expect(rules.find((r) => r.source === '/ranks')?.destination).toBe('/en/leaderboard');
  });

  it('lists every supported locale in the alternation', () => {
    for (const rule of rules.filter((r) => r.source.includes(':locale'))) {
      const group = rule.source.match(/:locale\(([^)]+)\)/)?.[1]?.split('|');
      expect(group).toEqual(LOCALES);
    }
  });

  it('stays a temporary alias so /play can become a real page', () => {
    for (const rule of rules) expect(rule.permanent).toBe(false);
  });

  it('matches the exact segment — never shadows /connections/play or the boggle landing', () => {
    // A `:rest*` or prefix shape here would eat `/en/connections/play` and
    // `/en/play-boggle-online-free`, both real pages.
    for (const rule of rules) {
      expect(rule.source).toMatch(/^(\/:locale\(.+\))?\/(play|room|room\/:code|ranks)$/);
    }
  });
});
