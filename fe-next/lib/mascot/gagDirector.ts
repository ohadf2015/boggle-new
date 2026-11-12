import { GAG_CATALOG } from './gagCatalog';
import type { GagBeat, GagContext, GagDef, GagEvent, GagVariant } from './gagTypes';

export const MAX_GAGS_PER_ROUND = 3;
export const MAX_GAGS_PER_SESSION = 10;
export const GAG_GAP_MS = 8000;

export interface GagHistory {
  lastVariant: Record<string, string>;
  stage: Record<string, number>;
  dailyShownOn: Record<string, string>;
  lastPlayedAt: number | null;
}

export function createGagHistory(): GagHistory {
  return { lastVariant: {}, stage: {}, dailyShownOn: {}, lastPlayedAt: null };
}

export interface GagLimits {
  shownThisRound: number;
  shownThisSession: number;
  lastShownAt: number | null;
}

export interface GagPick {
  gag: GagDef;
  variant: GagVariant;
  history: GagHistory;
}

function pickVariant(gag: GagDef, history: GagHistory, rng: () => number): GagVariant | null {
  if (gag.running) return gag.variants[history.stage[gag.id] ?? 0] ?? null;
  const fresh = gag.variants.filter((v) => v.id !== history.lastVariant[gag.id]);
  if (fresh.length === 0) return null;
  return fresh[Math.floor(rng() * fresh.length)];
}

export function pickGag(
  event: GagEvent,
  ctx: GagContext,
  limits: GagLimits,
  history: GagHistory,
  rng: () => number,
  now: number,
  dayKey: string,
  catalog: readonly GagDef[] = GAG_CATALOG,
): GagPick | null {
  if (limits.shownThisRound >= MAX_GAGS_PER_ROUND) return null;
  if (limits.shownThisSession >= MAX_GAGS_PER_SESSION) return null;
  for (const gag of catalog) {
    if (!gag.matches(event, ctx)) continue;
    const tooSoon = limits.lastShownAt !== null && now - limits.lastShownAt < GAG_GAP_MS;
    if (tooSoon && !gag.ignoresGap) continue;
    if (gag.daily && history.dailyShownOn[gag.id] === dayKey) continue;
    const variant = pickVariant(gag, history, rng);
    if (!variant) continue;
    if (rng() >= gag.chance) continue;
    return {
      gag,
      variant,
      history: {
        ...history,
        lastVariant: { ...history.lastVariant, [gag.id]: variant.id },
        stage: gag.running ? { ...history.stage, [gag.id]: (history.stage[gag.id] ?? 0) + 1 } : history.stage,
        dailyShownOn: gag.daily ? { ...history.dailyShownOn, [gag.id]: dayKey } : history.dailyShownOn,
      },
    };
  }
  return null;
}

export function variantDurationMs(variant: GagVariant): number {
  return variant.beats.reduce((sum, beat) => sum + beat.ms, 0);
}

export function beatIndexAt(variant: GagVariant, elapsedMs: number): number {
  let end = 0;
  for (let i = 0; i < variant.beats.length; i++) {
    end += variant.beats[i].ms;
    if (elapsedMs < end) return i;
  }
  return -1;
}

/** Stretches the freeze so the slide-off lands just before the clock hits 0. */
export function fitToRemaining(variant: GagVariant, msLeft: number): GagVariant {
  const others = variant.beats.filter((b) => b.phase !== 'freeze').reduce((s, b) => s + b.ms, 0);
  const hold = Math.max(msLeft - others - 150, 0);
  let assigned = false;
  const beats: GagBeat[] = variant.beats.map((b) => {
    if (b.phase !== 'freeze') return b;
    const ms = assigned ? 0 : hold;
    assigned = true;
    return { ...b, ms };
  });
  return { ...variant, beats };
}

export function daysBetween(earlier: number, later: number): number {
  return Math.floor((later - earlier) / 86_400_000);
}

export function localDayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
