import type { TreasureTier } from '@/lib/blast/blastTreasureRoll';
import { DIAMOND_WORD_MULTIPLIER, GOLD_MULTIPLIER, type BlastTileType } from '../types';

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
): ScoreStamp[] | undefined {
  const stamps: ScoreStamp[] = [];
  const coins = pathTypes.filter((type) => type === 'gold').length;
  const gems = pathTypes.filter((type) => type === 'diamond').length;
  if (coins > 0) stamps.push({ kind: 'coin', mult: GOLD_MULTIPLIER ** coins, label: t('blast.stamp.coin', 'COIN') });
  if (gems > 0) stamps.push({ kind: 'gem', mult: DIAMOND_WORD_MULTIPLIER ** gems, label: t('blast.stamp.gem', 'GEM') });
  if (treasureTier !== 'common') {
    stamps.push({ kind: treasureTier, mult: TREASURE_MULT[treasureTier], label: t(`blast.stamp.${treasureTier}`, treasureTier === 'jackpot' ? 'JACKPOT' : 'LUCKY') });
  }
  return stamps.length > 0 ? stamps : undefined;
}
