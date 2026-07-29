import { calculateWordScoreByLength } from '@/shared/utils/scoring';

export interface ServerSubmission {
  id: string;
  mode: 'sp' | 'wotd' | 'daily-survival' | 'daily-wordhunt' | 'brain' | 'adventure' | 'blast' | 'connections';
  payload: {
    score: number;
    words?: string[];
    language?: string;
    puzzleDate?: string;
  };
  clientCompletedAt: number;
}

export interface RevalidateResult {
  id: string;
  accepted: boolean;
  finalScore: number;
  rejectedWords: string[];
  reason?: string;
}

export type ServerDictLookup = (word: string, language: string) => Promise<boolean>;

export async function revalidateSubmission(
  submission: ServerSubmission,
  dictLookup: ServerDictLookup,
): Promise<RevalidateResult> {
  const { id, payload } = submission;

  if (!payload.language) {
    return { id, accepted: false, finalScore: 0, rejectedWords: [], reason: 'language_missing' };
  }

  const words = payload.words ?? [];
  if (words.length === 0) {
    return { id, accepted: true, finalScore: 0, rejectedWords: [] };
  }

  const accepted: string[] = [];
  const rejected: string[] = [];
  for (const raw of words) {
    const word = raw.trim();
    if (!word) continue;
    const ok = await dictLookup(word, payload.language);
    if (ok) accepted.push(word);
    else rejected.push(word);
  }

  if (accepted.length === 0 && rejected.length > 0) {
    return {
      id,
      accepted: false,
      finalScore: 0,
      rejectedWords: rejected,
      reason: 'all_words_rejected',
    };
  }

  const finalScore = accepted.reduce((sum, w) => sum + calculateWordScoreByLength(w.length), 0);
  return { id, accepted: true, finalScore, rejectedWords: rejected };
}
