import type { HolidayRegion } from './region';

export type DreidelFace = 'nun' | 'gimel' | 'hei' | 'shin';

export const DREIDEL_ORDER: readonly DreidelFace[] = ['nun', 'gimel', 'hei', 'shin'];
export const SHIN_BONUS = 10;
export const DREIDEL_MIN_POT = 20;
export const CRACKER_COINS = 25;
export const CRACKER_JOKES = 10;

export function dreidelFaces(region: HolidayRegion): string[] {
  return ['נ', 'ג', 'ה', region === 'IL' ? 'פ' : 'ש'];
}

export function dreidelCoins(face: DreidelFace, geltCoins: number): number {
  const pot = Math.max(geltCoins, DREIDEL_MIN_POT);
  if (face === 'gimel') return pot;
  if (face === 'hei') return Math.ceil(pot / 2);
  if (face === 'shin') return SHIN_BONUS;
  return 0;
}

export function rollDreidel(random: () => number = Math.random): DreidelFace {
  return DREIDEL_ORDER[Math.min(3, Math.floor(random() * 4))];
}

export function crackerJoke(random: () => number = Math.random): number {
  return Math.min(CRACKER_JOKES, Math.floor(random() * CRACKER_JOKES) + 1);
}
