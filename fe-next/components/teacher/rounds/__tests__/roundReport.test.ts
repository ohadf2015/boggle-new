import { describe, it, expect } from 'vitest';
import { activeLineParams, buildRoundReport, roundTitleKey, sortRoundRows } from '../roundReport';
import { ROUND_FIXTURE } from '../roundFixture';

describe('buildRoundReport', () => {
  it('gives every player one cell per lesson word, hardest word first', () => {
    const report = buildRoundReport(ROUND_FIXTURE);
    expect(report.words).toEqual(['enormous', 'fragile', 'ancient', 'brave']);
    const maya = report.rows.find((r) => r.name === 'Maya')!;
    expect(maya.cells.map((c) => c.state)).toEqual(['missed', 'found', 'found', 'found']);
  });

  it('keeps students who sat the round out apart from the players, so they collapse to one line', () => {
    const report = buildRoundReport(ROUND_FIXTURE);
    expect(report.rows.map((r) => r.name)).toEqual(['Maya', 'Omar', 'Sofia']);
    expect(report.absent).toEqual([{ studentId: 's4', name: 'Leo' }]);
  });

  it('carries each player\'s lesson-word accuracy for the row', () => {
    expect(buildRoundReport(ROUND_FIXTURE).rows.map((r) => r.accuracyPct)).toEqual([75, 50, 25]);
  });

  it('practices the words at least one player missed, hardest first', () => {
    expect(buildRoundReport(ROUND_FIXTURE).practiceWords).toEqual(['enormous', 'fragile', 'ancient']);
  });

  it('handles a round with no lesson words', () => {
    const report = buildRoundReport({ ...ROUND_FIXTURE, missedWords: [], players: [], absentStudents: [] });
    expect(report).toMatchObject({ words: [], rows: [], absent: [], practiceWords: [] });
  });
});

describe('activeLineParams', () => {
  it('counts who played against the roster, with no "missed it" count that reads as missed words', () => {
    expect(activeLineParams({ played: 1, roster: 11 })).toEqual({ active: 1, roster: 11 });
  });

  it('never shows more players than the roster', () => {
    expect(activeLineParams({ played: 5, roster: 4 })).toEqual({ active: 5, roster: 5 });
  });
});

describe('sortRoundRows', () => {
  const rows = buildRoundReport(ROUND_FIXTURE).rows;

  it('sorts by score, highest first', () => {
    expect(sortRoundRows(rows, 'score').map((r) => r.name)).toEqual(['Maya', 'Omar', 'Sofia']);
  });

  it('sorts by accuracy, lowest first, so the students who need help lead', () => {
    expect(sortRoundRows(rows, 'accuracy').map((r) => r.name)).toEqual(['Sofia', 'Omar', 'Maya']);
  });

  it('sorts by name and leaves the input untouched', () => {
    const shuffled = [rows[2], rows[0], rows[1]];
    expect(sortRoundRows(shuffled, 'name').map((r) => r.name)).toEqual(['Maya', 'Omar', 'Sofia']);
    expect(shuffled.map((r) => r.name)).toEqual(['Sofia', 'Maya', 'Omar']);
  });
});

describe('roundTitleKey', () => {
  it('names a Wordcraft round with the translated mode label, never the raw mode id', () => {
    expect(roundTitleKey('wordcraft')).toBe('teacher.classroom.gameModes.wordcraft');
  });

  it('keeps the existing labels for the classic modes', () => {
    expect(roundTitleKey('vocab-quiz')).toBe('teacher.lastGame.mode.vocabQuiz');
  });

  it('falls back to a generic class-game title for a mode it does not know', () => {
    expect(roundTitleKey('mystery')).toBe('teacher.classReport.notes.title');
  });
});
