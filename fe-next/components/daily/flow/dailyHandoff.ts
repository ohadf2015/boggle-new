import { DAILY_MODES, type DailyModeId } from '@/lib/dailyModes';

const KEY = 'lc:daily-handoff';
/** A press-to-arrival gap longer than this is a separate visit (back button, new tab, slow reload). */
export const HANDOFF_TTL_MS = 30_000;

/** Called when the player moves along the chain (next-quest CTA, skip). */
export function markDailyHandoff(to: DailyModeId, now: number = Date.now()): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ to, at: now })); } catch { /* storage off */ }
}

/** True once, for the mode the last handoff pointed at; any read drops the marker. */
export function consumeDailyHandoff(modeId: DailyModeId, now: number = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw == null) return false;
    sessionStorage.removeItem(KEY);
    const { to, at } = JSON.parse(raw) as { to?: unknown; at?: unknown };
    return to === modeId && typeof at === 'number' && now - at >= 0 && now - at <= HANDOFF_TTL_MS;
  } catch {
    return false;
  }
}

export type ChainPip = 'done' | 'active' | 'next';

/** Without play state the pips are positional, so an arrival never flips a pip once the server answers. */
export function chainPips(activeId: DailyModeId, isDone?: (id: DailyModeId) => boolean): ChainPip[] {
  const activeIndex = DAILY_MODES.findIndex((mode) => mode.id === activeId);
  return DAILY_MODES.map((mode, i) => {
    if (mode.id === activeId) return 'active';
    if (isDone) return isDone(mode.id) ? 'done' : 'next';
    return i < activeIndex ? 'done' : 'next';
  });
}
