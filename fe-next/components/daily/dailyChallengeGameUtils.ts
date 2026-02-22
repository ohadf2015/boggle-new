export interface DailyChallengeGameResult {
  score: number;
  wordCount: number;
  wordsByLength: Record<number, number>;
  timeSeconds: number;
  words: string[];
  longestWord: string;
}

interface FoundWord {
  word: string;
  score: number;
  isValid: boolean | null;
}

/** Computes the final game result from found words and elapsed time. */
export function buildGameResult(
  foundWords: FoundWord[],
  timeElapsedSeconds: number,
): DailyChallengeGameResult {
  // Treat pending (isValid: null) as invalid — no AI validation in daily mode
  const validWords = foundWords.filter(w => w.isValid === true);
  const finalScore = validWords.reduce((sum, w) => sum + w.score, 0);
  const words = validWords.map(w => w.word);

  const wordsByLength: Record<number, number> = {};
  words.forEach(word => {
    const len = word.length;
    wordsByLength[len] = (wordsByLength[len] || 0) + 1;
  });

  const longestWord = words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    '',
  );

  return {
    score: finalScore,
    wordCount: words.length,
    wordsByLength,
    timeSeconds: timeElapsedSeconds,
    words,
    longestWord,
  };
}
