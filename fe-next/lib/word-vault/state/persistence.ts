import type { GameProgress, GameSettings } from '../types';

export const STORAGE_KEY = 'word-vault:progress:v1';
export const STORAGE_VERSION = 1;

export type PersistedShape = GameProgress &
  Pick<GameSettings, 'locale' | 'reduceMotion' | 'largeText' | 'audioVolume'> & {
    version: number;
  };

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function loadFromStorage(): Partial<PersistedShape> | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedShape;
    if (parsed.version !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveToStorage(state: PersistedShape): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota errors swallowed — persistence is best-effort */
  }
}

export function clearStorage(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type SupabaseSyncEvent =
  | { type: 'room-solve'; roomId: string }
  | { type: 'cousin-redeemed'; cousinId: string }
  | { type: 'item-earned'; itemId: string }
  | { type: 'settings-changed' };

export type SupabaseSync = (event: SupabaseSyncEvent, snapshot: PersistedShape) => void;

export const NOOP_SUPABASE_SYNC: SupabaseSync = () => {
  /* real client wired in Phase C */
};
