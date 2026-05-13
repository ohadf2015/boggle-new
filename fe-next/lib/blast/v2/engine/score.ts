import type { BlastLevel, CellId } from '../types';

export type ScoreOutcome = {
  coinsBase: number;
  coinsFromOverlays: number;
  chestProgressDelta: number;
  multiplier: 1 | 2;
  chainMultiplier: number;
};

const CHAIN_MULTIPLIER_TABLE = [1, 1, 1.5, 2, 3, 4] as const;

function chainMultiplierFor(chainDepth: number): number {
  if (chainDepth <= 0) return 1;
  const idx = Math.min(chainDepth, CHAIN_MULTIPLIER_TABLE.length - 1);
  return CHAIN_MULTIPLIER_TABLE[idx]!;
}

export function scoreForWord(
  level: BlastLevel,
  cells: CellId[],
  kind: 'theme' | 'cascade' | 'bonus',
  chainDepth: number = 0,
): ScoreOutcome {
  const wordLen = cells.length;
  let coinsBase = kind === 'theme' ? wordLen * 10 : kind === 'cascade' ? wordLen * 20 : 10;
  let coinsFromOverlays = 0;
  let chestProgressDelta = 0;
  let multiplier: 1 | 2 = 1;
  for (const id of cells) {
    const flags = level.tileFlags[id] ?? [];
    if (flags.includes('coin')) coinsFromOverlays += 5;
    if (flags.includes('gem')) chestProgressDelta += 0.02;
    if (flags.includes('double_bonus')) multiplier = 2;
  }
  if (multiplier === 2 && kind !== 'bonus') coinsBase *= 2;
  const chainMultiplier = kind === 'cascade' ? chainMultiplierFor(chainDepth) : 1;
  if (chainMultiplier !== 1) coinsBase = Math.round(coinsBase * chainMultiplier);
  return { coinsBase, coinsFromOverlays, chestProgressDelta, multiplier, chainMultiplier };
}
