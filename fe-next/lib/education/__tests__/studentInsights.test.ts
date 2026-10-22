import { describe, it, expect } from 'vitest';
import { buildStudentInsights, type InsightProgressRow, type InsightSessionRow } from '../studentInsights';

const NOW = new Date('2026-10-21T12:00:00Z');
const daysAgo = (d: number, hour = 10) =>
  new Date(NOW.getTime() - d * 86400000 + (hour - 12) * 3600000).toISOString();

function progress(overrides: Partial<InsightProgressRow> = {}): InsightProgressRow {
  return {
    total_xp: 0,
    words_mastered: [],
    words_attempted: {},
    completed_at: null,
    current_streak: 0,
    longest_streak: 0,
    ...overrides,
  };
}

function session(overrides: Partial<InsightSessionRow> = {}): InsightSessionRow {
  return {
    completed_at: daysAgo(1),
    words_attempted: 10,
    words_correct: 8,
    time_spent_seconds: 0,
    duration_seconds: 300,
    ...overrides,
  };
}

describe('buildStudentInsights', () => {
  it('Given no rows at all, Then totals are zero, accuracy is null and the insight is "quiet"', () => {
    const out = buildStudentInsights({ progressRows: [], sessionRows: [], now: NOW });
    expect(out.totalXp).toBe(0);
    expect(out.accuracy).toBeNull();
    expect(out.thisWeek).toEqual({ sessions: 0, minutes: 0, activeDays: 0, accuracy: null });
    expect(out.lastWeek).toEqual({ sessions: 0, minutes: 0, activeDays: 0, accuracy: null });
    expect(out.wordsToPractice).toEqual([]);
    expect(out.recentWins).toEqual([]);
    expect(out.insight).toBe('quiet');
    expect(out.activity).toBe('short_daily_session');
  });

  it('sums XP, counts completed lessons, dedupes mastered words, and takes the best streak across lessons', () => {
    const out = buildStudentInsights({
      progressRows: [
        progress({ total_xp: 40, words_mastered: ['cat', 'dog'], completed_at: daysAgo(3), current_streak: 2, longest_streak: 5 }),
        progress({ total_xp: 60, words_mastered: ['dog', 'fox'], current_streak: 4, longest_streak: 4 }),
      ],
      sessionRows: [],
      now: NOW,
    });
    expect(out.totalXp).toBe(100);
    expect(out.lessonsCompleted).toBe(1);
    expect(out.wordsMastered).toBe(3);
    expect(out.currentStreak).toBe(4);
    expect(out.longestStreak).toBe(5);
  });

  it('computes overall accuracy from per-word correct/attempts, merging the same word across lessons', () => {
    const out = buildStudentInsights({
      progressRows: [
        progress({ words_attempted: { cat: { correct: 1, attempts: 2 } } }),
        progress({ words_attempted: { cat: { correct: 2, attempts: 2 }, sun: { correct: 0, attempts: 4 } } }),
      ],
      sessionRows: [],
      now: NOW,
    });
    expect(out.accuracy).toBe(38); // 3 / 8
    expect(out.wordsPracticed).toBe(2);
  });

  it('splits sessions into rolling 7-day windows, minutes from time_spent_seconds || duration_seconds', () => {
    const out = buildStudentInsights({
      progressRows: [],
      sessionRows: [
        session({ completed_at: daysAgo(0), time_spent_seconds: 600, duration_seconds: 60 }),
        session({ completed_at: daysAgo(2), words_attempted: 10, words_correct: 4, duration_seconds: 300 }),
        session({ completed_at: daysAgo(2, 15) }),
        session({ completed_at: daysAgo(9), words_attempted: 20, words_correct: 5 }),
        session({ completed_at: daysAgo(20) }),
        session({ completed_at: null }),
      ],
      now: NOW,
    });
    expect(out.thisWeek.sessions).toBe(3);
    expect(out.thisWeek.minutes).toBe(20); // 10 + 5 + 5
    expect(out.thisWeek.activeDays).toBe(2);
    expect(out.thisWeek.accuracy).toBe(67); // (8+4+8)/(30)
    expect(out.lastWeek).toEqual({ sessions: 1, minutes: 5, activeDays: 1, accuracy: 25 });
    expect(out.insight).toBe('more_active');
  });

  it('never reads the mixed-scale session `accuracy` column: no attempted words means null week accuracy', () => {
    const out = buildStudentInsights({
      progressRows: [],
      sessionRows: [session({ words_attempted: 0, words_correct: 0, accuracy: 0.9 } as Partial<InsightSessionRow>)],
      now: NOW,
    });
    expect(out.thisWeek.sessions).toBe(1);
    expect(out.thisWeek.accuracy).toBeNull();
  });

  it.each([
    [[1], [], 'started_this_week'],
    [[1], [8, 9], 'less_active'],
    [[1, 2], [8, 9], 'steady'],
    [[], [8], 'paused'],
  ] as const)('insight code for this week %j vs last week %j is %s', (thisDays, lastDays, code) => {
    const out = buildStudentInsights({
      progressRows: [],
      sessionRows: [...thisDays, ...lastDays].map((d) => session({ completed_at: daysAgo(d) })),
      now: NOW,
    });
    expect(out.insight).toBe(code);
  });

  it('words to practice: unmastered, at least 2 attempts, under 70%, weakest first, max 5', () => {
    const out = buildStudentInsights({
      progressRows: [
        progress({
          words_mastered: ['owl'],
          words_attempted: {
            once: { correct: 0, attempts: 1 },
            owl: { correct: 0, attempts: 3 },
            sun: { correct: 0, attempts: 4 },
            moon: { correct: 1, attempts: 2 },
            star: { correct: 1, attempts: 4 },
            ok: { correct: 3, attempts: 4 },
            a: { correct: 0, attempts: 2 },
            b: { correct: 0, attempts: 2 },
            c: { correct: 0, attempts: 2 },
          },
        }),
      ],
      sessionRows: [],
      now: NOW,
    });
    expect(out.wordsToPractice.map((w) => w.word)).toEqual(['sun', 'a', 'b', 'c', 'star']);
    expect(out.wordsToPractice[0]).toEqual({ word: 'sun', accuracy: 0, attempts: 4 });
    expect(out.activity).toBe('practice_weak_words');
  });

  it('recent wins: mastered or >=80% over 2+ attempts, most recently practiced first; mastered-only words keep null accuracy', () => {
    const out = buildStudentInsights({
      progressRows: [
        progress({
          words_mastered: ['tree', 'rain'],
          words_attempted: {
            tree: { correct: 2, attempts: 2, lastAttemptAt: '2026-10-10T00:00:00Z' },
            leaf: { correct: 4, attempts: 5, lastAttemptAt: '2026-10-20T00:00:00Z' },
            lucky: { correct: 1, attempts: 1, lastAttemptAt: '2026-10-21T00:00:00Z' },
            weak: { correct: 1, attempts: 5 },
          },
        }),
      ],
      sessionRows: [],
      now: NOW,
    });
    expect(out.recentWins).toEqual([
      { word: 'leaf', accuracy: 80, attempts: 5 },
      { word: 'tree', accuracy: 100, attempts: 2 },
      { word: 'rain', accuracy: null, attempts: 0 },
    ]);
  });

  it('suggests celebrating wins when there is nothing weak to practice', () => {
    const out = buildStudentInsights({
      progressRows: [progress({ words_mastered: ['tree'] })],
      sessionRows: [],
      now: NOW,
    });
    expect(out.activity).toBe('celebrate_wins');
  });

  it('tolerates malformed jsonb and null columns from old rows', () => {
    const out = buildStudentInsights({
      progressRows: [
        progress({ total_xp: null, words_mastered: null, words_attempted: null, current_streak: null, longest_streak: null }),
        progress({ words_attempted: { x: null, y: { attempts: 'two' } } as unknown as InsightProgressRow['words_attempted'] }),
      ],
      sessionRows: [session({ words_attempted: null, words_correct: null, time_spent_seconds: null, duration_seconds: null })],
      now: NOW,
    });
    expect(out.totalXp).toBe(0);
    expect(out.accuracy).toBeNull();
    expect(out.thisWeek).toEqual({ sessions: 1, minutes: 0, activeDays: 1, accuracy: null });
  });
});
