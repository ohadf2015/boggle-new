import type { Tile } from '../types';
import { PROTO_DICT_EN } from './__protoDict';

const MIN_WORD_LEN = 3;

export function isValidWord(word: string): boolean {
  const w = word.trim().toUpperCase();
  if (w.length < MIN_WORD_LEN) return false;
  return PROTO_DICT_EN.has(w);
}

export function isComposableFromTiles(word: string, tiles: Tile[]): boolean {
  const need = word.toUpperCase().split('');
  const have = tiles.map((t) => t.letter.toUpperCase());
  const haveCount = new Map<string, number>();
  have.forEach((l) => haveCount.set(l, (haveCount.get(l) ?? 0) + 1));
  for (const letter of need) {
    const c = haveCount.get(letter) ?? 0;
    if (c <= 0) return false;
    haveCount.set(letter, c - 1);
  }
  return true;
}
