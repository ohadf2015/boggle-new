'use client';

/**
 * useMascotEnabled — persistent on/off toggle for the Blast HUD mascot.
 *
 * Default ON. Persisted to localStorage so the choice sticks across sessions.
 * Single boolean (not the originally-spec'd 3-state on/quiet/off) because
 * playtest data can drive a quiet-mode follow-up if it's missed; a binary
 * toggle is the lowest-friction first cut.
 */
import { useCallback, useEffect, useState } from 'react';

export const MASCOT_ENABLED_STORAGE_KEY = 'boggle_blast_mascot_enabled';

function readStored(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(MASCOT_ENABLED_STORAGE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return true; // default ON
  } catch {
    return true;
  }
}

export interface UseMascotEnabledApi {
  enabled: boolean;
  toggle: () => void;
}

export function useMascotEnabled(): UseMascotEnabledApi {
  const [enabled, setEnabled] = useState<boolean>(true);

  // Hydrate from localStorage on mount (avoids SSR mismatch).
  useEffect(() => {
    setEnabled(readStored());
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(MASCOT_ENABLED_STORAGE_KEY, String(next));
        }
      } catch {
        /* private browsing / quota — pref persists in-memory only */
      }
      return next;
    });
  }, []);

  return { enabled, toggle };
}
