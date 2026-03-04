'use client';

import { useState, useCallback, useRef } from 'react';
import type { BlastComboType, SpecialCombo } from '../utils/blastCombos';

const STORAGE_KEY = 'blast_discovered_combos';

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

export interface UseBlastComboDiscoveryReturn {
  discoveredCombos: Set<BlastComboType>;
  pendingDiscovery: BlastComboType | null;
  onComboDetected: (combos: SpecialCombo[]) => void;
  acknowledgeDiscovery: () => void;
}

/**
 * Tracks which combos a player has discovered for the first time.
 * Persists to localStorage under 'blast_discovered_combos'.
 * Uses a ref mirror to avoid stale closure reads in callbacks.
 */
export function useBlastComboDiscovery(): UseBlastComboDiscoveryReturn {
  const [discoveredCombos, setDiscoveredCombos] = useState<Set<BlastComboType>>(
    () => loadFromStorage(),
  );
  const discoveredCombosRef = useRef<Set<BlastComboType>>(discoveredCombos);

  const [pendingDiscovery, setPendingDiscovery] = useState<BlastComboType | null>(null);

  const onComboDetected = useCallback((combos: SpecialCombo[]) => {
    for (const combo of combos) {
      if (!discoveredCombosRef.current.has(combo.type)) {
        // Update ref and state synchronously
        discoveredCombosRef.current = new Set([...discoveredCombosRef.current, combo.type]);
        setDiscoveredCombos(new Set(discoveredCombosRef.current));
        saveToStorage(discoveredCombosRef.current);
        setPendingDiscovery(combo.type);
        break; // Only first undiscovered combo triggers discovery banner
      }
    }
  }, []);

  const acknowledgeDiscovery = useCallback(() => {
    setPendingDiscovery(null);
  }, []);

  return { discoveredCombos, pendingDiscovery, onComboDetected, acknowledgeDiscovery };
}
