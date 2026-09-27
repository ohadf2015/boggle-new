/**
 * Locale parity test: every Word Bridge (connections) Daily-Challenge and
 * Community translation key must exist as a non-empty string in all 5 locales.
 *
 * Regression guard for a prod bug found 2026-05-30 via live verification of
 * https://www.lexiclash.live/he/connections :
 *
 *   The landing CTA pills rendered the RAW KEYS "connections.daily.cta" and
 *   "connections.community.cta". Root cause: the `t()` call-sites shipped
 *   (PageClient + ConnectionsGame) but the entire `connections.daily` (12 keys)
 *   and `connections.community` (13 keys) sub-blocks were absent from en, he,
 *   ja and es on origin/master — they were dropped during a translation-file
 *   merge race while the component code merged cleanly. Only `sv` survived
 *   (its block landed in a standalone commit that did not collide).
 *
 * Why prior parity tests missed it: they assert locales MATCH the en reference.
 * Here en itself lost the keys, so there was no asymmetry to flag. This test
 * asserts the call-site keys RESOLVE in every locale — including en — which is
 * the property the daily/community surfaces actually depend on.
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

// The exact keys the Daily Challenge surface calls via t('connections.daily.*')
// (ConnectionsDailyChallenge, ConnectionsLeaderboard, PageClient, ConnectionsGame).
const DAILY_KEYS = [
  'title',
  'complete',
  'solved',
  'share',
  'copied',
  'guestName',
  'leaderboard',
  'loading',
  'empty',
  'players',
  'yourRank',
  'cta',
] as const;

// The exact keys the Community surface calls via t('connections.community.*')
// (ConnectionsCommunity, PageClient, ConnectionsGame).
const COMMUNITY_KEYS = [
  'title',
  'suggest',
  'suggestHint',
  'word1',
  'word2',
  'bridge',
  'submitBtn',
  'submitted',
  'submitFailed',
  'top',
  'empty',
  'upvote',
  'cta',
] as const;

const REQUIRED_KEYS: string[] = [
  ...DAILY_KEYS.map((k) => `connections.daily.${k}`),
  ...COMMUNITY_KEYS.map((k) => `connections.community.${k}`),
];

function resolve(dict: Record<string, unknown>, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, dict);
}

/**
 * Root-cause guard: a duplicate top-level `"connections": {` block would let JS
 * keep only the last one and silently drop the rich block (this is how the
 * practice surface broke on 2026-05-20). Catch any recurrence before it ships.
 */
describe('no duplicate top-level "connections" namespace', () => {
  for (const code of Object.keys(LOCALES)) {
    it(`${code}.js declares "connections" exactly once at top level`, () => {
      const src = readFileSync(join(TRANSLATIONS_DIR, `${code}.js`), 'utf8');
      const count = (src.match(/^ {2}"connections": \{/gm) ?? []).length;
      expect(count).toBe(1);
    });
  }
});

describe('connections daily/community locale parity', () => {
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
