import type { PRNG } from '../prng';
import type { CellId, MechanicSet, TileFlag } from '../types';
import { applyModifierToRates, type LevelModifier } from '../level-modifiers';

export type TileFlagsMap = Partial<Record<CellId, TileFlag[]>>;

const COIN_RATE = 0.20;
const GEM_RATE = 0.02;
const DOUBLE_BONUS_RATE = 0.05;

export function rollTileFlags(
  cellIds: CellId[],
  mechanics: MechanicSet,
  levelNumber: number,
  prng: PRNG,
  modifier: LevelModifier | null = null,
): TileFlagsMap {
  const out: TileFlagsMap = {};
  const rates = applyModifierToRates(
    { coin: COIN_RATE, gem: GEM_RATE, doubleBonus: DOUBLE_BONUS_RATE },
    modifier,
  );
  for (const id of cellIds) {
    const flags: TileFlag[] = [];
    if (mechanics.coinOverlay && prng.chance(rates.coin)) flags.push('coin');
    if (mechanics.gemTiles && prng.chance(rates.gem)) flags.push('gem');
    if (mechanics.doubleBonusTile && prng.chance(rates.doubleBonus)) flags.push('double_bonus');
    if (flags.length > 0) out[id] = flags;
  }
  if (mechanics.frozenTiles && cellIds.length > 0) {
    const target = cellIds[prng.intRange(cellIds.length)]!;
    const existing = out[target] ?? [];
    if (!existing.includes('frozen')) out[target] = [...existing, 'frozen'];
  }
  return out;
}
