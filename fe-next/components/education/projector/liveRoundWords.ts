import type { Language } from '@/shared/types';
import { lessonWordKey } from '@/shared/utils/wordNormalization';

export interface LiveWordItem {
  username: string;
  word: string;
}

export interface LiveFeedEntry {
  id: number;
  username: string;
  word: string;
  lesson: boolean;
}

export const LIVE_FEED_MAX = 10;

export interface LiveRoundWords {
  best: { word: string; username: string } | null;
  /** Lesson words found so far this round, as lowercased lesson keys, first-found order. */
  lessonFound: string[];
  /** Newest first. */
  recent: LiveFeedEntry[];
  seq: number;
}

export function emptyLiveRoundWords(): LiveRoundWords {
  return { best: null, lessonFound: [], recent: [], seq: 0 };
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
  let seq = state.seq;
  const added: LiveFeedEntry[] = [];
  for (const item of items) {
    if (!item?.word || (hostUsername && item.username === hostUsername)) continue;
    const word = item.word.toLowerCase();
    if (!best || word.length > best.word.length) best = { word, username: item.username };
    const key = liveKey(item.word, language);
    const lesson = lessonWords.has(key);
    if (lesson && !lessonFound.includes(key)) lessonFound = [...lessonFound, key];
    seq += 1;
    added.unshift({ id: seq, username: item.username, word, lesson });
  }
  if (!added.length) return state;
  return { best, lessonFound, seq, recent: [...added, ...state.recent].slice(0, LIVE_FEED_MAX) };
}

/** First letter plus blank tiles: shows the length without handing the class the word. */
export function maskWord(word: string): string[] {
  const letters = Array.from(word);
  return letters.map((ch, i) => (i === 0 ? ch.toLocaleUpperCase() : ''));
}
