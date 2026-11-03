import { describe, it, expect } from 'vitest';
import { buildStudentPulses, buildDailyActive, type PulseRow } from '../classInsights';

const TODAY = '2026-11-03';
const row = (student_id: string, last: string | null, words: PulseRow['words_attempted'], xp = 10): PulseRow => ({
  student_id, total_xp: xp, last_practice_date: last, words_attempted: words,
});

describe('buildStudentPulses', () => {
  it('Given a student with no rows, Then status is notStarted', () => {
    const [p] = buildStudentPulses([], ['a'], TODAY);
    expect(p).toMatchObject({ id: 'a', status: 'notStarted', accuracy: null, attempts: 0, xp: 0, lastPractice: null });
  });

  it('Given week accuracy under 60%, Then needsHelp', () => {
    const [p] = buildStudentPulses([row('a', TODAY, { x: { attempts: 10, correct: 3 } })], ['a'], TODAY);
    expect(p.status).toBe('needsHelp');
    expect(p.accuracy).toBeCloseTo(0.3);
  });

  it('Given last practice older than 7 days, Then inactive even with poor old accuracy', () => {
    const [p] = buildStudentPulses([row('a', '2026-10-01', { x: { attempts: 10, correct: 1 } })], ['a'], TODAY);
    expect(p.status).toBe('inactive');
  });

  it('Given 80%+ accuracy on 3+ distinct practice days, Then thriving', () => {
    const rows = ['2026-11-01', '2026-11-02', TODAY].map((d) => row('a', d, { x: { attempts: 5, correct: 5 } }));
    const [p] = buildStudentPulses(rows, ['a'], TODAY);
    expect(p.status).toBe('thriving');
    expect(p.activeDays).toBe(3);
  });

  it('Given decent accuracy but few days, Then steady', () => {
    const [p] = buildStudentPulses([row('a', TODAY, { x: { attempts: 5, correct: 4 } })], ['a'], TODAY);
    expect(p.status).toBe('steady');
  });

  it('Given null word entries, Then they are skipped', () => {
    const [p] = buildStudentPulses([row('a', TODAY, { x: null as never, y: { attempts: 2, correct: 2 } })], ['a'], TODAY);
    expect(p.attempts).toBe(2);
  });

  it('Sorts attention first: needsHelp, inactive, notStarted, steady, thriving', () => {
    const rows = [
      row('thr', TODAY, { x: { attempts: 5, correct: 5 } }),
      row('help', TODAY, { x: { attempts: 5, correct: 0 } }),
      row('old', '2026-09-01', { x: { attempts: 5, correct: 5 } }),
    ];
    const out = buildStudentPulses(rows, ['thr', 'none', 'old', 'help'], TODAY).map((p) => p.id);
    expect(out).toEqual(['help', 'old', 'none', 'thr']);
  });
});

describe('buildDailyActive', () => {
  it('Counts distinct students per day, oldest first, 7 slots ending today', () => {
    const rows = [
      row('a', TODAY, {}), row('a', TODAY, {}), row('b', TODAY, {}), row('a', '2026-11-01', {}), row('c', '2026-01-01', {}),
    ];
    expect(buildDailyActive(rows, TODAY)).toEqual([
      { day: '2026-10-28', count: 0 }, { day: '2026-10-29', count: 0 }, { day: '2026-10-30', count: 0 },
      { day: '2026-10-31', count: 0 }, { day: '2026-11-01', count: 1 }, { day: '2026-11-02', count: 0 },
      { day: '2026-11-03', count: 2 },
    ]);
  });
});
