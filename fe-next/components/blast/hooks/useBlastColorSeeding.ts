/**
 * useBlastColorSeeding — Hook to seed color tags on tiles for color_power objectives.
 * Runs once per wave when objectives load, after tile states are initialized.
 *
 * Critique fix (Sprint 3 P0): instead of a flat 30% sprinkle that can scatter
 * pink tiles into unreachable singletons, escalate density until a connected
 * cluster of size >= minColorCount exists. Removes the "wait-for-pink" luck
 * perception flagged by all 3 LLM critiques.
 */

import { useEffect } from 'react';
import type { BlastObjective, BlastTileState } from '../types';
import { seedColorPowerWithGuarantee } from '../utils/blastColorPowerValidator';

interface UseBlastColorSeedingDeps {
  /** Wave objectives that may include color_power type */
  objectives: BlastObjective[];
  /** Current wave number (used as seed for determinism) */
  waveNumber: number;
  /** Current tile states — read-only before seeding */
  tileStates: BlastTileState[][];
  /** Callback to update tile states with seeded colors */
  seedTileStates: (updater: (prev: BlastTileState[][]) => BlastTileState[][]) => void;
  /** Skip seeding in multiplayer (competitive integrity) */
  isMultiplayer?: boolean;
}

export function useBlastColorSeeding(deps: UseBlastColorSeedingDeps) {
  const { objectives, waveNumber, tileStates, seedTileStates, isMultiplayer } = deps;

  useEffect(() => {
    if (isMultiplayer) return; // No color seeding in MP
    if (!objectives || objectives.length === 0) return;

    const colorPowerObj = objectives.find((obj): obj is any => obj.type === 'color_power');
    if (!colorPowerObj) return;

    const color = colorPowerObj.colorTag;
    if (!color) return;

    const minColorCount: number =
      typeof colorPowerObj.minColorCount === 'number' && colorPowerObj.minColorCount > 0
        ? colorPowerObj.minColorCount
        : 4;

    const baseSeed = waveNumber * 73 + 12345;
    const { grid: seededTiles } = seedColorPowerWithGuarantee(
      tileStates,
      color,
      minColorCount,
      baseSeed,
    );

    seedTileStates(() => seededTiles);
  }, [objectives, waveNumber, isMultiplayer, tileStates, seedTileStates]);
}
