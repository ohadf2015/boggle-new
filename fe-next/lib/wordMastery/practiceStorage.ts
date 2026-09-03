export const MASTERY_PRACTICE_KEY = 'word_mastery_practice';

export interface MasteryPracticeRound {
  grid: string[][];
  seedWords: string[];
}

function isGrid(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'),
    )
  );
}

export function writeMasteryPracticeRound(payload: MasteryPracticeRound): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(MASTERY_PRACTICE_KEY, JSON.stringify(payload));
}

export function consumeMasteryPracticeRound(): MasteryPracticeRound | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(MASTERY_PRACTICE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(MASTERY_PRACTICE_KEY);
  try {
    const parsed = JSON.parse(raw) as Partial<MasteryPracticeRound>;
    if (!isGrid(parsed.grid) || !Array.isArray(parsed.seedWords)) return null;
    return {
      grid: parsed.grid,
      seedWords: parsed.seedWords.filter((w): w is string => typeof w === 'string'),
    };
  } catch {
    return null;
  }
}
