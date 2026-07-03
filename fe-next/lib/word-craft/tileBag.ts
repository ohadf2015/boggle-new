import type { RackTile } from './types';
import * as en from './tileBags/en';
import * as sv from './tileBags/sv';
import * as he from './tileBags/he';
import * as es from './tileBags/es';
import * as ja from './tileBags/ja';
import { scaleDistribution } from './tileBag.scaler';
import { mulberry32 } from '@/lib/rng/seededRandom';

export const RACK_SIZE = 7;
export const TOTAL_TILES = 100;
export const BLANK_LETTER = '_';

export const ENGLISH_TILE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
  [BLANK_LETTER]: 0,
};

export const ENGLISH_TILE_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1,
  K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6,
  U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
  [BLANK_LETTER]: 2,
};

export type SupportedLocale = 'en' | 'sv' | 'he' | 'es' | 'ja';

type BagData = { values: Record<string, number>; distribution: Record<string, number> };
const BAGS: Record<SupportedLocale, BagData> = { en, sv, he, es, ja };

export function getTileBag(locale: SupportedLocale): BagData {
  return BAGS[locale] ?? BAGS['en'];
}

export interface TileBag {
  tiles: RackTile[];
  rng: () => number;
  nextId: number;
}

export interface CreateBagOptions {
  seed: number;
  locale?: SupportedLocale;
  bagSize?: number;  // when set and < full, scales distribution proportionally
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function createBag(options: CreateBagOptions): TileBag {
  const { values: tileValues, distribution: fullDist } = getTileBag(options.locale ?? 'en');
  const fullTotal = Object.values(fullDist).reduce((a, b) => a + b, 0);
  const distribution =
    options.bagSize !== undefined && options.bagSize < fullTotal
      ? scaleDistribution(fullDist, options.bagSize)
      : fullDist;

  const rng = mulberry32(options.seed);
  const tiles: RackTile[] = [];
  let nextId = 0;
  for (const [letter, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      tiles.push({
        id: `t-${nextId++}`,
        letter,
        value: tileValues[letter] ?? 0,
        isBlank: letter === BLANK_LETTER,
      });
    }
  }
  shuffleInPlace(tiles, rng);
  return { tiles, rng, nextId };
}

export function remaining(bag: TileBag): number {
  return bag.tiles.length;
}

export function isEmpty(bag: TileBag): boolean {
  return bag.tiles.length === 0;
}

export function draw(bag: TileBag, n: number): RackTile[] {
  const count = Math.min(n, bag.tiles.length);
  return bag.tiles.splice(0, count);
}

export function swap(bag: TileBag, returned: RackTile[], rackSize: number = RACK_SIZE): RackTile[] | null {
  if (bag.tiles.length < rackSize) return null;
  const replacements = bag.tiles.splice(0, returned.length);
  bag.tiles.push(...returned);
  shuffleInPlace(bag.tiles, bag.rng);
  return replacements;
}
