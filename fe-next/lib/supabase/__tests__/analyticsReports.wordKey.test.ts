import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getStudentReportData, getVocabularyHeatmapData } from '../analyticsReports';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const progressRows = [
  {
    student_id: 's1',
    lesson_id: 'l1',
    words_mastered: ['Tree'],
    words_attempted: { Tree: { correct: 1, attempts: 2, lastAttemptAt: '2026-10-09T00:00:00Z' } },
    last_practice_date: '2026-10-09',
  },
  {
    student_id: 's1',
    lesson_id: 'l2',
    words_mastered: [],
    words_attempted: { tree: { correct: 3, attempts: 3, lastAttemptAt: '2026-10-01T00:00:00Z' } },
    last_practice_date: '2026-10-01',
  },
];

function table(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'not', 'gte', 'lte', 'order', 'limit']) b[m] = vi.fn(() => b);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (resolve: (r: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return b;
}

describe('class and student reports count a word once whatever its capitalisation', () => {
  beforeEach(() => {
    const rows: Record<string, { data: unknown; error: unknown }> = {
      public_profiles: { data: [{ id: 's1', display_name: 'Ana' }], error: null },
      classrooms: { data: { id: 'c1', name: 'Class A' }, error: null },
      classroom_memberships: { data: [{ student_id: 's1' }], error: null },
      student_lesson_progress: { data: progressRows, error: null },
    };
    (supabase!.from as Mock).mockImplementation((name: string) => table(rows[name]));
  });

  it('lists Tree/tree from two lessons as one row in the student report, latest spelling and date', async () => {
    const insights = { accuracy: 80, wordsMastered: 1, wordsPracticed: 1 };
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, insights }), { status: 200 }));
    const { data, error } = await getStudentReportData('s1', 'c1', undefined, fetcher as unknown as typeof fetch);
    expect(error).toBeNull();
    expect(data!.wordMastery).toEqual([
      { word: 'Tree', mastered: true, accuracy: 80, attempts: 5, lastPracticed: '2026-10-09' },
    ]);
  });

  it('gives the heatmap one column for Tree/tree with the summed attempts', async () => {
    const { data, error } = await getVocabularyHeatmapData('c1');
    expect(error).toBeNull();
    expect(data.words).toHaveLength(1);
    expect(data.cells).toHaveLength(1);
    expect(data.cells[0]).toMatchObject({ attempts: 5, accuracy: 80 });
  });
});
