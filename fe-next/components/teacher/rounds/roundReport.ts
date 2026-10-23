import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';

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
