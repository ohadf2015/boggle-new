import { WORDLE_ANSWERS } from './answers';

export type Clue = { guess: string; pattern: string };

const MARKS = ['b', 'y', 'g'] as const;

function scoreCode(guess: string, answer: string): number {
  const marks = [0, 0, 0, 0, 0];
  const left: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) marks[i] = 2;
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (marks[i] === 0 && left[guess[i]]) {
      marks[i] = 1;
      left[guess[i]]--;
    }
  }
  return marks.reduce((code, m) => code * 3 + m, 0);
}

export function scoreGuess(guess: string, answer: string): string {
  let code = scoreCode(guess, answer);
  let out = '';
  for (let i = 0; i < 5; i++) {
    out = MARKS[code % 3] + out;
    code = Math.floor(code / 3);
  }
  return out;
}

export function filterCandidates(words: readonly string[], clues: readonly Clue[]): string[] {
  return words.filter((w) => clues.every((c) => scoreGuess(c.guess, w) === c.pattern));
}

// Precomputed bestGuess(WORDLE_ANSWERS); scoring every answer against every answer is too slow for a page load.
export const OPENER = 'trace';

export function bestGuess(candidates: readonly string[], pool: readonly string[] = WORDLE_ANSWERS): string {
  if (candidates.length <= 2) return candidates[0];
  const isCandidate = new Set(candidates);
  let best = candidates[0];
  let bestScore = -Infinity;
  const buckets = new Uint16Array(243);
  for (const guess of [...candidates, ...pool]) {
    buckets.fill(0);
    let groups = 0;
    for (const answer of candidates) {
      const code = scoreCode(guess, answer);
      if (buckets[code]++ === 0) groups++;
    }
    const score = groups * 2 + (isCandidate.has(guess) ? 1 : 0);
    if (score > bestScore) {
      best = guess;
      bestScore = score;
      if (groups === candidates.length) break;
    }
  }
  return best;
}

export function nextGuess(clues: readonly Clue[]): { guess: string | undefined; candidates: string[] } {
  const candidates = filterCandidates(WORDLE_ANSWERS, clues);
  const guess = clues.length === 0 ? OPENER : bestGuess(candidates);
  return { guess, candidates };
}

export function solve(answer: string, maxGuesses = 10): string[] {
  const clues: Clue[] = [];
  const guesses: string[] = [];
  while (guesses.length < maxGuesses) {
    const { guess } = nextGuess(clues);
    if (!guess) break;
    guesses.push(guess);
    if (guess === answer) break;
    clues.push({ guess, pattern: scoreGuess(guess, answer) });
  }
  return guesses;
}
