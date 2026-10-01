export interface LiveWordItem {
  username: string;
  word: string;
}

export interface LiveRoundWords {
  best: { word: string; username: string } | null;
  /** Lesson words found so far this round, lowercased, first-found order. */
  lessonFound: string[];
}

export function emptyLiveRoundWords(): LiveRoundWords {
  return { best: null, lessonFound: [] };
}

/** `lessonWords` must already be lowercased. */
export function foldLiveWords(
  state: LiveRoundWords,
  items: readonly LiveWordItem[],
  lessonWords: ReadonlySet<string>,
  hostUsername?: string
): LiveRoundWords {
  let best = state.best;
  let lessonFound = state.lessonFound;
  for (const item of items) {
    if (!item?.word || (hostUsername && item.username === hostUsername)) continue;
    const word = item.word.toLowerCase();
    if (!best || word.length > best.word.length) best = { word, username: item.username };
    if (lessonWords.has(word) && !lessonFound.includes(word)) lessonFound = [...lessonFound, word];
  }
  return best === state.best && lessonFound === state.lessonFound ? state : { best, lessonFound };
}

/** First letter plus blank tiles: shows the length without handing the class the word. */
export function maskWord(word: string): string[] {
  const letters = Array.from(word);
  return letters.map((ch, i) => (i === 0 ? ch.toLocaleUpperCase() : ''));
}
