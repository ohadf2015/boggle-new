import { findWordsForBots } from '../modules/boggleSolver';

export type LetterGridLike = string[][];

export interface PickRichestBoardOptions<G extends LetterGridLike> {
  generate: () => G;
  score: (grid: G) => number;
  k: number;
  floor?: number;
}

export function pickRichestBoard<G extends LetterGridLike>(
  opts: PickRichestBoardOptions<G>
): G {
  const { generate, score, k, floor } = opts;

  if (k <= 1) return generate();

  let best: G | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < k; i++) {
    const candidate = generate();
    let s: number;
    try {
      s = score(candidate);
    } catch {
      return best ?? candidate;
    }
    if (s > bestScore) {
      bestScore = s;
      best = candidate;
    }
    if (floor !== undefined && s >= floor) return candidate;
  }

  return best!;
}

export function scoreBoardRichness(grid: LetterGridLike, language: string): number {
  const cats = findWordsForBots(grid as string[][], language);
  return cats.easy.length + cats.hard.length;
}

// Language-aware floor. Hebrew dictionary ~5-7x denser than English,
// so EN floors fire turn-1 for HE and never reroll. Per-lang multiplier.
const LANG_DENSITY: Record<string, number> = {
  en: 1,
  he: 6,
  sv: 1,
  es: 1,
  ja: 1.5,
};

export function richnessFloor(rows: number, cols: number, language: string = 'en'): number {
  const area = rows * cols;
  let base: number;
  if (area <= 16) base = 60;
  else if (area <= 25) base = 110;
  else if (area <= 36) base = 200;
  else base = 300;
  return Math.round(base * (LANG_DENSITY[language] ?? 1));
}

export function generateRichBoard(
  generate: () => LetterGridLike,
  language: string,
  rows: number,
  cols: number,
  k: number = 6
): LetterGridLike {
  return pickRichestBoard({
    generate,
    score: (g) => scoreBoardRichness(g, language),
    k,
    floor: richnessFloor(rows, cols, language),
  });
}
