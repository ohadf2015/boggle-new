/**
 * previewBoard — client-side, pure, seeded sample board for the teacher's
 * "preview what students will see" step.
 *
 * Mirrors the rules of the live generator (backend/utils/gameUtils.ts) closely
 * enough that what the teacher sees is honest:
 *   - words trace along 8-neighbour paths, never reusing a cell within a word
 *   - a word longer than max(rows, cols) is never embedded (live rule)
 *   - the live game embeds at most max(4, floor(cells / 3)) words per board
 *
 * It must NOT import from `backend/` — webpack breaks on the Node-ESM `.js`
 * specifiers there — so the letter pools are re-declared here.
 */

import { normalizeWord } from '@/shared/utils/wordNormalization';
import { JAPANESE_HIRAGANA_POOL } from '@/shared/constants/japaneseLetters';
import type { VocabularyWord } from '@/lib/supabase/education/types';

export type PreviewBoardSize = 'small' | 'medium' | 'large';

/** Same mapping as classroomHostPreset → DIFFICULTIES (EASY/MEDIUM/HARD). */
export const PREVIEW_BOARD_DIMS: Record<PreviewBoardSize, { rows: number; cols: number }> = {
  small: { rows: 5, cols: 5 },
  medium: { rows: 6, cols: 6 },
  large: { rows: 7, cols: 7 },
};

/** Why a word is not on the sample board. */
export type PreviewSkipReason =
  | 'empty'
  | 'multiWord'
  | 'tooShort'
  | 'tooLong'
  | 'notInDictionary'
  | 'tooLongForBoard'
  | 'notInSample';

export interface PreviewSkippedWord {
  word: string;
  reason: PreviewSkipReason;
}

export interface PreviewPlacement {
  word: string;
  /** [row, col] for each letter, in order. */
  path: [number, number][];
}

export interface PreviewBoardOptions {
  rows: number;
  cols: number;
  words: string[];
  language: string;
  seed: number;
}

export interface PreviewBoardResult {
  grid: string[][];
  embedded: string[];
  placements: PreviewPlacement[];
  skipped: PreviewSkippedWord[];
  seed: number;
}

// Same bounds as hooks/wordIntegrationLogic.ts (the canIntegrate source).
const INTEGRATION_MIN_LENGTH = 3;
const INTEGRATION_MAX_LENGTH = 12;

const DIRECTIONS: readonly [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

// ---------------------------------------------------------------------------
// Letter pools (frequency-weighted where it matters for playability)
// ---------------------------------------------------------------------------

function weightedPool(weights: Record<string, number>): string[] {
  return Object.entries(weights).flatMap(([letter, w]) => Array<string>(w).fill(letter));
}

const ENGLISH_POOL = weightedPool({
  E: 11, A: 8, R: 7, I: 7, O: 7, T: 7, N: 6, S: 6, L: 5, C: 4, U: 4, D: 4,
  P: 3, M: 3, H: 3, G: 2, B: 2, F: 2, Y: 2, W: 2, K: 1, V: 1, X: 1, Z: 1, J: 1, Q: 1,
});

const SWEDISH_POOL = weightedPool({
  E: 10, A: 9, N: 8, R: 8, T: 8, S: 6, L: 5, I: 5, D: 4, O: 4, K: 3, M: 3, G: 3,
  Ä: 2, Ö: 1, Å: 2, V: 2, H: 2, F: 2, U: 2, P: 2, B: 1, C: 1, J: 1, Y: 1, X: 1, W: 1, Z: 1, Q: 1,
});

const SPANISH_POOL = weightedPool({
  E: 13, A: 12, O: 9, S: 8, R: 7, N: 7, I: 6, D: 5, L: 5, C: 4, T: 4, U: 4, M: 3,
  P: 3, B: 2, G: 1, V: 1, Y: 1, Q: 1, H: 1, F: 1, Z: 1, J: 1, Ñ: 1, X: 1, K: 1, W: 1,
});

const RUSSIAN_POOL = weightedPool({
  О: 11, Е: 8, А: 8, И: 7, Н: 7, Т: 6, С: 5, Р: 5, В: 5, Л: 4, К: 3, М: 3, Д: 3, П: 3, У: 3,
  Я: 2, Ы: 2, Ь: 2, Г: 2, З: 2, Б: 2, Ч: 1, Й: 1, Х: 1, Ж: 1, Ш: 1, Ю: 1, Ц: 1, Щ: 1, Э: 1, Ф: 1,
});

const HEBREW_POOL = weightedPool({
  י: 9, ו: 8, ה: 7, א: 6, ל: 6, מ: 6, ר: 6, ת: 5, ב: 4, ש: 4, נ: 4, ד: 3, ע: 3, כ: 3,
  ק: 2, ס: 2, פ: 2, ח: 2, ג: 2, צ: 1, ז: 1, ט: 1,
});

function poolFor(language: string): string[] {
  switch (language) {
    case 'he': return HEBREW_POOL;
    case 'es': return SPANISH_POOL;
    case 'sv': return SWEDISH_POOL;
    case 'ru': return RUSSIAN_POOL;
    case 'ja': return JAPANESE_HIRAGANA_POOL;
    case 'en':
    default:
      return ENGLISH_POOL;
  }
}

/** How a letter is written on a tile (uppercase for cased scripts, regular form for Hebrew). */
function boardLetter(letter: string, language: string): string {
  switch (language) {
    case 'he':
      return normalizeWord(letter, 'he');
    case 'ja':
      return letter;
    default:
      return letter.toUpperCase();
  }
}

function normalizeForCompare(text: string, language: string): string {
  return normalizeWord(text, language as Parameters<typeof normalizeWord>[1]);
}

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32) — determinism is what makes "Shuffle" meaningful
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Traceability
// ---------------------------------------------------------------------------

/**
 * True when `word` can be traced on `grid` along 8-neighbour steps without
 * visiting the same cell twice. Both sides are normalised for `language`.
 */
export function isWordOnBoard(word: string, grid: string[][], language: string): boolean {
  if (!word || !grid || grid.length === 0) return false;
  const target = normalizeForCompare(word, language);
  if (!target) return false;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const cells = grid.map((row) => row.map((cell) => normalizeForCompare(cell, language)));
  const visited = new Set<string>();

  const dfs = (r: number, c: number, index: number): boolean => {
    if (index === target.length) return true;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const key = `${r},${c}`;
    if (visited.has(key) || cells[r][c] !== target[index]) return false;
    visited.add(key);
    for (const [dr, dc] of DIRECTIONS) {
      if (dfs(r + dr, c + dc, index + 1)) {
        visited.delete(key);
        return true;
      }
    }
    visited.delete(key);
    return false;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

function tryEmbed(
  grid: (string | null)[][],
  letters: string[],
  rows: number,
  cols: number,
  rng: () => number
): [number, number][] | null {
  const path: [number, number][] = [];
  const visited = new Set<string>();

  const dfs = (r: number, c: number, index: number): boolean => {
    if (index === letters.length) return true;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const key = `${r},${c}`;
    if (visited.has(key)) return false;
    const existing = grid[r][c];
    if (existing !== null && existing !== letters[index]) return false;
    visited.add(key);
    path.push([r, c]);
    for (const [dr, dc] of shuffled(DIRECTIONS, rng)) {
      if (dfs(r + dr, c + dc, index + 1)) return true;
    }
    visited.delete(key);
    path.pop();
    return false;
  };

  const starts = shuffled(
    Array.from({ length: rows * cols }, (_, i) => [Math.floor(i / cols), i % cols] as [number, number]),
    rng
  );
  for (const [r, c] of starts) {
    if (dfs(r, c, 0)) {
      path.forEach(([pr, pc], i) => {
        grid[pr][pc] = letters[i];
      });
      return [...path];
    }
  }
  return null;
}

/** Word budget the live generator uses per board. */
export function previewWordBudget(rows: number, cols: number): number {
  return Math.max(4, Math.floor((rows * cols) / 3));
}

/**
 * Build a seeded sample board with as many of `words` embedded as the live
 * rules allow, and report exactly which words did not make it and why.
 */
export function generatePreviewBoard({
  rows,
  cols,
  words,
  language,
  seed,
}: PreviewBoardOptions): PreviewBoardResult {
  const rng = mulberry32(seed);
  const pool = poolFor(language);
  const grid: (string | null)[][] = Array.from({ length: rows }, () => Array<string | null>(cols).fill(null));
  const skipped: PreviewSkippedWord[] = [];
  const candidates: { word: string; letters: string[] }[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(rows, cols);

  for (const raw of words) {
    const word = (raw ?? '').trim();
    if (!word) {
      skipped.push({ word: raw ?? '', reason: 'empty' });
      continue;
    }
    if (/[\s\-–—]/.test(word)) {
      skipped.push({ word, reason: 'multiWord' });
      continue;
    }
    const compareKey = normalizeForCompare(word, language);
    if (seen.has(compareKey)) continue;
    seen.add(compareKey);
    const letters = Array.from(compareKey).map((ch) => boardLetter(ch, language));
    if (letters.length > maxLen) {
      skipped.push({ word, reason: 'tooLongForBoard' });
      continue;
    }
    candidates.push({ word, letters });
  }

  // Longest first (as the server does) so long words get the open board.
  candidates.sort((a, b) => b.letters.length - a.letters.length);

  const budget = previewWordBudget(rows, cols);
  const placements: PreviewPlacement[] = [];
  const embedded: string[] = [];

  for (const candidate of candidates) {
    if (embedded.length >= budget) {
      skipped.push({ word: candidate.word, reason: 'notInSample' });
      continue;
    }
    const path = tryEmbed(grid, candidate.letters, rows, cols, rng);
    if (path) {
      placements.push({ word: candidate.word, path });
      embedded.push(candidate.word);
    } else {
      skipped.push({ word: candidate.word, reason: 'notInSample' });
    }
  }

  const filled: string[][] = grid.map((row) =>
    row.map((cell) => cell ?? pool[Math.floor(rng() * pool.length)])
  );

  // Belt and braces: a placed path is traceable by construction, but never
  // show the teacher a "hidden word" the student could not actually find.
  const verifiedEmbedded = embedded.filter((w) => isWordOnBoard(w, filled, language));
  for (const w of embedded) {
    if (!verifiedEmbedded.includes(w)) skipped.push({ word: w, reason: 'notInSample' });
  }

  return {
    grid: filled,
    embedded: verifiedEmbedded,
    placements: placements.filter((p) => verifiedEmbedded.includes(p.word)),
    skipped,
    seed,
  };
}

// ---------------------------------------------------------------------------
// Lesson-word triage (canIntegrate is stored, its reason is not)
// ---------------------------------------------------------------------------

export interface LessonWordTriage {
  /** Words the teacher marked integrable, de-duplicated (first spelling wins). */
  integrable: string[];
  /** Non-integrable words with the most likely reason, in lesson order. */
  skipped: PreviewSkippedWord[];
}

/**
 * Re-derives, from the same bounds the integration check uses, why a stored
 * `canIntegrate: false` word was rejected — the lesson only stores the flag.
 */
export function classifyLessonWords(
  words: Pick<VocabularyWord, 'word' | 'canIntegrate'>[]
): LessonWordTriage {
  const integrable: string[] = [];
  const skipped: PreviewSkippedWord[] = [];
  const seen = new Set<string>();

  for (const { word, canIntegrate } of words) {
    const trimmed = (word ?? '').trim();
    if (canIntegrate) {
      const key = trimmed.toLowerCase();
      if (trimmed && !seen.has(key)) {
        seen.add(key);
        integrable.push(trimmed);
      }
      continue;
    }
    let reason: PreviewSkipReason;
    if (!trimmed) reason = 'empty';
    else if (/[\s\-–—]/.test(trimmed)) reason = 'multiWord';
    else if (trimmed.length < INTEGRATION_MIN_LENGTH) reason = 'tooShort';
    else if (trimmed.length > INTEGRATION_MAX_LENGTH) reason = 'tooLong';
    else reason = 'notInDictionary';
    skipped.push({ word: trimmed || word, reason });
  }

  return { integrable, skipped };
}
