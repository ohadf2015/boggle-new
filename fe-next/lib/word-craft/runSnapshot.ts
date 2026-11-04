import { mulberry32 } from '@/lib/rng/seededRandom';
import type { WordCraftState } from './useWordCraftGame';

const PREFIX = 'wc_lesson_run_v1:';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

interface StoredRun {
  savedAt: number;
  state: Omit<WordCraftState, 'bag'> & { bag: { tiles: WordCraftState['bag']['tiles']; nextId: number } };
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function clearRunSnapshot(key: string): void {
  try { storage()?.removeItem(PREFIX + key); } catch { /* storage blocked */ }
}

/** Keeps a lesson round on the device so a reload mid-run resumes it; a finished round is dropped. */
export function saveRunSnapshot(key: string, state: WordCraftState, now = Date.now()): void {
  if (state.turn === 'over') {
    clearRunSnapshot(key);
    return;
  }
  const stored: StoredRun = {
    savedAt: now,
    state: {
      ...state,
      bag: { tiles: state.bag.tiles, nextId: state.bag.nextId },
      pendingPlacements: [],
      selectedRackTileId: null,
      lastError: null,
    },
  };
  try { storage()?.setItem(PREFIX + key, JSON.stringify(stored)); } catch { /* quota or blocked */ }
}

function looksLikeState(s: unknown): s is StoredRun['state'] {
  if (!s || typeof s !== 'object') return false;
  const v = s as Record<string, unknown>;
  const board = v.board as { cells?: unknown } | undefined;
  const bag = v.bag as { tiles?: unknown; nextId?: unknown } | undefined;
  const player = v.player as { rack?: unknown } | undefined;
  const bot = v.bot as { rack?: unknown } | undefined;
  return Array.isArray(board?.cells) && Array.isArray(bag?.tiles) && typeof bag?.nextId === 'number'
    && Array.isArray(player?.rack) && Array.isArray(bot?.rack) && Array.isArray(v.history)
    && typeof v.seed === 'number' && (v.turn === 'player' || v.turn === 'bot');
}

export function loadRunSnapshot(key: string, now = Date.now()): WordCraftState | null {
  let raw: string | null = null;
  try { raw = storage()?.getItem(PREFIX + key) ?? null; } catch { return null; }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredRun>;
    if (typeof parsed.savedAt !== 'number' || now - parsed.savedAt > MAX_AGE_MS || !looksLikeState(parsed.state)) {
      clearRunSnapshot(key);
      return null;
    }
    const { state } = parsed;
    // The bag's shuffle closure cannot be stored; a fresh one only changes what a later swap draws.
    const rng = mulberry32((state.seed ^ (state.bag.nextId * 2654435761)) >>> 0);
    return { ...state, bag: { tiles: state.bag.tiles, nextId: state.bag.nextId, rng } };
  } catch {
    clearRunSnapshot(key);
    return null;
  }
}
