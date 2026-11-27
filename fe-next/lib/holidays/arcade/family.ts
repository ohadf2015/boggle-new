import type { FamilyGameId } from './games';

export interface FamilyContent {
  seed: number;
}

export const FAMILY_RULES: Record<FamilyGameId, { cap: number; perSecond: number }> = {
  latke: { cap: 6000, perSecond: 120 },
  spin: { cap: 2400, perSecond: 60 },
  presents: { cap: 5000, perSecond: 120 },
  splat: { cap: 4000, perSecond: 120 },
};

export function familyBound(game: FamilyGameId, claimed: number, elapsedSeconds: number): number {
  const { cap, perSecond } = FAMILY_RULES[game];
  const c = Number.isFinite(claimed) ? Math.max(0, Math.floor(claimed)) : 0;
  return Math.floor(Math.min(c, cap, Math.max(0, elapsedSeconds) * perSecond));
}
