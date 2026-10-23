import { describe, it, expect } from 'vitest';
import { buildRoundReport } from '../roundReport';
import { ROUND_FIXTURE } from '../roundFixture';

describe('buildRoundReport', () => {
  it('gives every player one cell per lesson word, hardest word first', () => {
    const report = buildRoundReport(ROUND_FIXTURE);
    expect(report.words).toEqual(['enormous', 'fragile', 'ancient', 'brave']);
    const maya = report.rows.find((r) => r.name === 'Maya')!;
    expect(maya.cells.map((c) => c.state)).toEqual(['missed', 'found', 'found', 'found']);
  });

  it('lists absent roster students with empty strips after the players', () => {
    const report = buildRoundReport(ROUND_FIXTURE);
    const last = report.rows[report.rows.length - 1];
    expect(last).toMatchObject({ name: 'Leo', absent: true });
    expect(last.cells.every((c) => c.state === 'absent')).toBe(true);
  });

  it('practices the words at least one player missed, hardest first', () => {
    expect(buildRoundReport(ROUND_FIXTURE).practiceWords).toEqual(['enormous', 'fragile', 'ancient']);
  });

  it('handles a round with no lesson words', () => {
    const report = buildRoundReport({ ...ROUND_FIXTURE, missedWords: [], players: [], absentStudents: [] });
    expect(report).toMatchObject({ words: [], rows: [], practiceWords: [] });
  });
});
