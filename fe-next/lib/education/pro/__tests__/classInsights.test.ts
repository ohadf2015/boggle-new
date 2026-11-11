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

describe('buildStudentPulses on a board game class (three rounds, eight lesson words)', () => {
  const at = `${TODAY}T07:39:11.540Z`;
  const words = (found: Record<string, number>, attempts = 3) =>
    Object.fromEntries(['cat', 'dog', 'sun', 'red', 'hat', 'pen', 'map', 'cup'].map((w) => [w, { attempts, correct: found[w] ?? 0, lastAttemptAt: at }]));
  const rows: PulseRow[] = [
    row('winner', TODAY, words({ cat: 2, dog: 1, red: 2, hat: 1 }), 30),
    row('middle', TODAY, words({ dog: 1, sun: 1 }), 10),
    row('third', TODAY, words({ cat: 2, sun: 1 }), 20),
    row('zero', null, words({}, 1), 0),
  ];
  const pulses = buildStudentPulses(rows, ['winner', 'middle', 'third', 'zero'], TODAY);
  const status = (id: string) => pulses.find((p) => p.id === id)?.status;

  it('Given the round winner found the most lesson words, Then they are not flagged as needing help', () => {
    expect(status('winner')).toBe('steady');
  });

  it('Given a student who played every round and scored 0, Then they need help, not "not started"', () => {
    expect(status('zero')).toBe('needsHelp');
    expect(pulses.find((p) => p.id === 'zero')?.lastPractice).toBe(TODAY);
  });

  it('Given students close to the class rate, Then they are steady', () => {
    expect(status('middle')).toBe('steady');
    expect(status('third')).toBe('steady');
  });

  it('Given the full playtest class (8 students), Then only the zero-scorers and the one who scored in 1 of 3 rounds are flagged', () => {
    const tally = (id: string, correct: number, attempts: number, last: string | null) =>
      row(id, last, { w: { attempts, correct, lastAttemptAt: at } } as never);
    const full = [
      tally('r1Winner', 6, 24, TODAY), tally('r1Second', 2, 24, TODAY), tally('r3Winner', 3, 24, TODAY), tally('zeroA', 0, 8, null),
      tally('zeroB', 0, 8, null), tally('lateWinner', 3, 8, TODAY), tally('lateSecond', 2, 8, TODAY), tally('lateThird', 1, 8, TODAY),
    ];
    const out = buildStudentPulses(full, full.map((r) => r.student_id), TODAY);
    expect(out.filter((p) => p.status === 'needsHelp').map((p) => p.id).sort()).toEqual(['r1Second', 'zeroA', 'zeroB']);
  });

  it('Given a quiz class near 90%, Then a student at 50% still needs help', () => {
    const quiz = [row('a', TODAY, { x: { attempts: 10, correct: 9 } }), row('b', TODAY, { x: { attempts: 10, correct: 9 } }), row('c', TODAY, { x: { attempts: 10, correct: 5 } })];
    const out = buildStudentPulses(quiz, ['a', 'b', 'c'], TODAY);
    expect(out.find((p) => p.id === 'c')?.status).toBe('needsHelp');
  });

  it('Given a whole class that found nothing, Then every player is flagged', () => {
    const out = buildStudentPulses([row('a', TODAY, words({})), row('b', TODAY, words({}))], ['a', 'b'], TODAY);
    expect(out.map((p) => p.status)).toEqual(['needsHelp', 'needsHelp']);
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
