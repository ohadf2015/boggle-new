import { readRussianWord, scanRussianWords } from '@/lib/server/russianWordLookup';
import { MAX_RESULTS, type FinderQuery } from './matcher';

export function foldYo(text: string): string {
  return text.replace(/ё/g, 'е');
}

/** Keeps only words that can reach the capped response: a wide rack fits hundreds of thousands of entries. */
export function solveRussian(query: FinderQuery): { words: string[]; total: number; capped: boolean } {
  const startsByLength = new Map<number, number[]>();
  let total = 0;

  scanRussianWords(query, (start, letters) => {
    total++;
    const starts = startsByLength.get(letters);
    if (!starts) startsByLength.set(letters, [start]);
    else if (starts.length < MAX_RESULTS) starts.push(start);
  });

  const words: string[] = [];
  for (const letters of [...startsByLength.keys()].sort((a, b) => b - a)) {
    const room = MAX_RESULTS - words.length;
    if (room <= 0) break;
    const sameLength = startsByLength.get(letters)!
      .slice(0, room)
      .map((start) => readRussianWord(start, letters))
      .sort((a, b) => a.localeCompare(b, 'ru'));
    words.push(...sameLength);
  }

  return { words, total, capped: total > MAX_RESULTS };
}
