import type { HolidayKey } from '../calendar';

export type ArcadeGameId = 'oil' | 'dreidel' | 'sufganiyah' | 'sleigh' | 'snowball' | 'wrap';

export interface ArcadeGameMeta {
  id: ArcadeGameId;
  holiday: HolidayKey;
  seconds: number;
  cover: string;
}

const meta = (id: ArcadeGameId, holiday: HolidayKey, seconds: number): ArcadeGameMeta => ({
  id, holiday, seconds, cover: `/holidays/arcade-${id}.webp`,
});

export const ARCADE_GAMES: Record<ArcadeGameId, ArcadeGameMeta> = {
  oil: meta('oil', 'hanukkah', 80),
  dreidel: meta('dreidel', 'hanukkah', 90),
  sufganiyah: meta('sufganiyah', 'hanukkah', 90),
  sleigh: meta('sleigh', 'christmas', 90),
  snowball: meta('snowball', 'christmas', 75),
  wrap: meta('wrap', 'christmas', 90),
};

const ORDER: ArcadeGameId[] = ['oil', 'dreidel', 'sufganiyah', 'sleigh', 'snowball', 'wrap'];

export function gamesFor(holiday: HolidayKey): ArcadeGameId[] {
  return ORDER.filter((id) => ARCADE_GAMES[id].holiday === holiday);
}

export function isArcadeGame(v: unknown): v is ArcadeGameId {
  return typeof v === 'string' && (ORDER as string[]).includes(v);
}

export const ROUND_COIN_CAP = 20;
export const DAILY_COIN_CAP = 80;
const POINTS_PER_COIN = 25;

export function roundCoins(score: number): number {
  return Math.max(0, Math.min(ROUND_COIN_CAP, Math.floor(score / POINTS_PER_COIN)));
}

export interface ArcadePlay {
  w: string;
  i?: number;
}
