export type CommitTier = 'soft' | 'nice' | 'great' | 'huge' | 'bingo';

export interface CommitContext {
  scoreThisTurn: number;
  tilesPlaced: number;
  bingo: boolean;
  streak: number;
  hasRareTile: boolean;
  premiumTriggered: boolean;
  heatLevel: number;
}

export function resolveCommitTier(ctx: CommitContext): CommitTier {
  const { scoreThisTurn, bingo, streak, hasRareTile, premiumTriggered } = ctx;

  if (bingo || scoreThisTurn >= 100) return 'bingo';
  if (scoreThisTurn >= 50) return 'huge';
  if (streak >= 3 && scoreThisTurn >= 30) return 'huge';
  if (scoreThisTurn >= 25) return 'great';
  if (hasRareTile && scoreThisTurn >= 15) return 'great';
  if (scoreThisTurn >= 12) return 'nice';
  if (premiumTriggered && scoreThisTurn > 0) return 'nice';
  return 'soft';
}

export function clampTierForCosy(tier: CommitTier): CommitTier {
  if (tier === 'huge' || tier === 'bingo') return 'great';
  return tier;
}
