/**
 * useBlastColorPowerSeeding — Seeds color tags on tiles when wave has color_power objective.
 *
 * Pattern: Mirrors useBlastBuffEffects.ts approach.
 * - Watches for waveNumber + objectives changes
 * - If wave has color_power objective, calls seedTileStates to tag tiles
 * - Deterministic seeding via wave number (reproducible across retries)
 */

import { useEffect } from 'react';
import { seedColorTags } from '../utils/blastColorPowerSeeder';
import type { BlastObjective } from '../types';

export interface UseBlastColorPowerSeedingParams {
  waveNumber: number;
  objectives: BlastObjective[];
  seedTileStates: (updater: (prev: any[][]) => any[][]) => void;
}

export function useBlastColorPowerSeeding({
  waveNumber,
  objectives,
  seedTileStates,
}: UseBlastColorPowerSeedingParams) {
  useEffect(() => {
    // Find color_power objective in current wave
    const colorPowerObj = objectives.find(obj => obj.type === 'color_power');
    if (!colorPowerObj || !colorPowerObj.colorTag) return;

    // Seed color tags using deterministic wave-based seed (0.30 = 30% of tiles colored)
    seedTileStates(prev => seedColorTags(prev, colorPowerObj.colorTag!, 0.30, waveNumber * 1000));

    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot seed on wave + objective change
  }, [waveNumber, objectives]);
}
