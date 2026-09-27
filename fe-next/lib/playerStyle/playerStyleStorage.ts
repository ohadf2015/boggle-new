/**
 * Guest persistence for the chosen player style + the one-time-popup flag.
 *
 * Mirrors `utils/profileStorage.ts`: localStorage with sessionStorage fallback
 * (via storageHelpers), SSR-safe. Authenticated users persist to
 * `profiles.player_style` / `profiles.player_style_modal_shown_at` instead — see
 * `hooks/usePlayerStyle.ts`, which routes between the two layers.
 */

import { getFromStorage, saveToStorage, removeFromStorage } from '@/utils/storageHelpers';
import { isPlayerStyleKey, type PlayerStyleKey } from './styles';

export const PLAYER_STYLE_STORAGE_KEYS = {
  STYLE: 'boggle_player_style',
  MODAL_SHOWN: 'boggle_player_style_modal_shown',
} as const;

/** The chosen style key, or `null` if none stored / the stored value is invalid. */
export function getStoredPlayerStyle(): PlayerStyleKey | null {
  const raw = getFromStorage(PLAYER_STYLE_STORAGE_KEYS.STYLE);
  return isPlayerStyleKey(raw) ? raw : null;
}

export function setStoredPlayerStyle(key: PlayerStyleKey): void {
  saveToStorage(PLAYER_STYLE_STORAGE_KEYS.STYLE, key);
}

export function clearStoredPlayerStyle(): void {
  removeFromStorage(PLAYER_STYLE_STORAGE_KEYS.STYLE);
}

export function hasPlayerStyleModalBeenShown(): boolean {
  return getFromStorage(PLAYER_STYLE_STORAGE_KEYS.MODAL_SHOWN) === 'true';
}

export function markPlayerStyleModalShown(): void {
  saveToStorage(PLAYER_STYLE_STORAGE_KEYS.MODAL_SHOWN, 'true');
}
