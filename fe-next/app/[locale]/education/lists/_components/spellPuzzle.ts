import type { ListLang } from '@/lib/seo/wordLists/model';

export interface Slot {
  char: string;
  fixed: boolean;
}

export interface Tile {
  id: number;
  char: string;
}

export interface Puzzle {
  word: string;
  slots: Slot[];
  tiles: Tile[];
}

/** Tile id per slot; fixed slots stay null. */
export type Answer = Array<number | null>;

const FIXED = /^[\s\-'’.,·・]$/u;

type GraphemeSegmenter = new (locale: undefined, opts: { granularity: 'grapheme' }) => {
  segment: (text: string) => Iterable<{ segment: string }>;
};
const Segmenter = (globalThis.Intl as unknown as { Segmenter?: GraphemeSegmenter } | undefined)?.Segmenter;

export function graphemes(word: string): string[] {
  const text = word.normalize('NFC');
  if (Segmenter) return [...new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment);
  return Array.from(text);
}

const fold = (c: string) => c.normalize('NFC').toLocaleLowerCase();
export const sameChar = (a: string, b: string) => fold(a) === fold(b);

export function buildPuzzle(word: string, rand: () => number = Math.random): Puzzle {
  const chars = graphemes(word.trim());
  const slots = chars.map((char) => ({ char, fixed: FIXED.test(char) }));
  const tiles = slots.filter((s) => !s.fixed).map((s, id) => ({ id, char: s.char }));
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const target = slots.filter((s) => !s.fixed).map((s) => s.char);
  const inOrder = () => tiles.every((t, i) => sameChar(t.char, target[i]));
  if (tiles.length > 1 && new Set(target.map(fold)).size > 1) {
    for (let k = 0; k < tiles.length && inOrder(); k++) tiles.push(tiles.shift()!);
  }
  return { word, slots, tiles };
}

export const hasTiles = (word: string) => graphemes(word.trim()).some((c) => !FIXED.test(c));

export const emptyAnswer = (p: Puzzle): Answer => p.slots.map(() => null);

export function nextOpenSlot(p: Puzzle, answer: Answer): number {
  return p.slots.findIndex((s, i) => !s.fixed && answer[i] == null);
}

export const isFull = (p: Puzzle, answer: Answer) => nextOpenSlot(p, answer) === -1;

export function placeTile(p: Puzzle, answer: Answer, tileId: number): Answer {
  const at = nextOpenSlot(p, answer);
  if (at === -1 || answer.includes(tileId)) return answer;
  const next = [...answer];
  next[at] = tileId;
  return next;
}

export function removeAt(p: Puzzle, answer: Answer, slot: number): Answer {
  if (p.slots[slot]?.fixed || answer[slot] == null) return answer;
  const next = [...answer];
  next[slot] = null;
  return next;
}

export function removeLast(p: Puzzle, answer: Answer): Answer {
  for (let i = answer.length - 1; i >= 0; i--) if (answer[i] != null) return removeAt(p, answer, i);
  return answer;
}

export function tileForKey(p: Puzzle, answer: Answer, key: string): number | null {
  if (graphemes(key).length !== 1) return null;
  return p.tiles.find((t) => !answer.includes(t.id) && sameChar(t.char, key))?.id ?? null;
}

/** Per slot, in logical (reading) order: did the child put the right letter there? */
export function gradeAnswer(p: Puzzle, answer: Answer): boolean[] {
  return p.slots.map((s, i) => {
    if (s.fixed) return true;
    const tile = p.tiles.find((t) => t.id === answer[i]);
    return !!tile && sameChar(tile.char, s.char);
  });
}

/** Slot indexes split at spaces, so a phrase wraps between words, never inside one. */
export function wordGroups(p: Puzzle): number[][] {
  const groups: number[][] = [[]];
  p.slots.forEach((s, i) => {
    if (/\s/.test(s.char)) groups.push([]);
    else groups[groups.length - 1].push(i);
  });
  return groups.filter((g) => g.length > 0);
}

const VOICE: Record<ListLang, string> = { en: 'en-US', he: 'he-IL', es: 'es-ES', sv: 'sv-SE', ja: 'ja-JP' };
export const speechLang = (lang: string) => VOICE[lang as ListLang] ?? 'en-US';
