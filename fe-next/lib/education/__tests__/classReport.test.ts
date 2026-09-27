/**
 * classReport — the pure model behind the teacher's word x student report.
 *
 * Everything here folds `RecentClassroomGame` objects (already fetched by
 * `lib/supabase/analyticsLastGame`) into the three things a teacher acts on
 * after the bell: a grid of who got which word, how the class is trending on
 * a word across games, and one student's list to check in about.
 */
import { describe, it, expect } from 'vitest';
import {
  buildClassReportGrid,
  buildWordTrends,
  buildNotesText,
  studentDrillDown,
  type ClassReportLabels,
} from '../classReport';
import type { RecentClassroomGame, LastGamePlayer } from '@/lib/supabase/analyticsLastGame';

// ============================================
// FIXTURES — shaped exactly like analyticsLastGame output
// ============================================

function player(
  studentId: string,
  name: string,
  found: string[],
  missed: string[],
  score = 100
): LastGamePlayer {
  const total = found.length + missed.length;
  return {
    studentId,
    name,
    score,
    lessonWordsFound: found,
    lessonWordsMissed: missed,
    accuracyPct: total > 0 ? Math.round((found.length / total) * 100) : 0,
  };
}

function game(over: Partial<RecentClassroomGame> = {}): RecentClassroomGame {
  const players = over.players ?? [
    player('s1', 'Alice', ['cat', 'dog'], ['fox'], 120),
    player('s2', 'Bob', ['cat'], ['dog', 'fox'], 60),
  ];
  return {
    gameCode: 'G2',
    gameMode: 'classic',
    playedAt: '2026-09-04T10:00:00Z',
    lessonIds: ['lesson-1'],
    players,
    missedWords: [
      { word: 'fox', missedBy: 2, total: 2, pct: 100 },
      { word: 'dog', missedBy: 1, total: 2, pct: 50 },
      { word: 'cat', missedBy: 0, total: 2, pct: 0 },
    ],
    totalLessonWords: 3,
    wordsNobodyFound: ['fox'],
    coveragePct: 67,
    averageAccuracyPct: 50,
    participation: { played: 2, roster: 3 },
    absentStudents: [],
    ...over,
  };
}

const labels: ClassReportLabels = {
  title: 'Class report',
  playedAt: 'Played',
  reteach: 'Reteach first',
  checkIn: 'Check in with',
  absent: 'Did not play',
  nobodyFound: 'Nobody found',
  allFound: 'The class found every word.',
  everyoneOk: 'No one is behind.',
  quizCaveat: 'Includes words the quiz did not ask.',
  missedBy: 'missed by',
};

// ============================================
// GRID
// ============================================

describe('buildClassReportGrid', () => {
  it('puts every lesson word on a row and every student who played on a column', () => {
    const grid = buildClassReportGrid(game());

    expect(grid.rows.map((r) => r.word)).toEqual(['fox', 'dog', 'cat']);
    expect(grid.columns.map((c) => c.name)).toEqual(['Alice', 'Bob']);
  });

  it('sorts rows by miss percentage descending so the reteach list is the top rows', () => {
    const grid = buildClassReportGrid(game());

    expect(grid.rows.map((r) => r.missPct)).toEqual([100, 50, 0]);
  });

  it('marks each cell found, missed, or absent — never colour alone', () => {
    const grid = buildClassReportGrid(
      game({ absentStudents: [{ studentId: 's3', name: 'Cleo' }] })
    );

    const dog = grid.rows.find((r) => r.word === 'dog')!;
    // Alice found dog, Bob missed it, Cleo never played.
    expect(dog.cells).toEqual(['found', 'missed', 'absent']);
    expect(grid.columns.map((c) => c.played)).toEqual([true, true, false]);
  });

  it('gives every cell state a distinct symbol as well as a colour', () => {
    const grid = buildClassReportGrid(game());
    const symbols = new Set(grid.rows.flatMap((r) => r.cells).map((c) => grid.symbolFor(c)));

    expect(symbols.size).toBe(2); // found + missed in this fixture
    expect(grid.symbolFor('found')).not.toBe(grid.symbolFor('missed'));
    expect(grid.symbolFor('absent')).not.toBe(grid.symbolFor('missed'));
    for (const s of ['found', 'missed', 'absent'] as const) {
      expect(grid.symbolFor(s).trim()).not.toBe('');
    }
  });

  it('computes a row total (class miss %) and a column total (student accuracy)', () => {
    const grid = buildClassReportGrid(game());

    expect(grid.rows.find((r) => r.word === 'dog')).toMatchObject({
      missedBy: 1,
      attempted: 2,
      missPct: 50,
    });
    expect(grid.columns.map((c) => c.accuracyPct)).toEqual([67, 33]);
  });

  it('excludes absent students from the class miss percentage', () => {
    const grid = buildClassReportGrid(
      game({ absentStudents: [{ studentId: 's3', name: 'Cleo' }] })
    );

    // fox: missed by 2 of the 2 who PLAYED — not 2 of 3.
    expect(grid.rows.find((r) => r.word === 'fox')).toMatchObject({ attempted: 2, missPct: 100 });
  });

  it('matches Hebrew final-letter variants of the same word to one row', () => {
    const grid = buildClassReportGrid(
      game({
        players: [player('s1', 'Noa', ['שלום'], []), player('s2', 'Dan', [], ['שלומ'])],
        missedWords: [{ word: 'שלום', missedBy: 1, total: 2, pct: 50 }],
      })
    );

    expect(grid.rows).toHaveLength(1);
    expect(grid.rows[0].cells).toEqual(['found', 'missed']);
  });

  it('labels a board game found/missed and a vocab quiz correct/incorrect', () => {
    expect(buildClassReportGrid(game()).stateLabelKind).toBe('board');
    expect(buildClassReportGrid(game({ gameMode: 'vocab-quiz' })).stateLabelKind).toBe('quiz');
  });

  it('flags a vocab quiz as possibly containing words the quiz never asked', () => {
    // A quiz asks N questions from a lesson that may hold far more words, and
    // the backend puts every unasked word in lessonWordsMissed. Say so.
    expect(buildClassReportGrid(game()).mayIncludeUnaskedWords).toBe(false);
    expect(buildClassReportGrid(game({ gameMode: 'vocab-quiz' })).mayIncludeUnaskedWords).toBe(true);
  });

  it('returns an empty grid rather than throwing when nobody played', () => {
    const grid = buildClassReportGrid(
      game({ players: [], missedWords: [], totalLessonWords: 0, wordsNobodyFound: [] })
    );

    expect(grid.rows).toEqual([]);
    expect(grid.columns).toEqual([]);
  });
});

// ============================================
// TRENDS
// ============================================

describe('buildWordTrends', () => {
  const older = game({
    gameCode: 'G1',
    playedAt: '2026-09-01T10:00:00Z',
    players: [player('s1', 'Alice', [], ['cat', 'dog', 'fox'])],
    missedWords: [
      { word: 'cat', missedBy: 1, total: 1, pct: 100 },
      { word: 'dog', missedBy: 1, total: 1, pct: 100 },
      { word: 'fox', missedBy: 1, total: 1, pct: 100 },
    ],
  });

  it('returns nothing when the classroom has played only one game', () => {
    expect(buildWordTrends([game()])).toEqual([]);
  });

  it('orders points oldest to newest even though games arrive newest first', () => {
    const trends = buildWordTrends([game(), older]);

    const cat = trends.find((tr) => tr.word === 'cat')!;
    expect(cat.points.map((p) => p.gameCode)).toEqual(['G1', 'G2']);
    expect(cat.points.map((p) => p.missPct)).toEqual([100, 0]);
  });

  it('reports the change from the first game to the last, so improvement is negative', () => {
    const trends = buildWordTrends([game(), older]);

    expect(trends.find((tr) => tr.word === 'cat')!.delta).toBe(-100);
    expect(trends.find((tr) => tr.word === 'fox')!.delta).toBe(0);
  });

  it('skips words that appear in only one of the games', () => {
    const withExtra = game({
      missedWords: [...game().missedWords, { word: 'newt', missedBy: 2, total: 2, pct: 100 }],
    });

    expect(buildWordTrends([withExtra, older]).map((tr) => tr.word)).not.toContain('newt');
  });

  it('sorts the worst current miss rate first', () => {
    const trends = buildWordTrends([game(), older]);

    expect(trends.map((tr) => tr.word)).toEqual(['fox', 'dog', 'cat']);
  });

  it('folds Hebrew final-letter variants across games into one series', () => {
    const a = game({
      gameCode: 'GA',
      playedAt: '2026-09-02T10:00:00Z',
      missedWords: [{ word: 'שלום', missedBy: 2, total: 2, pct: 100 }],
    });
    const b = game({
      gameCode: 'GB',
      playedAt: '2026-09-04T10:00:00Z',
      missedWords: [{ word: 'שלומ', missedBy: 0, total: 2, pct: 0 }],
    });

    const trends = buildWordTrends([b, a]);
    expect(trends).toHaveLength(1);
    expect(trends[0].points).toHaveLength(2);
  });
});

// ============================================
// DRILL-DOWN
// ============================================

describe('studentDrillDown', () => {
  it('returns the words that student missed, newest game only', () => {
    const grid = buildClassReportGrid(game());

    expect(studentDrillDown(grid, 's2')!.missedWords).toEqual(['fox', 'dog']);
  });

  it('suggests meaning-first practice when a student missed most of the list', () => {
    const grid = buildClassReportGrid(game());

    expect(studentDrillDown(grid, 's2')!.practiceKey).toBe('flashcard');
  });

  it('suggests a spelling drill when a student missed only a few', () => {
    const grid = buildClassReportGrid(game());

    expect(studentDrillDown(grid, 's1')!.practiceKey).toBe('spelling');
  });

  it('tells the teacher to catch an absent student up rather than assigning a drill', () => {
    const grid = buildClassReportGrid(
      game({ absentStudents: [{ studentId: 's3', name: 'Cleo' }] })
    );

    expect(studentDrillDown(grid, 's3')).toMatchObject({ practiceKey: 'absent', missedWords: [] });
  });

  it('has nothing to drill when a student found every word', () => {
    const grid = buildClassReportGrid(
      game({ players: [player('s1', 'Alice', ['cat', 'dog', 'fox'], [])] })
    );

    expect(studentDrillDown(grid, 's1')!.practiceKey).toBe('none');
  });

  it('returns null for a student who is not in this game', () => {
    expect(studentDrillDown(buildClassReportGrid(game()), 'nobody')).toBeNull();
  });
});

// ============================================
// COPY FOR MY NOTES
// ============================================

describe('buildNotesText', () => {
  it('leads with the words to reteach, worst first', () => {
    const text = buildNotesText(game(), buildClassReportGrid(game()), labels);

    expect(text).toContain('Reteach first');
    expect(text.indexOf('fox')).toBeLessThan(text.indexOf('dog'));
  });

  it('names the students to check in with, and why', () => {
    const text = buildNotesText(game(), buildClassReportGrid(game()), labels);

    expect(text).toContain('Check in with');
    expect(text).toContain('Bob');
  });

  it('lists students who did not play under their own heading', () => {
    const g = game({ absentStudents: [{ studentId: 's3', name: 'Cleo' }] });
    const text = buildNotesText(g, buildClassReportGrid(g), labels);

    expect(text).toContain('Did not play');
    expect(text).toContain('Cleo');
  });

  it('warns that a quiz report can include words the quiz never asked', () => {
    const g = game({ gameMode: 'vocab-quiz' });
    const text = buildNotesText(g, buildClassReportGrid(g), labels);

    expect(text).toContain('Includes words the quiz did not ask.');
  });

  it('omits the quiz caveat for a board game', () => {
    const text = buildNotesText(game(), buildClassReportGrid(game()), labels);

    expect(text).not.toContain('Includes words the quiz did not ask.');
  });

  it('uses only the caller-supplied labels, never a hardcoded English word', () => {
    const g = game();
    const text = buildNotesText(g, buildClassReportGrid(g), labels);

    // Every alphabetic run must come from the labels or the data itself.
    const allowed = [...Object.values(labels), 'Alice', 'Bob', 'cat', 'dog', 'fox', 'classic'];
    let stripped = text;
    for (const word of allowed.sort((a, b) => b.length - a.length)) {
      stripped = stripped.split(word).join('');
    }
    expect(stripped).not.toMatch(/[A-Za-z]{3,}/);
  });

  it('says the class found everything instead of printing an empty reteach list', () => {
    const g = game({
      players: [player('s1', 'Alice', ['cat', 'dog', 'fox'], [])],
      missedWords: [{ word: 'cat', missedBy: 0, total: 1, pct: 0 }],
      wordsNobodyFound: [],
    });
    const text = buildNotesText(g, buildClassReportGrid(g), labels);

    expect(text).toContain('The class found every word.');
  });
});
