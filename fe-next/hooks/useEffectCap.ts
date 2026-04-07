/**
 * useEffectCap — Caps simultaneous visual effects to prevent "effect soup."
 *
 * Accepts an array of effect entries (id, active flag, priority).
 * Returns a map of id → boolean, where only the top N active effects by
 * priority are true. Inactive effects are always false.
 */

import { useMemo } from 'react';

export const MAX_SIMULTANEOUS_EFFECTS = 3;

export interface EffectEntry {
  id: string;
  active: boolean;
  priority: number;
}

export function useEffectCap(effects: EffectEntry[]): Record<string, boolean> {
  // Build a stable cache key from the active/priority values
  const cacheKey = effects.map(e => `${e.id}:${e.active ? 1 : 0}:${e.priority}`).join('|');

  return useMemo(() => {
    const result: Record<string, boolean> = {};

    // Collect active effects with their original index for stable tie-breaking
    const active: Array<{ id: string; priority: number; index: number }> = [];
    for (let i = 0; i < effects.length; i++) {
      const e = effects[i];
      if (e.active) {
        active.push({ id: e.id, priority: e.priority, index: i });
      }
      result[e.id] = false;
    }

    // Sort by priority descending, then by original index ascending (stable)
    active.sort((a, b) => b.priority - a.priority || a.index - b.index);

    // Enable only the top N
    for (let i = 0; i < Math.min(active.length, MAX_SIMULTANEOUS_EFFECTS); i++) {
      result[active[i].id] = true;
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);
}
