export interface StoredPracticeStreak {
  current_streak: number | null;
  longest_streak: number | null;
  last_practice_date: string | null;
}

export interface PracticeStreak {
  current: number;
  longest: number;
}

const DAY_MS = 86_400_000;

// UTC days, matching award_education_xp's CURRENT_DATE stamp on last_practice_date.
export function nextPracticeStreak(row: StoredPracticeStreak | null, todayUtc: string): PracticeStreak {
  const last = row?.last_practice_date?.slice(0, 10) ?? null;
  const current = row?.current_streak ?? 0;
  const yesterday = new Date(Date.parse(`${todayUtc}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
  const next = last === todayUtc ? Math.max(current, 1) : last === yesterday ? current + 1 : 1;
  return { current: next, longest: Math.max(row?.longest_streak ?? 0, next) };
}

export const utcDay = (nowMs: number) => new Date(nowMs).toISOString().slice(0, 10);
