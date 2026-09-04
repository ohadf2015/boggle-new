/**
 * Pick the Word of the Day from a lesson's words.
 *
 * It was `Math.floor(Math.random() * words.length)` behind a ref, so it was stable only
 * within one mount: navigating away and back handed the student a different "word of the
 * day", several times an afternoon. A word of the DAY has to be the same word all day, and
 * the same word for everyone in the class looking at the same lesson.
 *
 * Deterministic from the date and the lesson, so it needs no storage and no server: same
 * day + same lesson + same word list ⇒ same word, and it rolls over at local midnight.
 */
export function pickWordOfTheDay(
  words: string[],
  lessonId: string,
  today: Date = new Date()
): string | null {
  if (!words || words.length === 0) return null;

  // Local calendar date, not UTC: the student's "today" is the one on their wall.
  const dayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const seed = `${dayKey}:${lessonId}`;

  // FNV-1a — small, dependency-free, and spreads adjacent seeds (consecutive dates) well
  // enough that the pick visibly changes from one day to the next.
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return words[hash % words.length];
}
