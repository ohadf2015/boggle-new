/**
 * Single source of truth for which game modes are playable with NO network.
 *
 * Consumed by:
 *  - NetworkStatusHandler (route-aware offline gate — render game vs. fallback)
 *  - OfflineFallback       (which modes to offer when offline)
 *  - service-worker precache list (which route shells to cache for cold start)
 *
 * A mode belongs here only if its gameplay needs no live server: bundled data
 * (+ offline dict where words are validated) and queued score submission.
 *
 *  - blast        — engine validates against bundled level.words (+ offline dict for bonus)
 *  - connections  — puzzles load from bundled lib/connections/puzzles/generated/*
 *  - daily        — Daily Word Hunt / Word Wheel; bundled/prefetched puzzle + offline dict
 *  - adventure    — bundled level configs (lib/adventure) + cached→default progression +
 *                   offline completion queue (lib/adventure/offlineCompletionQueue)
 *  - brain        — 5 drills generate boards client-side; hub degrades gracefully offline
 *  - singleplayer — classic solo boggle; client-generated board + bundled/offline dict.
 *                   The BARE route 308-redirects to multiplayer, so the offline entry is
 *                   the preserved `?practice=1` path (see app/[locale]/singleplayer).
 *  - word-craft   — client-side tile game; EN/SV dicts bundled, HE/ES/JA dict cached after
 *                   one online load (see lib/word-craft/dictionary localStorage cache).
 *  - crossword    — bundled daily puzzles (lib/crossword/puzzles) + localStorage resume; the
 *                   board, clue nav and check/reveal are fully client-side.
 *  - wordfall     — Blast V2 ("Wordfall"); shares the `blast` segment but precaches its own
 *                   /blast/v2 shell. Levels build client-side from the bundled chain packs via
 *                   lib/blast/v2/offlineLevelResolver (zero network), guests persist progress
 *                   to localStorage, authed clears queue for replay on reconnect.
 *  - party        — same-screen pass-and-play Boggle (lib/party). Shared board per round,
 *                   sequential unique-word scoring, localStorage resume. No Socket.IO /
 *                   no Supabase during play; words via the offline dict path.
 *  - word-tower   — client-generated daily tower + loadWordCraftDictionary (same offline
 *                   dict as word-craft). Progress persists to localStorage; server writes
 *                   are fire-and-forget and not required to play.
 *  - sealed-bid   — bundled rack pool (lib/sealedBid/sp/rackPool) + chip wallet. Word check
 *                   is offline-first (memory cache → offline store → live API).
 *
 * Both crossword and wordfall were previously admin-only `force-dynamic` routes (404 for
 * non-admins → no precache-able shell). Their play routes now render for everyone, so the SW
 * can precache a real shell and a rider can launch them offline.
 */

import { locales } from '@/i18n/config';

/**
 * Metadata for one offline-capable mode. `segment` is the first route segment
 * (after the locale); `entry()` builds the full href used by the launcher and
 * the SW precache list — it may include a query string (e.g. ?practice=1) when
 * the bare route would redirect.
 */
export interface OfflineMode {
  /** First route segment after the locale, e.g. 'blast'. */
  segment: string;
  /** i18n key for the OfflineFallback launcher button. */
  labelKey: string;
  /** Full href to open the mode in a given locale. */
  entry: (locale: string) => string;
}

const localePath =
  (segment: string) =>
  (locale: string): string =>
    `/${locale}/${segment}`;

export const OFFLINE_MODES: readonly OfflineMode[] = [
  { segment: 'blast', labelKey: 'native.offline.playBlast', entry: localePath('blast') },
  { segment: 'connections', labelKey: 'native.offline.playConnections', entry: localePath('connections') },
  { segment: 'daily', labelKey: 'native.offline.playDaily', entry: localePath('daily') },
  { segment: 'adventure', labelKey: 'native.offline.playAdventure', entry: localePath('adventure') },
  { segment: 'brain', labelKey: 'native.offline.playBrain', entry: localePath('brain') },
  {
    segment: 'singleplayer',
    labelKey: 'native.offline.playClassic',
    // Bare /singleplayer redirects to multiplayer; ?practice=1 opens the solo game.
    entry: (locale) => `/${locale}/singleplayer?practice=1`,
  },
  { segment: 'word-craft', labelKey: 'native.offline.playWordCraft', entry: localePath('word-craft') },
  { segment: 'crossword', labelKey: 'native.offline.playCrossword', entry: localePath('crossword') },
  {
    // Wordfall (Blast V2) shares the `blast` segment for the offline-capable
    // route gate, but precaches/links its own /blast/v2 shell.
    segment: 'blast',
    labelKey: 'native.offline.playWordfall',
    entry: (locale) => `/${locale}/blast/v2`,
  },
  { segment: 'party', labelKey: 'native.offline.playParty', entry: localePath('party') },
  { segment: 'word-tower', labelKey: 'native.offline.playWordTower', entry: localePath('word-tower') },
  { segment: 'sealed-bid', labelKey: 'native.offline.playSealedBid', entry: localePath('sealed-bid') },
] as const;

/** Segment list — preserved for backward compatibility with existing callers. */
export const OFFLINE_CAPABLE_MODES = OFFLINE_MODES.map((m) => m.segment);

export type OfflineCapableMode = (typeof OFFLINE_CAPABLE_MODES)[number];

const CAPABLE_SET: ReadonlySet<string> = new Set(OFFLINE_CAPABLE_MODES);
const LOCALE_SET: ReadonlySet<string> = new Set(locales);

/**
 * Extract the route's first meaningful segment, stripping a leading locale.
 * Returns '' for the bare root or a locale-only home path.
 */
function firstSegmentAfterLocale(pathname: string): string {
  // Drop query/hash, then split into clean segments.
  const path = pathname.split(/[?#]/)[0] ?? '';
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return '';
  // Strip a leading locale segment if present (e.g. /en/blast -> blast).
  const start = LOCALE_SET.has(segments[0]) ? 1 : 0;
  return segments[start] ?? '';
}

/**
 * True when the given pathname routes into a mode that works fully offline.
 * Exact segment match — '/en/blast-tips' is NOT the blast game.
 */
export function isOfflineCapable(pathname: string): boolean {
  return CAPABLE_SET.has(firstSegmentAfterLocale(pathname));
}

/**
 * Concrete locale-prefixed entry hrefs for every offline-capable mode.
 * Used to build the service-worker precache list (locales × modes). Includes
 * query strings where the bare route would redirect (e.g. singleplayer).
 */
export function offlineCapableRoutes(): string[] {
  const routes: string[] = [];
  for (const loc of locales) {
    for (const mode of OFFLINE_MODES) {
      routes.push(mode.entry(loc));
    }
  }
  return routes;
}
