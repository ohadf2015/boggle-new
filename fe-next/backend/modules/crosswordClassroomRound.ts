/**
 * A crossword race reports progress, not words. For the classroom recap each
 * solved clue counts as that word found; a solved grid means every clue.
 */

interface CrosswordRaceState {
  puzzle: unknown;
  progress: Record<string, { solved: boolean; solvedSlotIds?: string[] }>;
  lessonWordBySlot?: Record<string, string>;
}

export interface CrosswordClassroomWords {
  /** Lesson words that are answers in this grid: the only ones the round could produce. */
  placedWords: string[];
  wordDetailsFor(username: string): Array<{ word: string; validated: boolean }>;
}

function slotWords(state: CrosswordRaceState): Array<{ id: string; word: string }> {
  const slots = (state.puzzle as { slots?: Array<{ id?: unknown; answer?: unknown }> } | null)?.slots ?? [];
  return slots.flatMap((s) => {
    const id = typeof s.id === 'string' ? s.id : '';
    const word = state.lessonWordBySlot?.[id] ?? (typeof s.answer === 'string' ? s.answer.toLowerCase() : '');
    return word ? [{ id, word }] : [];
  });
}

export function crosswordClassroomWords(state: CrosswordRaceState | null | undefined, lessonWords: readonly string[]): CrosswordClassroomWords | null {
  if (!state) return null;
  const words = slotWords(state);
  const onGrid = new Set(words.map((w) => w.word.toLowerCase()));
  return {
    placedWords: lessonWords.filter((w) => onGrid.has(w.toLowerCase())),
    wordDetailsFor: (username) => {
      const progress = state.progress[username];
      if (!progress) return [];
      const solved = new Set(progress.solvedSlotIds ?? []);
      return words
        .filter((w) => progress.solved || solved.has(w.id))
        .map(({ word }) => ({ word, validated: true }));
    },
  };
}
