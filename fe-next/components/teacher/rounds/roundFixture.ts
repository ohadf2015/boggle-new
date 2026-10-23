import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';

export const ROUND_FIXTURE: RecentClassroomGame = {
  gameCode: 'FIX001',
  gameMode: 'vocab-quiz',
  playedAt: '2026-10-22T09:40:00Z',
  lessonIds: ['l1'],
  players: [
    { studentId: 's1', name: 'Maya', score: 420, lessonWordsFound: ['fragile', 'ancient', 'brave'], lessonWordsMissed: ['enormous'], accuracyPct: 75 },
    { studentId: 's2', name: 'Omar', score: 310, lessonWordsFound: ['ancient', 'brave'], lessonWordsMissed: ['enormous', 'fragile'], accuracyPct: 50 },
    { studentId: 's3', name: 'Sofia', score: 150, lessonWordsFound: ['brave'], lessonWordsMissed: ['enormous', 'fragile', 'ancient'], accuracyPct: 25 },
  ],
  missedWords: [
    { word: 'enormous', missedBy: 3, total: 3, pct: 100 },
    { word: 'fragile', missedBy: 2, total: 3, pct: 67 },
    { word: 'ancient', missedBy: 1, total: 3, pct: 33 },
    { word: 'brave', missedBy: 0, total: 3, pct: 0 },
  ],
  totalLessonWords: 4,
  wordsNobodyFound: ['enormous'],
  coveragePct: 75,
  averageAccuracyPct: 50,
  participation: { played: 3, roster: 4 },
  absentStudents: [{ studentId: 's4', name: 'Leo' }],
};
