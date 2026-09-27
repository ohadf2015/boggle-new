import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * `getAssignmentCompletions` used to `select('*')` from `student_lesson_progress`,
 * which is how `score`/`accuracy` — columns that don't exist on that table —
 * could be "read" as `undefined` without anyone noticing at the query layer.
 * Pinning the explicit column list here means adding a new caller that reads
 * another real column (e.g. `total_xp`) fails loudly here instead of silently
 * getting `undefined` at runtime.
 */

const selectCalls: string[] = [];

function chain() {
  const api: Record<string, (...args: unknown[]) => unknown> = {};
  const self = () => api;
  api.select = vi.fn((cols: string) => {
    selectCalls.push(cols);
    return self();
  });
  api.eq = vi.fn(self);
  api.in = vi.fn(() => Promise.resolve({ data: [], error: null }));
  api.not = vi.fn(self);
  api.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
  return api;
}

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(() => chain()) },
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getAssignmentCompletions } from '../assignments';

describe('getAssignmentCompletions column selection', () => {
  beforeEach(() => {
    selectCalls.length = 0;
  });

  it('selects the real student_lesson_progress columns, including words_attempted and completed_at', async () => {
    await getAssignmentCompletions('a1');

    const progressSelect = selectCalls[0];
    expect(progressSelect).not.toBe('*');
    expect(progressSelect).toContain('words_attempted');
    expect(progressSelect).toContain('completed_at');
    expect(progressSelect).toContain('student_id');
    expect(progressSelect).not.toContain('score');
    expect(progressSelect).not.toContain('accuracy');
  });
});
