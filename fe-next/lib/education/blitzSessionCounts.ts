export interface BlitzRoundCounts {
  cardsReviewed?: number;
  cardsCorrect?: number;
}

export interface BlitzSessionColumns {
  words_attempted?: number;
  words_correct?: number;
  accuracy?: number | null;
}

/** Blitz finishes with the shared card counts, but its row and XP are read from the word columns. */
export function blitzSessionCounts({ cardsReviewed, cardsCorrect }: BlitzRoundCounts): BlitzSessionColumns {
  if (cardsReviewed === undefined) return {};
  const attempted = Math.max(0, Math.floor(cardsReviewed));
  const correct = Math.min(attempted, Math.max(0, Math.floor(cardsCorrect ?? 0)));
  return {
    words_attempted: attempted,
    words_correct: correct,
    accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : null,
  };
}
