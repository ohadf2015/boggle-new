/**
 * blastColorPowerValidator — guards against the "wait-for-pink slot machine"
 * critique by validating that a color_power seed produces at least one
 * connected cluster of color-tagged tiles >= minColorCount.
 *
 * Adjacency uses 8 directions to match `blastTargetWordSolver.ts` path engine.
 * If the initial seed underperforms, density escalates (0.30 -> 0.40 -> 0.50
 * -> 0.60) and the seed is reattempted, capped to keep gameplay challenging.
 */
import type { BlastTileState } from '@/shared/types/blast';
import type { ColorTag } from '../types';
import { seedColorTags } from './blastColorPowerSeeder';

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export function largestColoredCluster(
  grid: BlastTileState[][],
  color: ColorTag,
): number {
  if (grid.length === 0) return 0;
  const rows = grid.length;
  const cols = grid[0].length;
  const visited: boolean[][] = grid.map(r => r.map(() => false));

  let best = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c] || grid[r][c].colorTag !== color) continue;
      // BFS flood-fill
      let size = 0;
      const stack: Array<[number, number]> = [[r, c]];
      visited[r][c] = true;
      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        size++;
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (visited[nr][nc]) continue;
          if (grid[nr][nc].colorTag !== color) continue;
          visited[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }
      if (size > best) best = size;
    }
  }
  return best;
}

export interface SeedColorPowerResult {
  grid: BlastTileState[][];
  attempts: number;
  finalDensity: number;
  satisfied: boolean;
}

const DENSITY_LADDER = [0.30, 0.40, 0.50, 0.60];

/**
 * Seed color tags then validate cluster size >= minColorCount. Escalates
 * density up the ladder if the first attempt underperforms. Returns the
 * best grid produced even when no rung satisfies (caller decides whether
 * to fall back, e.g. on tiny grids that geometrically cannot satisfy).
 */
export function seedColorPowerWithGuarantee(
  grid: BlastTileState[][],
  color: ColorTag,
  minColorCount: number,
  baseSeed: number,
): SeedColorPowerResult {
  let bestGrid: BlastTileState[][] = grid;
  let bestCluster = -1;
  let bestDensity = DENSITY_LADDER[0];
  let attempts = 0;

  for (let i = 0; i < DENSITY_LADDER.length; i++) {
    attempts++;
    const density = DENSITY_LADDER[i];
    const seeded = seedColorTags(grid, color, density, baseSeed + i * 31);
    const cluster = largestColoredCluster(seeded, color);
    if (cluster > bestCluster) {
      bestCluster = cluster;
      bestGrid = seeded;
      bestDensity = density;
    }
    if (cluster >= minColorCount) {
      return { grid: seeded, attempts, finalDensity: density, satisfied: true };
    }
  }

  return {
    grid: bestGrid,
    attempts,
    finalDensity: bestDensity,
    satisfied: false,
  };
}
