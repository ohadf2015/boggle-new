import type { HolidayKey } from '../calendar';

export type WordGameId = 'oil' | 'dreidel' | 'sufganiyah' | 'sleigh' | 'snowball' | 'wrap';
export type FamilyGameId = 'latke' | 'spin' | 'presents' | 'splat';
export type ArcadeGameId = WordGameId | FamilyGameId;

export interface ArcadeGameMeta {
  id: ArcadeGameId;
  holiday: HolidayKey;
  seconds: number;
  cover: string;
  bg: string;
  hero: string;
  family: boolean;
}

const art = (name: string) => `/holidays/arcade/${name}.webp`;

const word = (id: WordGameId, holiday: HolidayKey, seconds: number, bg: string, hero: string): ArcadeGameMeta => ({
  id, holiday, seconds, cover: `/holidays/arcade-${id}.webp`, bg: art(bg), hero: art(hero), family: false,
});

const family = (id: FamilyGameId, holiday: HolidayKey, seconds: number, bg: string, hero: string): ArcadeGameMeta => ({
  id, holiday, seconds, cover: art(bg), bg: art(bg), hero: art(hero), family: true,
});

export const ARCADE_GAMES: Record<ArcadeGameId, ArcadeGameMeta> = {
  latke: family('latke', 'hanukkah', 45, 'bg-latke', 'spr-latke-golden'),
  spin: family('spin', 'hanukkah', 60, 'bg-dreidel', 'spr-dreidel-blue'),
  presents: family('presents', 'christmas', 60, 'bg-stack', 'spr-gift-red'),
  splat: family('splat', 'christmas', 40, 'bg-snowball', 'spr-popup-gremlin'),
  oil: word('oil', 'hanukkah', 80, 'bg-latke', 'spr-oil-drop'),
  dreidel: word('dreidel', 'hanukkah', 90, 'bg-dreidel', 'spr-gelt-coins'),
  sufganiyah: word('sufganiyah', 'hanukkah', 90, 'bg-latke', 'spr-sour-cream'),
  sleigh: word('sleigh', 'christmas', 90, 'bg-rooftops', 'spr-gift-green'),
  snowball: word('snowball', 'christmas', 75, 'bg-snowball', 'spr-snowball'),
  wrap: word('wrap', 'christmas', 90, 'bg-workshop', 'spr-gift-blue'),
};

const ORDER: ArcadeGameId[] = ['latke', 'spin', 'presents', 'splat', 'oil', 'dreidel', 'sufganiyah', 'sleigh', 'snowball', 'wrap'];

export function gamesFor(holiday: HolidayKey): ArcadeGameId[] {
  return ORDER.filter((id) => ARCADE_GAMES[id].holiday === holiday);
}

export function isArcadeGame(v: unknown): v is ArcadeGameId {
  return typeof v === 'string' && (ORDER as string[]).includes(v);
}

export function isFamilyGame(v: unknown): v is FamilyGameId {
  return isArcadeGame(v) && ARCADE_GAMES[v].family;
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
