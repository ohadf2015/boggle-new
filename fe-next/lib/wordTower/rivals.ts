/**
 * Word Tower — rival record markers (pure, renderer-agnostic).
 *
 * Founder: show other players' towers so the climber wants to pass them. Each
 * rival is a leaderboard record at a height; its marker line is placed on the
 * same altitude scale as the parallax backdrop, so as you climb you literally
 * rise past their record. Crossing one fires a "passed!" celebration.
 */

import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface RivalMarker {
  id: string;
  name: string;
  /** The rival's record height (m). */
  heightM: number;
  /** Stable user id (for self-exclusion + the Avatar's seeded fallback). */
  playerId?: string;
  /** Highest zone the rival reached — themes their ghost tower's material. */
  highestBiome?: WordTowerBiomeId;
  /** The rival's REAL generated avatar (their identity face) — rendered via the
   *  shared <Avatar>. Falls back to the seeded face from `playerId` when absent.
   *  Replaces the old flat emoji+colour chip. */
  customAvatar?: CustomAvatarConfig | null;
  avatarImage?: string | null;
  /** Legacy emoji+colour — kept as a last-resort fallback only. */
  avatarEmoji?: string | null;
  avatarColor?: string | null;
}

/** One leaderboard row as returned by `/api/word-tower/leaderboard`. */
export interface LeaderboardRivalRow {
  rank?: number;
  playerId?: string;
  isYou?: boolean;
  username?: string;
  bestHeightM?: number;
  highestBiome?: string;
  avatarConfig?: CustomAvatarConfig | null;
  avatarImage?: string | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
}

const KNOWN_BIOMES = new Set(['city', 'sky', 'stratosphere', 'orbit', 'nebula', 'galaxy']);

/**
 * Map raw leaderboard rows → rival markers. Excludes the viewer themselves (the
 * API flags `isYou`) so you never "pass yourself", drops records with no climb,
 * and carries the zone + avatar so the ghost tower can be themed. Real data only.
 */
export function rivalsFromLeaderboard(rows: ReadonlyArray<LeaderboardRivalRow>, max = 8): RivalMarker[] {
  return rows
    .filter((r) => !r.isYou && Number(r.bestHeightM) > 0)
    .slice(0, max)
    .map((r, i) => ({
      id: r.playerId ?? String(r.rank ?? i),
      playerId: r.playerId,
      name: String(r.username ?? 'Player'),
      heightM: Number(r.bestHeightM),
      highestBiome: (KNOWN_BIOMES.has(String(r.highestBiome)) ? r.highestBiome : 'city') as WordTowerBiomeId,
      customAvatar: r.avatarConfig ?? null,
      avatarImage: r.avatarImage ?? null,
      avatarEmoji: r.avatarEmoji ?? null,
      avatarColor: r.avatarColor ?? null,
    }));
}

export interface PositionedRival extends RivalMarker {
  /** Screen-y (px) of the rival's record line for the current viewer altitude. */
  screenY: number;
}

/**
 * Screen-y for a rival's record line. The viewer's live tower top sits at
 * `buildLineY`; a higher record floats above it (smaller y), a record you've
 * passed sinks below (larger y). Same `pxPerM` as the parallax backdrop so the
 * marker scrolls in lockstep with the world.
 */
export function rivalScreenY(rivalHeightM: number, viewerHeightM: number, buildLineY: number, pxPerM: number): number {
  return buildLineY + (viewerHeightM - rivalHeightM) * pxPerM;
}

/** The next rival record still above the viewer, plus the metres left to pass it. */
export interface ChaseTarget extends RivalMarker {
  /** Metres the viewer still needs to climb to overtake this rival (≥ 1, rounded up). */
  gapM: number;
}

/**
 * The closest rival the viewer has NOT yet passed — the live chase target. The
 * rail only draws rivals whose record line is on-screen, so a record far above
 * is invisible; this surfaces it as a "↑ Ann +8m" goal that never leaves the HUD
 * until you overtake it. A rival at exactly the viewer's height counts as
 * already reached (chase the next one up), and the gap is rounded UP so it never
 * reads "+0m" while the rival is still in front. Returns null once nothing is left.
 */
export function nearestRivalAbove(viewerHeightM: number, rivals: ReadonlyArray<RivalMarker>): ChaseTarget | null {
  let best: RivalMarker | null = null;
  for (const r of rivals) {
    if (r.heightM <= viewerHeightM) continue; // already reached / overtaken
    if (best === null || r.heightM < best.heightM) best = r;
  }
  if (best === null) return null;
  return { ...best, gapM: Math.max(1, Math.ceil(best.heightM - viewerHeightM)) };
}

export interface RailRival extends RivalMarker {
  /** Draw position (px), CLAMPED into [topMargin, buildLineY]. */
  screenY: number;
  /** True when the rival's record is above the top edge (show a chase chip). */
  pinnedAbove: boolean;
  /** Metres still to climb to reach the rival (0 once level/passed). */
  gapM: number;
}

/**
 * Every rival, always drawn (#2). The record line is clamped so it can never sit
 * BELOW our own tower top (`buildLineY`) — a rival you've passed pins at the
 * build line instead of sinking away, and a rival far above pins at the top edge
 * (`pinnedAbove`) so it stays on-screen with a "+Xm" chase chip. Unlike
 * {@link visibleRivalMarkers}, nothing is culled — the founder wants a rival's
 * tower visible for as long as it exists.
 */
export function railRivals(
  viewerHeightM: number,
  rivals: ReadonlyArray<RivalMarker>,
  buildLineY: number,
  pxPerM: number,
  topMargin = 56,
): RailRival[] {
  return rivals.map((r) => {
    const rawY = rivalScreenY(r.heightM, viewerHeightM, buildLineY, pxPerM);
    const screenY = Math.max(topMargin, Math.min(rawY, buildLineY));
    return {
      ...r,
      screenY,
      pinnedAbove: rawY < topMargin,
      gapM: Math.max(0, Math.ceil(r.heightM - viewerHeightM)),
    };
  });
}

/** Rivals overtaken as the viewer climbs from `prevHeightM` to `curHeightM`. */
export function rivalsPassed(prevHeightM: number, curHeightM: number, rivals: ReadonlyArray<RivalMarker>): RivalMarker[] {
  if (curHeightM <= prevHeightM) return [];
  return rivals.filter((r) => r.heightM > prevHeightM && r.heightM <= curHeightM);
}

/** Rivals whose record line is on (or just off) the screen, with their screen-y. */
export function visibleRivalMarkers(
  viewerHeightM: number,
  rivals: ReadonlyArray<RivalMarker>,
  buildLineY: number,
  viewportH: number,
  pxPerM: number,
  margin = 48,
): PositionedRival[] {
  const out: PositionedRival[] = [];
  for (const r of rivals) {
    const screenY = rivalScreenY(r.heightM, viewerHeightM, buildLineY, pxPerM);
    if (screenY >= -margin && screenY <= viewportH + margin) out.push({ ...r, screenY });
  }
  return out;
}
