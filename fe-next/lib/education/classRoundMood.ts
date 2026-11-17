/**
 * Last-round class mood from student ratings. Pure. Zero ratings is not a mood.
 *
 * great: great-share >= 0.6 and bad is not a majority (bad-share <= 0.5)
 * rough: bad-share >= 0.4
 * otherwise mixed
 *
 * Shares use integer compares so 3/5 stays >= 0.6.
 */

export type ClassRoundRating = 'bad' | 'ok' | 'great';
export type ClassRoundMood = 'great' | 'mixed' | 'rough';

export interface ClassRoundMoodResult {
  count: number;
  mood: ClassRoundMood | null;
}

export function classifyClassRoundMood(ratings: readonly ClassRoundRating[]): ClassRoundMoodResult {
  const count = ratings.length;
  if (count === 0) return { count: 0, mood: null };

  let great = 0;
  let bad = 0;
  for (const rating of ratings) {
    if (rating === 'great') great += 1;
    else if (rating === 'bad') bad += 1;
  }

  const greatEnough = great * 5 >= count * 3;
  const badMajority = bad * 2 > count;
  if (greatEnough && !badMajority) return { count, mood: 'great' };
  if (bad * 5 >= count * 2) return { count, mood: 'rough' };
  return { count, mood: 'mixed' };
}
