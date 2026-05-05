'use client';

/**
 * useBlastPathRoute — wave-init resolver + per-submit watcher for the
 * path_route Goal Gallery mechanic.
 *
 * Two responsibilities packed in one hook because both depend on the same
 * (grid, dictionary, objectives) trio and run in lockstep through wave
 * lifecycle:
 *   1. Resolver: when grid + dict become ready, materialize startCell/endCell
 *      onto every path_route objective. Returns the materialized list.
 *   2. Watcher: on every successful word submit, evaluate whether the
 *      submitted path satisfied the route, and flip engine.setRouteCompleted.
 *
 * Why a hook (not pure fn): both steps need React refs + the engine action.
 * Engine action stays the side-effect boundary; this hook is the orchestrator.
 */

import { useEffect, useMemo, useRef } from 'react';
import {
  resolvePathRouteCells,
  resolveTileSniperCell,
  evaluatePathRouteHit,
  evaluateTileSniperHit,
} from '../utils/blastPathRoute';
import type { BlastObjective, LetterGrid, BlastGameState } from '../types';

interface UseBlastPathRouteParams {
  /** Source objectives (may contain unresolved path_route entries). */
  objectives: BlastObjective[];
  /** Current game grid; null until ready. */
  grid: LetterGrid | null;
  /** Dictionary check fn for solver path validation. */
  checkWord: (word: string) => boolean;
  /** Latest game state — watcher reads `lastWordCells` + `routeCompleted`. */
  gameState: BlastGameState;
  /** Engine action to flip the routeCompleted flag once. */
  setRouteCompleted: () => void;
  /** Engine action to flip the sniperHit flag once. */
  setSniperHit: () => void;
  /** Wave number — used as deterministic seed for cell selection. */
  waveNumber: number;
  /** When false (multiplayer / dictionary not loaded), the hook idles. */
  enabled: boolean;
}

interface UseBlastPathRouteReturn {
  /** Objectives with path_route cells materialized. Same shape if no path_route present. */
  resolvedObjectives: BlastObjective[];
}

export function useBlastPathRoute({
  objectives, grid, checkWord, gameState,
  setRouteCompleted, setSniperHit, waveNumber, enabled,
}: UseBlastPathRouteParams): UseBlastPathRouteReturn {
  // Cache the resolved cells per (wave, objectives identity) to avoid
  // re-running solver on every render. Keyed by wave so a new wave forces
  // a fresh resolution against the new grid.
  const resolveCacheRef = useRef<{ wave: number; resolved: BlastObjective[] } | null>(null);

  const resolvedObjectives = useMemo<BlastObjective[]>(() => {
    if (!enabled) return objectives;
    if (!grid || grid.length === 0) return objectives;

    // Already resolved for this wave — short-circuit.
    if (resolveCacheRef.current && resolveCacheRef.current.wave === waveNumber) {
      return resolveCacheRef.current.resolved;
    }

    const hasUnresolvedRoute = objectives.some(
      o => o.type === 'path_route' && (!o.startCell || !o.endCell),
    );
    const hasUnresolvedSniper = objectives.some(
      o => o.type === 'tile_sniper' && !o.targetCell,
    );
    if (!hasUnresolvedRoute && !hasUnresolvedSniper) {
      resolveCacheRef.current = { wave: waveNumber, resolved: objectives };
      return objectives;
    }

    const next: BlastObjective[] = objectives.map(obj => {
      if (obj.type === 'path_route' && (!obj.startCell || !obj.endCell)) {
        const result = resolvePathRouteCells(grid, checkWord, {
          seed: waveNumber * 9176 + 1,
          minLen: 4, maxLen: 8, maxAttempts: 60,
        });
        if (!result) return null;
        return { ...obj, startCell: result.startCell, endCell: result.endCell };
      }
      if (obj.type === 'tile_sniper' && !obj.targetCell) {
        const result = resolveTileSniperCell(grid, checkWord, {
          seed: waveNumber * 8419 + 31,
          minLen: 4, maxLen: 7, maxAttempts: 16,
        });
        if (!result) return null;
        return { ...obj, targetCell: result.targetCell };
      }
      return obj;
    }).filter((o): o is BlastObjective => o !== null);

    resolveCacheRef.current = { wave: waveNumber, resolved: next };
    return next;
  }, [enabled, grid, objectives, waveNumber, checkWord]);

  // Watcher: flip routeCompleted / sniperHit on the first satisfying submit.
  // Snapshots latest values via refs so the effect stays cheap.
  const setRouteCompletedRef = useRef(setRouteCompleted);
  setRouteCompletedRef.current = setRouteCompleted;
  const setSniperHitRef = useRef(setSniperHit);
  setSniperHitRef.current = setSniperHit;

  useEffect(() => {
    if (!enabled) return;
    const lastCells = gameState.lastWordCells;
    if (!lastCells || lastCells.length === 0) return;

    if (!gameState.routeCompleted) {
      const routeObj = resolvedObjectives.find(o => o.type === 'path_route');
      if (routeObj && evaluatePathRouteHit(lastCells, routeObj)) {
        setRouteCompletedRef.current();
      }
    }

    if (!gameState.sniperHit) {
      const sniperObj = resolvedObjectives.find(o => o.type === 'tile_sniper');
      if (sniperObj && evaluateTileSniperHit(lastCells, sniperObj)) {
        setSniperHitRef.current();
      }
    }
  }, [enabled, gameState.lastWordCells, gameState.routeCompleted, gameState.sniperHit, resolvedObjectives]);

  return { resolvedObjectives };
}
