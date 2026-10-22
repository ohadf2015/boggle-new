import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getClassReportData, getStudentReportData } from '../analyticsReports';
import { getStudentsProgressSummary } from '../analyticsClassroom';
import { supabase } from '@/lib/supabase';
import { loadStudentInsights } from '@/lib/education/studentInsightsLoader';
import { fakeSupabase, ok } from '@/lib/education/__tests__/fakeSupabase';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const CLASSROOM = 'c1';
const NOW = new Date('2026-10-21T12:00:00Z');

const progressRows = [
  {
    student_id: 'ana',
    lesson_id: 'l1',
    total_xp: 50,
    current_level: 1,
    current_streak: 0,
    longest_streak: 0,
    words_mastered: ['tree'],
    words_attempted: { tree: { correct: 3, attempts: 3 }, sun: { correct: 1, attempts: 4 } },
    completed_at: '2026-10-01T00:00:00Z',
    last_practice_date: '2026-10-01',
  },
  {
    student_id: 'ana',
    lesson_id: 'l2',
    total_xp: 30,
    current_level: 1,
    current_streak: 0,
    longest_streak: 0,
    words_mastered: ['tree'],
    words_attempted: { tree: { correct: 2, attempts: 2 } },
    completed_at: null,
    last_practice_date: '2026-10-05',
  },
  {
    student_id: 'ben',
    lesson_id: 'l1',
    total_xp: 10,
    current_level: 1,
    current_streak: 0,
    longest_streak: 0,
    words_mastered: ['sun'],
    words_attempted: { sun: { correct: 2, attempts: 2 } },
    completed_at: null,
    last_practice_date: '2026-10-04',
  },
];

const sessions = [
  { classroom_id: CLASSROOM, completed_at: '2026-10-20T10:00:00Z', words_attempted: 10, words_correct: 7, time_spent_seconds: 600, duration_seconds: null },
  { classroom_id: CLASSROOM, completed_at: null, words_attempted: 3, words_correct: 0, time_spent_seconds: 1200, duration_seconds: null },
  { classroom_id: 'other', completed_at: '2026-10-19T10:00:00Z', words_attempted: 10, words_correct: 10, time_spent_seconds: 1800, duration_seconds: null },
];

const lessons = [
  { id: 'l1', words: [{ word: 'tree' }, { word: 'sun' }] },
  { id: 'l2', words: [{ word: 'tree' }, { word: 'moon' }] },
];

function browserDb(lessonRows: unknown[] = lessons, rows: typeof progressRows = progressRows) {
  return fakeSupabase({
    classrooms: ok({ id: CLASSROOM, name: 'Class A', teacher_id: 't1' }),
    classroom_memberships: ok([{ student_id: 'ana' }, { student_id: 'ben' }]),
    public_profiles: (filters) =>
      filters.some(([m]) => m === 'in')
        ? ok([
            { id: 'ana', display_name: 'Ana', avatar_config: null, avatar_emoji: null },
            { id: 'ben', display_name: 'Ben', avatar_config: null, avatar_emoji: null },
          ])
        : ok({ display_name: 'Teacher T' }),
    student_lesson_progress: (filters) => {
      const one = filters.find(([m, col]) => m === 'eq' && col === 'student_id')?.[2];
      return ok(rows.filter((r) => !one || r.student_id === one));
    },
    vocabulary_lessons: ok(lessonRows),
    practice_sessions: ok(sessions),
  });
}

function serviceDb(studentId: string) {
  return fakeSupabase({
    student_lesson_progress: ok(progressRows.filter((r) => r.student_id === studentId)),
    practice_sessions: (filters) => {
      const classroom = filters.find(([m, col]) => m === 'eq' && col === 'classroom_id')?.[2];
      const completedOnly = filters.some(([m, col]) => m === 'not' && col === 'completed_at');
      return ok(sessions.filter((r) => (!classroom || r.classroom_id === classroom) && (!completedOnly || r.completed_at)));
    },
  });
}

describe('class views count a word once per student, matching the student insights', () => {
  beforeEach(() => {
    const db = browserDb();
    const builderSingle = (table: string) => {
      const b = db.from(table) as Record<string, unknown>;
      b.single = b.maybeSingle;
      return b;
    };
    (supabase!.from as Mock).mockImplementation(builderSingle);
  });

  it('class report: words learned per student equals the student insights count', async () => {
    const insights = await loadStudentInsights(serviceDb('ana').client, 'ana', CLASSROOM, NOW);
    if (!insights.ok) throw new Error('expected ok');

    const { data, error } = await getClassReportData(CLASSROOM);
    expect(error).toBeNull();
    const ana = data!.studentRankings.find((r) => r.studentId === 'ana')!;
    expect(ana.wordsLearned).toBe(insights.insights.wordsMastered);
    expect(ana.wordsLearned).toBe(1);
    expect(ana.accuracy).toBe(insights.insights.accuracy);
    expect(data!.metrics.classAverageWordsLearned).toBe(1);
  });

  it('class analytics table: a shared word is one word in both the count and the lesson-word total', async () => {
    const { data, error } = await getStudentsProgressSummary(CLASSROOM);
    expect(error).toBeNull();
    const ana = data.find((s) => s.studentId === 'ana')!;
    expect(ana.wordsMastered).toBe(1);
    expect(ana.vocabularyMastery).toBe(33);
  });

  it('student report word table lists a word practised in two lessons once, with summed attempts', async () => {
    const insights = await loadStudentInsights(serviceDb('ana').client, 'ana', CLASSROOM, NOW);
    if (!insights.ok) throw new Error('expected ok');
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, insights: insights.insights }), { status: 200 }));

    const { data } = await getStudentReportData('ana', CLASSROOM, undefined, fetcher as unknown as typeof fetch);
    const tree = data!.wordMastery.filter((w) => w.word === 'tree');
    expect(tree).toEqual([{ word: 'tree', mastered: true, accuracy: 100, attempts: 5, lastPracticed: '2026-10-05' }]);
    expect(data!.wordMastery).toHaveLength(2);
    expect(data!.wordMastery.filter((w) => w.mastered)).toHaveLength(insights.insights.wordsMastered);
  });

  it('insights ignore unfinished and other-class sessions', async () => {
    const insights = await loadStudentInsights(serviceDb('ana').client, 'ana', CLASSROOM, NOW);
    if (!insights.ok) throw new Error('expected ok');
    expect(insights.insights.totalMinutes).toBe(10);
    expect(insights.insights.sessionsCompleted).toBe(1);
  });
});

describe('class views fold capitalisation into one word', () => {
  it('Tree in one lesson and tree in another are one mastered word of three lesson words', async () => {
    const capitalised = progressRows.map((r) =>
      r.lesson_id === 'l2' ? { ...r, words_mastered: ['Tree'], words_attempted: { Tree: { correct: 2, attempts: 2 } } } : r
    );
    const db = browserDb([lessons[0], { id: 'l2', words: [{ word: 'Tree' }, { word: 'moon' }] }], capitalised);
    (supabase!.from as Mock).mockImplementation((table: string) => {
      const b = db.from(table) as Record<string, unknown>;
      b.single = b.maybeSingle;
      return b;
    });

    const { data } = await getStudentsProgressSummary(CLASSROOM);
    const ana = data.find((s) => s.studentId === 'ana')!;
    expect(ana.wordsMastered).toBe(1);
    expect(ana.vocabularyMastery).toBe(33);
  });
});
