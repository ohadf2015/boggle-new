import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';

const MODE_KEYS: Record<string, string> = {
  classic: 'teacher.lastGame.mode.classic',
  blast: 'teacher.lastGame.mode.blast',
  'word-hunt': 'teacher.lastGame.mode.wordHunt',
  'wheel-rush': 'teacher.lastGame.mode.wheelRush',
  'vocab-quiz': 'teacher.lastGame.mode.vocabQuiz',
  wordcraft: 'teacher.classroom.gameModes.wordcraft',
};

export function roundModeLabelKey(mode: string): string | null {
  return MODE_KEYS[mode] ?? null;
}

export function participationParams({ played, roster }: RecentClassroomGame['participation']) {
  const total = Math.max(played, roster);
  return { played, total, absent: total - played };
}

export type RoundCellState = 'found' | 'missed' | 'absent';

export interface RoundReportRow {
  studentId: string;
  name: string;
  score: number | null;
  absent: boolean;
  cells: { word: string; state: RoundCellState }[];
}

export interface RoundReport {
  words: string[];
  rows: RoundReportRow[];
  practiceWords: string[];
}

export function buildRoundReport(game: RecentClassroomGame): RoundReport {
  const words = game.missedWords.map((w) => w.word);
  const practiceWords = game.missedWords.filter((w) => w.missedBy > 0).map((w) => w.word);

  const players: RoundReportRow[] = game.players.map((p) => {
    const found = new Set(p.lessonWordsFound);
    return {
      studentId: p.studentId,
      name: p.name,
      score: p.score,
      absent: false,
      cells: words.map((word) => ({ word, state: found.has(word) ? 'found' : 'missed' })),
    };
  });
  const absent: RoundReportRow[] = (game.absentStudents ?? []).map((s) => ({
    studentId: s.studentId,
    name: s.name,
    score: null,
    absent: true,
    cells: words.map((word) => ({ word, state: 'absent' })),
  }));

  return { words, rows: [...players, ...absent], practiceWords };
}
