import { buildClassReportGrid, type ClassReportGrid } from '@/lib/education/classReport';
import type { ClassroomSummary } from '@/shared/types/classroom';

export type RoundWordGridInput = Pick<ClassroomSummary, 'coverage' | 'masteryByPlayer'> & {
  gameMode: string;
  /** The teacher's own practice seat, left out of the student columns. */
  hostName?: string;
};

export function buildRoundWordGrid({ gameMode, coverage, masteryByPlayer, hostName }: RoundWordGridInput): ClassReportGrid {
  const words = coverage ?? [];
  const host = (hostName ?? '').trim().toLowerCase();
  const isHost = (name: string) => host !== '' && name.trim().toLowerCase() === host;
  const names = Object.keys(masteryByPlayer ?? {}).filter((n) => !isHost(n));
  for (const entry of words) {
    for (const name of entry.foundBy) if (!isHost(name) && !names.includes(name)) names.push(name);
  }
  const players = names.map((name) => ({
    studentId: name,
    name,
    score: 0,
    lessonWordsFound: words.filter((w) => w.foundBy.includes(name)).map((w) => w.word),
    lessonWordsMissed: words.filter((w) => !w.foundBy.includes(name)).map((w) => w.word),
    accuracyPct: 0,
  }));
  return buildClassReportGrid({
    gameCode: '',
    gameMode,
    playedAt: '',
    lessonIds: [],
    players,
    missedWords: words.map((w) => ({ word: w.word, missedBy: 0, total: players.length, pct: 0 })),
    totalLessonWords: words.length,
    wordsNobodyFound: [],
    coveragePct: 0,
    averageAccuracyPct: 0,
    participation: { played: players.length, roster: players.length },
    absentStudents: [],
  });
}
