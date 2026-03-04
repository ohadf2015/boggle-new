'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BlastComboType, SpecialCombo } from '../utils/blastCombos';

const STORAGE_KEY = 'blast_discovered_combos';
const API_URL = '/api/blast/combo-codex';

function loadFromStorage(): Set<BlastComboType> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as BlastComboType[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveToStorage(combos: Set<BlastComboType>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...combos]));
  } catch {
    // SSR-safe: ignore storage errors
  }
}

/** Additive union of two combo arrays — same logic as server merge. */
function unionCombos(a: BlastComboType[], b: BlastComboType[]): BlastComboType[] {
  return [...new Set([...a, ...b])] as BlastComboType[];
}

export interface UseBlastComboDiscoveryOptions {
  /** Authenticated user ID. When provided, syncs to Supabase. */
  userId?: string;
}

export interface UseBlastComboDiscoveryReturn {
  discoveredCombos: Set<BlastComboType>;
  pendingDiscovery: BlastComboType | null;
  onComboDetected: (combos: SpecialCombo[]) => void;
  acknowledgeDiscovery: () => void;
}

/**
 * Tracks which combos a player has discovered for the first time.
 *
 * Persistence strategy:
 * - Always writes to localStorage (offline fallback, instant update).
 * - If `userId` is provided (authenticated): fires a non-fatal POST to
 *   /api/blast/combo-codex on each new discovery, and GETs on mount
 *   to merge server data with localStorage (union, never shrink).
 *
 * Uses a ref mirror to avoid stale closure reads in callbacks.
 */
export function useBlastComboDiscovery(
  { userId }: UseBlastComboDiscoveryOptions = {},
): UseBlastComboDiscoveryReturn {
  const [discoveredCombos, setDiscoveredCombos] = useState<Set<BlastComboType>>(
    () => loadFromStorage(),
  );
  const discoveredCombosRef = useRef<Set<BlastComboType>>(discoveredCombos);

  const [pendingDiscovery, setPendingDiscovery] = useState<BlastComboType | null>(null);

  // Keep ref in sync with state
  const updateCombos = useCallback((next: Set<BlastComboType>) => {
    discoveredCombosRef.current = next;
    setDiscoveredCombos(next);
    saveToStorage(next);
  }, []);

  // On mount: if authenticated, GET server data and merge with localStorage (union)
  useEffect(() => {
    if (!userId) return;

    fetch(API_URL)
      .then(res => res.json())
      .then((data: { discoveredCombos?: string[] }) => {
        const serverCombos = (data.discoveredCombos ?? []) as BlastComboType[];
        const localCombos = [...discoveredCombosRef.current] as BlastComboType[];
        const merged = unionCombos(localCombos, serverCombos);
        const mergedSet = new Set(merged);

        // Only update state/storage if merge added new entries
        if (mergedSet.size > discoveredCombosRef.current.size) {
          updateCombos(mergedSet);
        }
      })
      .catch(() => {
        // Non-fatal: fall back to localStorage-only state
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // run once per userId change (effectively once on mount)

  const onComboDetected = useCallback((combos: SpecialCombo[]) => {
    for (const combo of combos) {
      if (!discoveredCombosRef.current.has(combo.type)) {
        // Update ref, state, and localStorage synchronously
        const next = new Set([...discoveredCombosRef.current, combo.type]);
        updateCombos(next);
        setPendingDiscovery(combo.type);

        // If authenticated, fire-and-forget POST to persist (non-fatal on failure)
        if (userId) {
          fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discoveredCombos: [...next] }),
          }).catch(() => {
            // Non-fatal: localStorage already has the data
          });
        }

        break; // Only first undiscovered combo triggers discovery banner
      }
    }
  }, [userId, updateCombos]);

  const acknowledgeDiscovery = useCallback(() => {
    setPendingDiscovery(null);
  }, []);

  return { discoveredCombos, pendingDiscovery, onComboDetected, acknowledgeDiscovery };
}
