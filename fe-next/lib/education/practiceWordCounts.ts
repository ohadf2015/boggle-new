export interface PracticeRoundCounts {
  cardsReviewed?: number;
  cardsCorrect?: number;
}

export interface PracticeWordColumns {
  words_attempted?: number;
  words_correct?: number;
  accuracy?: number | null;
}

/** Report columns only. These counts are client-reported, so they must never feed XP. */
export function practiceWordCounts({ cardsReviewed, cardsCorrect }: PracticeRoundCounts): PracticeWordColumns {
  if (cardsReviewed === undefined) return {};
  const attempted = Math.max(0, Math.floor(cardsReviewed));
  const correct = Math.min(attempted, Math.max(0, Math.floor(cardsCorrect ?? 0)));
  return {
    words_attempted: attempted,
    words_correct: correct,
    accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : null,
  };
}
