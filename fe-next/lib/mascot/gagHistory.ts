import { createGagHistory, createGagSession, type GagHistory } from './gagDirector';

export const GAG_HISTORY_KEY = 'lexiclash_mascot_gag_history_v1';

export function loadGagHistory(): GagHistory {
  try {
    const raw = window.localStorage.getItem(GAG_HISTORY_KEY);
    if (!raw) return createGagHistory();
    const parsed = JSON.parse(raw) as Partial<GagHistory>;
    return {
      lastVariant: parsed.lastVariant ?? {},
      stage: parsed.stage ?? {},
      dailyShownOn: parsed.dailyShownOn ?? {},
      dailyLast: parsed.dailyLast ?? {},
      lastPlayedAt: typeof parsed.lastPlayedAt === 'number' ? parsed.lastPlayedAt : null,
      session: parsed.session && typeof parsed.session.id === 'string'
        ? { id: parsed.session.id, stage: parsed.session.stage ?? {}, shown: parsed.session.shown ?? [] }
        : createGagSession(),
    };
  } catch {
    return createGagHistory();
  }
}

export function saveGagHistory(history: GagHistory): void {
  try {
    window.localStorage.setItem(GAG_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Storage blocked: gags still run, callbacks just start fresh next visit.
  }
}
