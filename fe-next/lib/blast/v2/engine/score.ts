import type { BlastLevel, CellId } from '../types';

export type ScoreOutcome = {
  coinsBase: number;
  coinsFromOverlays: number;
  chestProgressDelta: number;
  multiplier: 1 | 2;
};

export function scoreForWord(level: BlastLevel, cells: CellId[], kind: 'theme' | 'cascade' | 'bonus'): ScoreOutcome {
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
  return { coinsBase, coinsFromOverlays, chestProgressDelta, multiplier };
}
