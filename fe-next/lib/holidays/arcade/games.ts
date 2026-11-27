import type { HolidayKey } from '../calendar';

export type ArcadeGameId = 'latke' | 'spin' | 'catch' | 'presents' | 'splat' | 'dash';

export interface ArcadeGameMeta {
  id: ArcadeGameId;
  holiday: HolidayKey;
  seconds: number;
  cover: string;
  bg: string;
  hero: string;
}

const art = (name: string) => (name.startsWith('/') ? name : `/holidays/arcade/${name}.webp`);

const game = (id: ArcadeGameId, holiday: HolidayKey, seconds: number, bg: string, hero: string): ArcadeGameMeta => ({
  id, holiday, seconds, cover: art(bg), bg: art(bg), hero: art(hero),
});

export const ARCADE_GAMES: Record<ArcadeGameId, ArcadeGameMeta> = {
  latke: game('latke', 'hanukkah', 60, 'bg-latke', 'spr-latke-golden'),
  spin: game('spin', 'hanukkah', 60, 'bg-dreidel', 'spr-dreidel-blue'),
  catch: game('catch', 'hanukkah', 60, 'bg-catch', '/holidays/props-sufganiyah.webp'),
  presents: game('presents', 'christmas', 60, 'bg-stack', 'spr-gift-red'),
  splat: game('splat', 'christmas', 50, 'bg-snowball', 'spr-popup-gremlin'),
  dash: game('dash', 'christmas', 60, 'bg-rooftops', '/holidays/sleigh.webp'),
};

const ORDER: ArcadeGameId[] = ['latke', 'spin', 'catch', 'presents', 'splat', 'dash'];

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
