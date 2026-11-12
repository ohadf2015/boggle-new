import { GAG_CATALOG } from './gagCatalog';
import type { GagBeat, GagContext, GagDef, GagEvent, GagVariant } from './gagTypes';

export const MAX_GAGS_PER_ROUND = 3;
export const MAX_GAGS_PER_SESSION = 10;
export const GAG_GAP_MS = 8000;

export interface GagSession {
  id: string;
  stage: Record<string, number>;
  shown: string[];
}

export interface GagHistory {
  lastVariant: Record<string, string>;
  stage: Record<string, number>;
  dailyShownOn: Record<string, string>;
  /** Per daily group: the gag that took the group's last daily slot. */
  dailyLast: Record<string, string>;
  lastPlayedAt: number | null;
  session: GagSession;
}

export function createGagSession(id = ''): GagSession {
  return { id, stage: {}, shown: [] };
}

export function createGagHistory(): GagHistory {
  return { lastVariant: {}, stage: {}, dailyShownOn: {}, dailyLast: {}, lastPlayedAt: null, session: createGagSession() };
}

export function forSession(history: GagHistory, sessionId: string): GagHistory {
  return history.session.id === sessionId ? history : { ...history, session: createGagSession(sessionId) };
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

function stagesFor(gag: GagDef, history: GagHistory): Record<string, number> {
  return gag.perSession ? history.session.stage : history.stage;
}

function pickVariant(gag: GagDef, history: GagHistory, rng: () => number): GagVariant | null {
  if (gag.running) return gag.variants[stagesFor(gag, history)[gag.id] ?? 0] ?? null;
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
  const capped = limits.shownThisRound >= MAX_GAGS_PER_ROUND || limits.shownThisSession >= MAX_GAGS_PER_SESSION;
  for (const gag of catalog) {
    if (capped && !gag.interrupts) continue;
    if (!gag.matches(event, ctx)) continue;
    const tooSoon = limits.lastShownAt !== null && now - limits.lastShownAt < GAG_GAP_MS;
    if (tooSoon && !gag.ignoresGap) continue;
    if (gag.after && !history.session.shown.includes(gag.after)) continue;
    const dailyKey = gag.dailyGroup ?? gag.id;
    if (gag.daily && history.dailyShownOn[dailyKey] === dayKey) continue;
    if (gag.dailyGroup && history.dailyLast[gag.dailyGroup] === gag.id) continue;
    const variant = pickVariant(gag, history, rng);
    if (!variant) continue;
    if (rng() >= gag.chance) continue;
    return { gag, variant, history: advance(history, gag, variant, dayKey) };
  }
  return null;
}

function advance(history: GagHistory, gag: GagDef, variant: GagVariant, dayKey: string): GagHistory {
  const stages = stagesFor(gag, history);
  const nextStages = gag.running ? { ...stages, [gag.id]: (stages[gag.id] ?? 0) + 1 } : stages;
  const session = { ...history.session, shown: [...history.session.shown, gag.id] };
  return {
    ...history,
    lastVariant: { ...history.lastVariant, [gag.id]: variant.id },
    stage: gag.perSession ? history.stage : nextStages,
    session: gag.perSession ? { ...session, stage: nextStages } : session,
    dailyShownOn: gag.daily ? { ...history.dailyShownOn, [gag.dailyGroup ?? gag.id]: dayKey } : history.dailyShownOn,
    dailyLast: gag.dailyGroup ? { ...history.dailyLast, [gag.dailyGroup]: gag.id } : history.dailyLast,
  };
}

export function canInterrupt(event: GagEvent, ctx: GagContext, catalog: readonly GagDef[] = GAG_CATALOG): boolean {
  return catalog.some((gag) => gag.interrupts && gag.matches(event, ctx));
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
