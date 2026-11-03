import type { RankState, RankTierDef } from './types';

export const RANK_TIERS: RankTierDef[] = [
  { id: 'foundation', minM: 0 },
  { id: 'scaffold', minM: 6 },
  { id: 'lowrise', minM: 15 },
  { id: 'midrise', minM: 30 },
  { id: 'highrise', minM: 50 },
  { id: 'skyline', minM: 80 },
  { id: 'supertall', minM: 120 },
  { id: 'megatall', minM: 180 },
  { id: 'legend', minM: 260 },
];

export function rankFor(peakM: number): RankState {
  const m = Number.isFinite(peakM) ? Math.max(0, peakM) : 0;
  let tier = 0;
  while (tier + 1 < RANK_TIERS.length && RANK_TIERS[tier + 1].minM <= m) tier++;

  const current = RANK_TIERS[tier];
  const next = RANK_TIERS[tier + 1];
  if (!next) return { tier, tierId: current.id, progress01: 1, nextTierM: null };

  const progress01 = Math.min(1, (m - current.minM) / (next.minM - current.minM));
  return { tier, tierId: current.id, progress01, nextTierM: next.minM };
}
