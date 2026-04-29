/**
 * useBlastColorSeeding — Hook to seed color tags on tiles for color_power objectives.
 * Runs once per wave when objectives load, after tile states are initialized.
 *
 * Strategy: detect when a color_power objective is present, then tag ~30% of regular
 * tiles with the target color. Deterministic seeding ensures consistency.
 */

import { useEffect } from 'react';
import type { BlastObjective, BlastTileState } from '../types';
import { seedColorTags } from '../utils/blastColorPowerSeeder';

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

const COLOR_SEEDING_DENSITY = 0.30; // 30% of eligible tiles

export function useBlastColorSeeding(deps: UseBlastColorSeedingDeps) {
  const { objectives, waveNumber, tileStates, seedTileStates, isMultiplayer } = deps;

  useEffect(() => {
    if (isMultiplayer) return; // No color seeding in MP
    if (!objectives || objectives.length === 0) return;

    // Find color_power objective
    const colorPowerObj = objectives.find((obj): obj is any => obj.type === 'color_power');
    if (!colorPowerObj) return; // No color objective for this wave

    const color = colorPowerObj.colorTag;
    if (!color) return;

    // Seed color tags deterministically using wave number + objective seed
    const seed = waveNumber * 73 + 12345; // Arbitrary mix to make seed unique per wave
    const seededTiles = seedColorTags(tileStates, color, COLOR_SEEDING_DENSITY, seed);

    // Apply seeded tiles via the engine's seedTileStates API
    // This ensures both React state and internal ref are in sync
    seedTileStates(() => seededTiles);
  }, [objectives, waveNumber, isMultiplayer, tileStates, seedTileStates]);
}
