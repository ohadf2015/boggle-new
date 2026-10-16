import type { Language } from '@/shared/types';
import { lessonWordKey } from '@/shared/utils/wordNormalization';

export interface LiveWordItem {
  username: string;
  word: string;
}

export interface LiveRoundWords {
  best: { word: string; username: string } | null;
  /** Lesson words found so far this round, as lowercased lesson keys, first-found order. */
  lessonFound: string[];
}

export function emptyLiveRoundWords(): LiveRoundWords {
  return { best: null, lessonFound: [] };
}

const liveKey = (word: string, language: Language) => lessonWordKey(word, language).toLowerCase();

/** The teacher's list as keys: a vowelled or sofit spelling still counts the plain word a student traces. */
export function lessonWordSet(words: readonly string[], language: Language): Set<string> {
  return new Set(words.map((w) => liveKey(w, language)).filter(Boolean));
}

/** `lessonWords` comes from `lessonWordSet` with the same `language`. */
export function foldLiveWords(
  state: LiveRoundWords,
  items: readonly LiveWordItem[],
  lessonWords: ReadonlySet<string>,
  hostUsername?: string,
  language: Language = 'en'
): LiveRoundWords {
  let best = state.best;
  let lessonFound = state.lessonFound;
  for (const item of items) {
    if (!item?.word || (hostUsername && item.username === hostUsername)) continue;
    const word = item.word.toLowerCase();
    if (!best || word.length > best.word.length) best = { word, username: item.username };
    const key = liveKey(item.word, language);
    if (lessonWords.has(key) && !lessonFound.includes(key)) lessonFound = [...lessonFound, key];
  }
  return best === state.best && lessonFound === state.lessonFound ? state : { best, lessonFound };
}

/** First letter plus blank tiles: shows the length without handing the class the word. */
export function maskWord(word: string): string[] {
  const letters = Array.from(word);
  return letters.map((ch, i) => (i === 0 ? ch.toLocaleUpperCase() : ''));
}
