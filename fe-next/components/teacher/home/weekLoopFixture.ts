import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import type { RosterStudentInput } from './rosterModel';
import type { WeekLoopLesson } from './weekLoopModel';

const DAY = 86_400_000;
const LIST_NAMES: Record<string, [string, string]> = {
  en: ['Week 1: weather', 'Week 2: animals'],
  he: ['שבוע 1: מזג אוויר', 'שבוע 2: בעלי חיים'],
  es: ['Semana 1: el tiempo', 'Semana 2: animales'],
  ja: ['第1週：天気', '第2週：動物'],
  ru: ['Неделя 1: погода', 'Неделя 2: животные'],
  sv: ['Vecka 1: väder', 'Vecka 2: djur'],
};

export function weekLoopFixture(classId: string, roster: readonly RosterStudentInput[], language: string, nowMs: number): { game: RecentClassroomGame; lessons: WeekLoopLesson[] } {
  const [week1, week2] = LIST_NAMES[language] ?? LIST_NAMES.en;
  const words = Array.from({ length: 10 }, (_, i) => `w${i}`);
  const played = roster.filter((s) => s.lastPracticeDate !== null);
  const players = played.map((s, i) => {
    const found = 4 + ((i * 5) % 7);
    return {
      studentId: s.studentId,
      name: s.displayName ?? '',
      score: found * 10,
      lessonWordsFound: words.slice(0, found),
      lessonWordsMissed: words.slice(found),
      accuracyPct: found * 10,
    };
  });
  const game: RecentClassroomGame = {
    gameCode: 'PRVW1',
    gameMode: 'word-hunt',
    playedAt: new Date(nowMs - 6 * DAY).toISOString(),
    lessonIds: [`${classId}-w1`],
    players,
    missedWords: [],
    totalLessonWords: words.length,
    wordsNobodyFound: [],
    coveragePct: 100,
    averageAccuracyPct: 70,
    participation: { played: players.length, roster: roster.length },
    absentStudents: roster.filter((s) => s.lastPracticeDate === null).map((s) => ({ studentId: s.studentId, name: s.displayName ?? '' })),
  };
  const lessons: WeekLoopLesson[] = [
    { id: `${classId}-w1`, name: week1, classroom_id: classId, created_at: new Date(nowMs - 9 * DAY).toISOString(), words },
    { id: `${classId}-w2`, name: week2, classroom_id: classId, created_at: new Date(nowMs - DAY).toISOString(), words },
  ];
  return { game, lessons };
}
