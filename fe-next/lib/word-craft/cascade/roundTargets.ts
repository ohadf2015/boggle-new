export const CASCADE_ROUND_COUNT = 5;

// Per spec: 5-round escalating targets, calibrated for 7×7 default.
// 9×9 boards scale up by a factor since more tiles → bigger words possible.
const TARGETS_7x7: readonly number[] = [80, 180, 350, 600, 1000];

const SIZE_FACTOR_9x9 = 1.3;

export function getCascadeRoundTarget(round: number, boardSize: number): number {
  const idx = Math.min(Math.max(round, 1), TARGETS_7x7.length) - 1;
  const base = TARGETS_7x7[idx];
  const factor = boardSize >= 9 ? SIZE_FACTOR_9x9 : 1;
  return Math.round(base * factor);
}

const RISE_MS_BY_ROUND: Record<number, number> = {
  1: 12_000,
  2: 11_000,
  3: 10_000,
  4: 9_000,
  5: 8_000,
};

export function getFireRiseMs(round: number): number {
  return RISE_MS_BY_ROUND[round] ?? 10_000;
}
