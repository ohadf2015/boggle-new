import type { PRNG } from '../prng';
import type { CellId, MechanicSet, TileFlag } from '../types';

export type TileFlagsMap = Partial<Record<CellId, TileFlag[]>>;

const COIN_RATE = 0.20;
const GEM_RATE = 0.02;
const DOUBLE_BONUS_RATE = 0.05;

export function rollTileFlags(
  cellIds: CellId[], mechanics: MechanicSet, levelNumber: number, prng: PRNG,
): TileFlagsMap {
  const out: TileFlagsMap = {};
  for (const id of cellIds) {
    const flags: TileFlag[] = [];
    if (mechanics.coinOverlay && prng.chance(COIN_RATE)) flags.push('coin');
    if (mechanics.gemTiles && prng.chance(GEM_RATE)) flags.push('gem');
    if (mechanics.doubleBonusTile && prng.chance(DOUBLE_BONUS_RATE)) flags.push('double_bonus');
    if (flags.length > 0) out[id] = flags;
  }
  if (mechanics.frozenTiles && cellIds.length > 0) {
    const target = cellIds[prng.intRange(cellIds.length)]!;
    const existing = out[target] ?? [];
    if (!existing.includes('frozen')) out[target] = [...existing, 'frozen'];
  }
  return out;
}
