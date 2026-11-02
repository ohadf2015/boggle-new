import type { TreasureTier } from '@/lib/blast/blastTreasureRoll';
import { GOLD_MULTIPLIER, type BlastTileType } from '../types';
import type { BlastGemKind } from '@/shared/types/blast';
import { GEM_DEFS, DEFAULT_GEM } from './blastGems';

export type ScoreStampKind = 'coin' | 'gem' | 'lucky' | 'jackpot';

export interface ScoreStamp {
  kind: ScoreStampKind;
  mult: number;
  label: string;
}

const TREASURE_MULT: Record<'lucky' | 'jackpot', number> = { lucky: 2, jackpot: 3 };

export function buildScoreStamps(
  pathTypes: readonly BlastTileType[],
  treasureTier: TreasureTier,
  t: (key: string, fallback?: string) => string,
  /** Gem colors on the path, in order; a missing entry reads as sapphire. */
  gemKinds: readonly (BlastGemKind | undefined)[] = [],
): ScoreStamp[] | undefined {
  const stamps: ScoreStamp[] = [];
  const coins = pathTypes.filter((type) => type === 'gold').length;
  const gems = pathTypes.filter((type) => type === 'diamond').length;
  if (coins > 0) stamps.push({ kind: 'coin', mult: GOLD_MULTIPLIER ** coins, label: t('blast.stamp.coin', 'COIN') });
  if (gems > 0) stamps.push({ kind: 'gem', mult: Array.from({ length: gems }, (_, i) => GEM_DEFS[gemKinds[i] ?? DEFAULT_GEM].wordMult).reduce((a, b) => a * b, 1), label: t('blast.stamp.gem', 'GEM') });
  if (treasureTier !== 'common') {
    stamps.push({ kind: treasureTier, mult: TREASURE_MULT[treasureTier], label: t(`blast.stamp.${treasureTier}`, treasureTier === 'jackpot' ? 'JACKPOT' : 'LUCKY') });
  }
  return stamps.length > 0 ? stamps : undefined;
}
