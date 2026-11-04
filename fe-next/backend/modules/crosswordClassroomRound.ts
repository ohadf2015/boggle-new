/**
 * A crossword race reports progress, not words. For the classroom recap a
 * solved grid means every answer was found; an unsolved one credits nothing.
 */

interface CrosswordRaceState {
  puzzle: unknown;
  progress: Record<string, { solved: boolean }>;
}

export interface CrosswordClassroomWords {
  /** Lesson words that are answers in this grid: the only ones the round could produce. */
  placedWords: string[];
  wordDetailsFor(username: string): Array<{ word: string; validated: boolean }>;
}

function answersOf(puzzle: unknown): string[] {
  const slots = (puzzle as { slots?: Array<{ answer?: unknown }> } | null)?.slots ?? [];
  return slots.flatMap((s) => (typeof s.answer === 'string' && s.answer ? [s.answer.toLowerCase()] : []));
}

export function crosswordClassroomWords(state: CrosswordRaceState | null | undefined, lessonWords: readonly string[]): CrosswordClassroomWords | null {
  if (!state) return null;
  const answers = answersOf(state.puzzle);
  const onGrid = new Set(answers);
  return {
    placedWords: lessonWords.filter((w) => onGrid.has(w.toLowerCase())),
    wordDetailsFor: (username) => (state.progress[username]?.solved ? answers.map((word) => ({ word, validated: true })) : []),
  };
}
