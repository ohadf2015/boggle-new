import {
  ENGLISH_LETTER_WEIGHTS,
  HEBREW_LETTER_WEIGHTS,
  SWEDISH_LETTER_WEIGHTS,
  VOWELS,
  SWEDISH_VOWELS,
} from './adventure/gridConstants';

type Grid = string[][];

const HEBREW_VOWELS = ['א', 'ה', 'ו', 'י']; // matres lectionis
const TARGET_VOWEL_RATIO = 0.36;

function getWeights(lang: string): Record<string, number> {
  if (lang === 'he') return HEBREW_LETTER_WEIGHTS;
  if (lang === 'sv') return SWEDISH_LETTER_WEIGHTS;
  return ENGLISH_LETTER_WEIGHTS;
}

function getVowels(lang: string): string[] {
  if (lang === 'he') return HEBREW_VOWELS;
  if (lang === 'sv') return SWEDISH_VOWELS;
  return VOWELS;
}

export function scoreBoardHeuristic(grid: Grid, language: string): number {
  if (!Array.isArray(grid) || grid.length === 0) return 0;

  const weights = getWeights(language);
  const vowels = getVowels(language);
  const vowelSet = new Set(vowels);

  let weightSum = 0;
  let vowelCount = 0;
  let total = 0;
  const counts: Record<string, number> = {};

  for (const row of grid) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      const upper = language === 'he' ? cell : cell.toUpperCase();
      total++;
      weightSum += weights[upper] ?? 1;
      if (vowelSet.has(upper)) vowelCount++;
      counts[upper] = (counts[upper] ?? 0) + 1;
    }
  }

  if (total === 0) return 0;

  const vowelRatio = vowelCount / total;
  const vowelDeviation = Math.abs(vowelRatio - TARGET_VOWEL_RATIO);
  const vowelBonus = Math.max(0, 1 - vowelDeviation * 3) * total * 2;

  const cap = Math.max(2, Math.floor(total / 4));
  let dupePenalty = 0;
  for (const c of Object.values(counts)) {
    if (c > cap) dupePenalty += (c - cap) * 3;
  }

  return weightSum + vowelBonus - dupePenalty;
}

export function pickRichestBoardClient<G extends Grid>(
  generate: () => G,
  language: string,
  k: number = 3
): G {
  if (k <= 1) return generate();

  let best: G | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < k; i++) {
    const candidate = generate();
    const s = scoreBoardHeuristic(candidate, language);
    if (s > bestScore) {
      bestScore = s;
      best = candidate;
    }
  }
  return best!;
}
