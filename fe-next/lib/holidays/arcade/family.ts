import type { ArcadeGameId } from './games';

export interface FamilyContent {
  seed: number;
}

export const FAMILY_RULES: Record<ArcadeGameId, { cap: number; perSecond: number }> = {
  latke: { cap: 14000, perSecond: 240 },
  spin: { cap: 5500, perSecond: 110 },
  catch: { cap: 8000, perSecond: 150 },
  presents: { cap: 6000, perSecond: 120 },
  splat: { cap: 6000, perSecond: 140 },
  dash: { cap: 8000, perSecond: 150 },
};

export function familyBound(game: ArcadeGameId, claimed: number, elapsedSeconds: number): number {
  const { cap, perSecond } = FAMILY_RULES[game];
  const c = Number.isFinite(claimed) ? Math.max(0, Math.floor(claimed)) : 0;
  return Math.floor(Math.min(c, cap, Math.max(0, elapsedSeconds) * perSecond));
}
