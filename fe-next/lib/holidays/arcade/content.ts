import type { ArcadeGameId, ArcadePlay } from './games';
import { canSpell, fold, minWordLength, wordLength, wordPoints } from './letters';
import { oilBound } from './oil';

export interface OilContent { rack: string[] }
export interface DreidelContent { racks: string[][]; botWords: string[]; spins: number[] }
export interface StackContent { drops: { letter: string; col: number }[] }
export interface SleighContent { chimneys: string[][] }
export interface SnowballContent { balls: { text: string; real: boolean }[] }
export interface WrapContent { gifts: { letters: string[]; mystery: boolean }[] }

export interface ArcadeContentMap {
  oil: OilContent;
  dreidel: DreidelContent;
  sufganiyah: StackContent;
  sleigh: SleighContent;
  snowball: SnowballContent;
  wrap: WrapContent;
}

export type ArcadeContent = ArcadeContentMap[ArcadeGameId];

type AnyContent = Partial<OilContent & DreidelContent & StackContent & SleighContent & SnowballContent & WrapContent>;

const at = <T>(list: readonly T[] | undefined, i: number | undefined): T | undefined =>
  list && Number.isInteger(i) && (i as number) >= 0 ? list[i as number] : undefined;

export function playFits(game: ArcadeGameId, raw: unknown, play: ArcadePlay, lang: string): boolean {
  const c = raw as AnyContent;
  const w = play.w;
  if (typeof w !== 'string' || wordLength(w, lang) < minWordLength(lang) || wordLength(w, lang) > 15) return false;
  switch (game) {
    case 'oil':
      return canSpell(w, c.rack ?? [], lang);
    case 'dreidel': {
      const rack = at(c.racks, play.i);
      return !!rack && canSpell(w, rack, lang);
    }
    case 'sleigh': {
      const chimney = at(c.chimneys, play.i);
      return !!chimney && canSpell(w, chimney, lang);
    }
    case 'wrap': {
      const gift = at(c.gifts, play.i);
      return !!gift && gift.letters.length === wordLength(w, lang) && canSpell(w, gift.letters, lang);
    }
    case 'snowball': {
      const ball = at(c.balls, play.i);
      return !!ball && ball.real && fold(ball.text, lang) === fold(w, lang);
    }
    case 'sufganiyah':
      return canSpell(w, (c.drops ?? []).map((d) => d.letter), lang);
  }
}

export const playKey = (game: ArcadeGameId, play: ArcadePlay, lang: string) =>
  game === 'oil' || game === 'sufganiyah' ? fold(play.w, lang) : `${play.i}`;

const SNOWBALL_TOSS = 15;
const MAX_COMBO = 3;
const GELT_BONUS = 400;
const WRAP_TIME_BONUS = 2;
const SLEIGH_SPEED_BONUS = 1.5;
const STACK_COMBO = 2;

export function scoreBound(game: ArcadeGameId, raw: unknown, lengths: number[]): number {
  const base = lengths.reduce((a, l) => a + wordPoints(l), 0);
  switch (game) {
    case 'oil':
      return oilBound(lengths);
    case 'snowball':
      return (base + ((raw as SnowballContent).balls ?? []).filter((b) => !b.real).length * SNOWBALL_TOSS) * MAX_COMBO;
    case 'dreidel':
      return base + GELT_BONUS;
    case 'wrap':
      return base * WRAP_TIME_BONUS;
    case 'sleigh':
      return base * SLEIGH_SPEED_BONUS;
    case 'sufganiyah':
      return base * STACK_COMBO;
  }
}
