/**
 * Single source of truth for which game modes are playable with NO network.
 *
 * Consumed by:
 *  - NetworkStatusHandler (route-aware offline gate — render game vs. fallback)
 *  - OfflineLauncher (which modes to offer when offline)
 *  - service-worker precache list (which route shells to cache for cold start)
 *
 * Keep this list conservative: a mode belongs here only if its gameplay needs
 * no live server (bundled data + offline dict + queued score submission).
 *  - blast        — engine validates against bundled level.words (+ offline dict for bonus)
 *  - connections  — puzzles load from bundled lib/connections/puzzles/generated/*
 *  - daily        — Daily Word Hunt; bundled/prefetched puzzle + offline dict
 */

import { locales } from '@/i18n/config';

export const OFFLINE_CAPABLE_MODES = ['blast', 'connections', 'daily'] as const;

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
 * Concrete locale-prefixed paths for every offline-capable mode.
 * Used to build the service-worker precache list (locales × modes).
 */
export function offlineCapableRoutes(): string[] {
  const routes: string[] = [];
  for (const loc of locales) {
    for (const mode of OFFLINE_CAPABLE_MODES) {
      routes.push(`/${loc}/${mode}`);
    }
  }
  return routes;
}
