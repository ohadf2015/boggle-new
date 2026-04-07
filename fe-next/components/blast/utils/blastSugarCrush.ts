/**
 * blastSugarCrush - Pure logic for Sugar Crush end-of-level sequence.
 *
 * When moves run out, selects up to 8 uncleared standard tiles and
 * converts them to specials with escalating intensity, creating a
 * spectacular chain reaction finale.
 */
import type { BlastTileState, BlastTileType } from '../types';

/** Base stagger delay between Sugar Crush conversions (ms) */
export const SUGAR_CRUSH_STAGGER_MS = 300;

/** Intensity level of a single Sugar Crush step */
export type SugarCrushIntensity = 'low' | 'medium' | 'high';

/** A single step in the Sugar Crush sequence */
export interface SugarCrushStep {
  /** Grid row of the tile to convert */
  row: number;
  /** Grid col of the tile to convert */
  col: number;
  /** Special tile type to convert this tile into */
  convertTo: BlastTileType;
  /** Delay in ms from sequence start before this step fires */
  delayMs: number;
  /** Visual intensity of the conversion effect */
  intensity: SugarCrushIntensity;
}

/** Max tiles converted during Sugar Crush (keeps sequence snappy) */
const MAX_SUGAR_CRUSH_TILES = 8;

/** Stagger delay for each intensity level */
const STAGGER_BY_INTENSITY: Record<SugarCrushIntensity, number> = {
  low: SUGAR_CRUSH_STAGGER_MS,       // 300ms between low intensity
  medium: 250,                        // 250ms between medium intensity
  high: 200,                          // 200ms between high intensity (fastest)
};

/** Tile type assigned at each intensity phase */
const CONVERT_TYPE_BY_INTENSITY: Record<SugarCrushIntensity, BlastTileType[]> = {
  low: ['bomb'],
  medium: ['lightning', 'prism'],
  high: ['rainbow'],
};

/**
 * Fisher-Yates shuffle (in place).
 * Returns the shuffled array for chaining.
 */
function fisherYatesShuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Plan the Sugar Crush sequence for a given tile grid.
 *
 * Selects up to 8 uncleared standard tiles (random via Fisher-Yates),
 * assigns escalating special types, and returns timed steps:
 *   - First 2-3: bomb (low intensity, 300ms stagger)
 *   - Middle 2-3: lightning or prism (medium intensity, 250ms stagger)
 *   - Last 2: rainbow (high intensity, 200ms stagger)
 *
 * @param tileStates - Current 2D grid of tile states
 * @param gridSize - Grid dimension (used for bounds check)
 * @returns Ordered array of steps to execute; empty when nothing to convert
 */
export function planSugarCrush(
  tileStates: BlastTileState[][],
  gridSize: number,
  rng: () => number = Math.random,
): SugarCrushStep[] {
  // Collect uncleared standard tiles
  const candidates: { row: number; col: number }[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = tileStates[r]?.[c];
      if (!tile) continue;
      if (tile.isCleared) continue;
      if (tile.type !== 'standard') continue;
      candidates.push({ row: r, col: c });
    }
  }

  if (candidates.length === 0) return [];

  // Randomly select up to MAX_SUGAR_CRUSH_TILES
  fisherYatesShuffle(candidates, rng);
  const selected = candidates.slice(0, MAX_SUGAR_CRUSH_TILES);
  const total = selected.length;

  // Determine phase boundaries:
  //   Low:    first ~25% of tiles (at least 1, at most 3)
  //   High:   last ~25% of tiles (at least 1, at most 2)
  //   Medium: everything in between

  // Calculate counts for each phase
  const highCount = total >= 4 ? Math.min(2, Math.ceil(total * 0.25)) : 0;
  const lowCount = total >= 3 ? Math.min(3, Math.ceil(total * 0.25)) : (total - highCount);
  const mediumCount = total - lowCount - highCount;

  // Build intensity assignments
  const phases: SugarCrushIntensity[] = [
    ...Array(lowCount).fill('low') as SugarCrushIntensity[],
    ...Array(mediumCount).fill('medium') as SugarCrushIntensity[],
    ...Array(highCount).fill('high') as SugarCrushIntensity[],
  ];

  // Build steps with cumulative delays
  const steps: SugarCrushStep[] = [];
  let cumulativeDelay = 0;

  for (let i = 0; i < selected.length; i++) {
    const { row, col } = selected[i];
    const intensity = phases[i];
    const stagger = STAGGER_BY_INTENSITY[intensity];
    cumulativeDelay += stagger;

    // Pick convert type: alternate between options in the phase's list
    const typeOptions = CONVERT_TYPE_BY_INTENSITY[intensity];
    const convertTo = typeOptions[i % typeOptions.length];

    steps.push({
      row,
      col,
      convertTo,
      delayMs: cumulativeDelay,
      intensity,
    });
  }

  return steps;
}
