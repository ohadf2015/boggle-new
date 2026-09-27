import { generatePreviewBoard, isWordOnBoard } from './previewBoard';

export const PRACTICE_BOARD_MAX_ATTEMPTS = 12;

export interface PlayablePracticeBoard {
  grid: string[][];
  embedded: string[];
  seed: number;
}

/**
 * Build a practice letter grid that contains at least one placeable lesson
 * word. Retries incrementing seeds, capped, deterministic for a given seed.
 * Returns null when the lesson's words can never fit (too long, empty, etc.).
 */
export function generatePlayablePracticeBoard(opts: {
  words: readonly string[];
  language: string;
  rows: number;
  cols: number;
  seed?: number;
  maxAttempts?: number;
}): PlayablePracticeBoard | null {
  const maxAttempts = opts.maxAttempts ?? PRACTICE_BOARD_MAX_ATTEMPTS;
  const startSeed = opts.seed ?? 1;
  const candidates = opts.words.map((word) => word.trim()).filter(Boolean);
  if (candidates.length === 0) return null;

  for (let i = 0; i < maxAttempts; i++) {
    const seed = startSeed + i;
    const result = generatePreviewBoard({
      rows: opts.rows,
      cols: opts.cols,
      words: [...candidates],
      language: opts.language,
      seed,
    });
    const placed = result.embedded.filter((word) =>
      isWordOnBoard(word, result.grid, opts.language),
    );
    if (placed.length > 0) {
      return { grid: result.grid, embedded: placed, seed: result.seed };
    }
  }
  return null;
}
