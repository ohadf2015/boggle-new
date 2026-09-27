import { PARTY_STATE_VERSION, type PartyState } from './types';

export const PARTY_STORAGE_KEY = 'lexiclash:party:in-progress';

function canUse(storage?: Storage | null): storage is Storage {
  return Boolean(storage);
}

function defaultStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isPartyState(value: unknown): value is PartyState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<PartyState>;
  return (
    v.version === PARTY_STATE_VERSION &&
    Boolean(v.setup) &&
    Array.isArray(v.setup?.players) &&
    Array.isArray(v.board) &&
    typeof v.phase === 'string' &&
    typeof v.roundIndex === 'number'
  );
}

export function saveParty(state: PartyState, storage: Storage | null = defaultStorage()): void {
  if (!canUse(storage)) return;
  try {
    storage.setItem(PARTY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function loadParty(storage: Storage | null = defaultStorage()): PartyState | null {
  if (!canUse(storage)) return null;
  try {
    const raw = storage.getItem(PARTY_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPartyState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearParty(storage: Storage | null = defaultStorage()): void {
  if (!canUse(storage)) return;
  try {
    storage.removeItem(PARTY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
