// A sparse crossword dealt from a teacher's lesson words and their own clues — never a dictionary fill.

import { buildGrid } from './grid';
import { normalizeCell } from './answer';
import { mulberry32 } from '@/lib/rng/seededRandom';
import type { CrosswordPuzzle, Direction, PuzzleLocale } from './types';

export const MIN_LESSON_CROSSWORD_WORDS = 3;
export const MAX_LESSON_CROSSWORD_SIZE = 13;
const MAX_LESSON_CROSSWORD_WORDS = 14;

export interface LessonCrosswordEntry {
  word: string;
  clue: string;
}

export interface LessonWordFields {
  word: string;
  definition?: string;
  example?: string;
  synonyms?: string[];
}

export type LessonCrosswordResult =
  | { ok: true; puzzle: CrosswordPuzzle; lessonWordBySlot: Record<string, string> }
  | { ok: false; reason: 'tooFewWords'; usableWords: number };

interface Candidate {
  display: string;
  letters: string[];
  clue: string;
}

interface Placement {
  candidate: Candidate;
  row: number;
  col: number;
  dir: Direction;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function lessonClueOf(word: LessonWordFields): string {
  const definition = word.definition?.trim();
  if (definition) return definition;
  const example = word.example?.trim();
  const target = word.word.trim();
  if (example && target) {
    const blanked = example.replace(new RegExp(escapeRegExp(target), 'giu'), '____');
    if (blanked !== example) return blanked;
  }
  return (word.synonyms ?? []).map((s) => s.trim()).filter(Boolean).join(', ');
}

const HEBREW_POINTS = /[֑-ׇ]/g;
const LETTER = /^[\p{L}ー]$/u;

function lettersOf(word: string, locale: PuzzleLocale): string[] | null {
  const chars = Array.from(word.normalize('NFC').replace(HEBREW_POINTS, '').trim());
  if (chars.length < 2) return null;
  const letters = chars.map((c) => normalizeCell(c, locale));
  return letters.every((l) => LETTER.test(l)) ? letters : null;
}

function candidatesOf(entries: readonly LessonCrosswordEntry[], locale: PuzzleLocale): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const entry of entries) {
    const clue = entry.clue?.trim();
    if (!clue) continue;
    const letters = lettersOf(entry.word, locale);
    if (!letters || letters.length > MAX_LESSON_CROSSWORD_SIZE) continue;
    const key = letters.join('');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ display: entry.word.trim(), letters, clue });
  }
  return out;
}

class SparseGrid {
  private letters = new Map<string, string>();
  private dirs = new Map<string, Set<Direction>>();
  minRow = 0;
  maxRow = 0;
  minCol = 0;
  maxCol = 0;

  private static key(r: number, c: number): string {
    return `${r},${c}`;
  }

  at(r: number, c: number): string | undefined {
    return this.letters.get(SparseGrid.key(r, c));
  }

  get empty(): boolean {
    return this.letters.size === 0;
  }

  /** Crossings when the word fits without touching anything except where it crosses; -1 when it does not fit. */
  fit(p: Placement): number {
    const { letters } = p.candidate;
    const dr = p.dir === 'down' ? 1 : 0;
    const dc = p.dir === 'across' ? 1 : 0;
    if (this.at(p.row - dr, p.col - dc) !== undefined) return -1;
    if (this.at(p.row + dr * letters.length, p.col + dc * letters.length) !== undefined) return -1;
    let crossings = 0;
    for (let i = 0; i < letters.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      const existing = this.at(r, c);
      if (existing !== undefined) {
        if (existing !== letters[i] || this.dirs.get(SparseGrid.key(r, c))?.has(p.dir)) return -1;
        crossings += 1;
        continue;
      }
      if (this.at(r + dc, c + dr) !== undefined || this.at(r - dc, c - dr) !== undefined) return -1;
    }
    if (crossings === letters.length) return -1;
    const rows = Math.max(this.maxRow, p.row + dr * (letters.length - 1)) - Math.min(this.minRow, p.row) + 1;
    const cols = Math.max(this.maxCol, p.col + dc * (letters.length - 1)) - Math.min(this.minCol, p.col) + 1;
    if (!this.empty && Math.max(rows, cols) > MAX_LESSON_CROSSWORD_SIZE) return -1;
    return crossings;
  }

  place(p: Placement): void {
    const dr = p.dir === 'down' ? 1 : 0;
    const dc = p.dir === 'across' ? 1 : 0;
    p.candidate.letters.forEach((letter, i) => {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      const k = SparseGrid.key(r, c);
      this.letters.set(k, letter);
      if (!this.dirs.has(k)) this.dirs.set(k, new Set());
      this.dirs.get(k)!.add(p.dir);
      if (this.letters.size === 1) {
        this.minRow = this.maxRow = r;
        this.minCol = this.maxCol = c;
      }
      this.minRow = Math.min(this.minRow, r);
      this.maxRow = Math.max(this.maxRow, r);
      this.minCol = Math.min(this.minCol, c);
      this.maxCol = Math.max(this.maxCol, c);
    });
  }

  /** Every placement crossing a letter already on the grid, best (most crossings, most compact) first. */
  options(candidate: Candidate, rand: () => number): Placement[] {
    const scored: Array<{ p: Placement; score: number }> = [];
    for (const [k, letter] of this.letters) {
      const [r, c] = k.split(',').map(Number) as [number, number];
      candidate.letters.forEach((l, i) => {
        if (l !== letter) return;
        for (const dir of ['across', 'down'] as const) {
          const p: Placement = { candidate, dir, row: dir === 'down' ? r - i : r, col: dir === 'across' ? c - i : c };
          const crossings = this.fit(p);
          if (crossings <= 0) continue;
          const spread = Math.max(this.maxRow - this.minRow, this.maxCol - this.minCol);
          scored.push({ p, score: crossings * 10 - spread * 0.1 + rand() * 0.01 });
        }
      });
    }
    return scored.sort((a, b) => b.score - a.score).map((s) => s.p);
  }
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function layOut(candidates: Candidate[], rand: () => number): { grid: SparseGrid; placed: Placement[] } {
  const grid = new SparseGrid();
  const placed: Placement[] = [];
  const order = shuffled(candidates, rand).sort((a, b) => b.letters.length - a.letters.length);
  let pending = order;
  for (let pass = 0; pass < 3 && pending.length > 0 && placed.length < MAX_LESSON_CROSSWORD_WORDS; pass++) {
    const skipped: Candidate[] = [];
    for (const candidate of pending) {
      if (placed.length >= MAX_LESSON_CROSSWORD_WORDS) break;
      const p = grid.empty ? { candidate, row: 0, col: 0, dir: 'across' as const } : grid.options(candidate, rand)[0];
      if (!p) {
        skipped.push(candidate);
        continue;
      }
      grid.place(p);
      placed.push(p);
    }
    pending = skipped;
  }
  return { grid, placed };
}

export interface BuildLessonCrosswordOptions {
  entries: readonly LessonCrosswordEntry[];
  locale: PuzzleLocale;
  seed: number;
  id: string;
}

export function buildLessonCrossword({ entries, locale, seed, id }: BuildLessonCrosswordOptions): LessonCrosswordResult {
  const candidates = candidatesOf(entries, locale);
  const refusal = { ok: false as const, reason: 'tooFewWords' as const, usableWords: candidates.length };
  if (candidates.length < MIN_LESSON_CROSSWORD_WORDS) return refusal;

  let best: { grid: SparseGrid; placed: Placement[] } | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const layout = layOut(candidates, mulberry32((seed + attempt * 7919) >>> 0));
    if (!best || layout.placed.length > best.placed.length) best = layout;
    if (layout.placed.length === Math.min(candidates.length, MAX_LESSON_CROSSWORD_WORDS)) break;
  }
  if (!best || best.placed.length < MIN_LESSON_CROSSWORD_WORDS) return refusal;

  const { grid, placed } = best;
  const height = grid.maxRow - grid.minRow + 1;
  const width = grid.maxCol - grid.minCol + 1;
  const size = Math.max(height, width);
  const top = grid.minRow - Math.floor((size - height) / 2);
  const left = grid.minCol - Math.floor((size - width) / 2);
  const solution = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => grid.at(r + top, c + left) ?? null));
  const built = buildGrid({ rtl: locale === 'he', solution });

  const lessonWordBySlot: Record<string, string> = {};
  const slots = built.slots.map((slot) => {
    const p = placed.find((pl) => pl.dir === slot.dir && pl.row - top === slot.row && pl.col - left === slot.col);
    if (p) lessonWordBySlot[slot.id] = p.candidate.display;
    return p ? { ...slot, clue: p.candidate.clue } : slot;
  });
  if (slots.length !== placed.length || Object.keys(lessonWordBySlot).length !== placed.length) return refusal;

  return {
    ok: true,
    lessonWordBySlot,
    puzzle: { id, locale, size, rtl: locale === 'he', cells: built.cells, slots, difficulty: 'easy', source: 'generated' },
  };
}
