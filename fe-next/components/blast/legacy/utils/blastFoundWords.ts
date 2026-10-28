export interface FoundWordsState {
  wordsFound: string[];
  bestWord: string;
}

/** Record a submission: real words count as found (longest is best); cascade match-3 clusters don't. */
export function recordFoundWord(prev: FoundWordsState, word: string, cascadeCluster: boolean): FoundWordsState {
  if (cascadeCluster) return prev;
  return {
    wordsFound: [...prev.wordsFound, word],
    bestWord: word.length > prev.bestWord.length ? word : prev.bestWord,
  };
}
