export const ROUND_COUNT = 3;

const BASE_TARGETS: readonly number[] = [40, 95, 175];
const BAG_SIZES: readonly number[] = [20, 24, 28];

export function getRoundBagSize(round: number): number {
  const idx = Math.min(Math.max(round, 1), BAG_SIZES.length) - 1;
  return BAG_SIZES[idx];
}

export function getRoundTarget(round: number, boardSize: number): number {
  const idx = Math.min(Math.max(round, 1), BASE_TARGETS.length) - 1;
  const base = BASE_TARGETS[idx];
  const sizeFactor = boardSize >= 9 ? 1.3 : 1;
  return Math.round(base * sizeFactor);
}
