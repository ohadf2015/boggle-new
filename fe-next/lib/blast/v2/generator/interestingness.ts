import type { BlastLevel } from '../types';

export const INTERESTINGNESS_THRESHOLD = 0.55;

const WEIGHTS = {
  chain: 0.35,
  silhouette: 0.20,
  dependency: 0.20,
  diversity: 0.15,
  surprise: 0.10,
};

export function interestingnessScore(level: BlastLevel): number {
  const chain = chainScore(level);
  const silhouette = silhouetteScore(level);
  const dependency = dependencyScore(level);
  const diversity = diversityScore(level);
  const surprise = surpriseScore(level);

  return (
    WEIGHTS.chain * chain +
    WEIGHTS.silhouette * silhouette +
    WEIGHTS.dependency * dependency +
    WEIGHTS.diversity * diversity +
    WEIGHTS.surprise * surprise
  );
}

function chainScore(level: BlastLevel): number {
  const wordCount = level.words.length;
  const maxWords = Math.max(2, level.columns.length);
  return Math.min(1, wordCount / maxWords);
}

function silhouetteScore(level: BlastLevel): number {
  if (level.columns.length === 0) return 0;
  const heights = level.columns.map((c) => c.tiles.length);
  const max = Math.max(...heights);
  const min = Math.min(...heights);
  const range = Math.max(1, max - 1);
  return Math.min(1, (max - min) / range);
}

function dependencyScore(level: BlastLevel): number {
  const allLetters = level.columns.flatMap((c) => c.tiles);
  if (allLetters.length === 0) return 0;
  const uniqueLetters = new Set(allLetters).size;
  return Math.min(1, 1 - uniqueLetters / allLetters.length);
}

function diversityScore(level: BlastLevel): number {
  const allLetters = level.columns.flatMap((c) => c.tiles);
  if (allLetters.length === 0) return 0;
  const freq: Record<string, number> = {};
  for (const letter of allLetters) {
    freq[letter] = (freq[letter] ?? 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / allLetters.length;
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(26);
  return Math.min(1, entropy / maxEntropy);
}

function surpriseScore(level: BlastLevel): number {
  if (level.hasPivot) return 1;
  return Math.min(1, level.words.length / 8);
}
