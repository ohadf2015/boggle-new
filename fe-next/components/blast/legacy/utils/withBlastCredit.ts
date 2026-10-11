import type { WordFeedback } from '@/components/game/WordFormingArea';

export interface BlastCredit {
  word: string;
  score: number;
}

/** Word feedback whose "+N" matches what Blast actually adds to the score (letter bonus, buffs, treasure). */
export function withBlastCredit(
  feedback: WordFeedback | null,
  credit: BlastCredit | null,
  serverPointsOnly: boolean,
): WordFeedback | null {
  if (!feedback) return null;
  if (serverPointsOnly) return { ...feedback, score: undefined };
  if (feedback.type === 'accepted' && credit && credit.word.toLowerCase() === feedback.word.toLowerCase()) {
    return { ...feedback, score: credit.score };
  }
  return feedback;
}
