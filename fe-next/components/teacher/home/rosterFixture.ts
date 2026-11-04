import type { RosterStudentInput } from './rosterModel';

const NAMES = [
  'Maya', 'Noah', 'Lior', 'Emma', 'Yoni', 'Sofia', 'Omer', 'Ava', 'Daniel', 'Noa', 'Ethan', 'Tamar', 'Leo', 'Mia',
  'Adam', 'Shira', 'Lucas', 'Yael', 'Ben', 'Zoe', 'Itai', 'Chloe', 'Eli', 'Roni', 'Sam', 'Ella', 'Ari', 'Lily',
];
const DAY = 86_400_000;

/** Dev preview only: a stable class of students, roughly 2/3 played this week, some behind, a few not started. */
export function rosterFixture(classId: string, size: number, nowMs: number): RosterStudentInput[] {
  const seed = Array.from(classId).reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return Array.from({ length: size }, (_, i) => {
    const k = (i * 7 + seed) % 11;
    const daysAgo = k < 7 ? k % 5 : k < 9 ? 9 + k : null;
    const attempted = daysAgo === null ? 0 : 18 + ((i * 13 + seed) % 40);
    return {
      studentId: `${classId}-s${String(i + 1).padStart(2, '0')}`,
      displayName: NAMES[(i + seed) % NAMES.length],
      totalXp: daysAgo === null ? 0 : 120 + ((i * 97 + seed * 3) % 1400),
      wordsMastered: Math.round(attempted * 0.6),
      wordsAttempted: attempted,
      overallAccuracy: daysAgo === null ? 0 : 58 + ((i * 11 + seed) % 38),
      currentStreak: daysAgo === null || daysAgo > 7 ? 0 : 1 + ((i + seed) % 6),
      lastPracticeDate: daysAgo === null ? null : new Date(nowMs - daysAgo * DAY - 3_600_000).toISOString(),
    };
  });
}
