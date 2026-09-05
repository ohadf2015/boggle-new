import { vi, describe, it, expect, beforeEach } from 'vitest';
/**
 * Teacher-facing reads name their columns.
 *
 * `select('*')` binds a read to whatever the table happens to contain. Neither
 * `lesson_templates` nor `classrooms` carries a wide column today, so this
 * costs nothing to fix and stops the next migration from silently adding bytes
 * to a teacher's first paint on a school Chromebook.
 */

vi.mock('next/server', () => {
  class MockNextRequest {
    url: string;
    method: string;
    constructor(url: string, init?: { method?: string }) {
      this.url = url;
      this.method = init?.method || 'GET';
    }
    async json() {
      return null;
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: vi.fn((data: unknown, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

vi.mock('@/utils/supabase/server');
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn().mockResolvedValue({ id: 'teacher-1' }),
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { createClient } from '@/utils/supabase/server';

/** Every column the lesson_templates row type exposes to the UI. */
const TEMPLATE_COLUMNS = [
  'id',
  'lesson_id',
  'teacher_id',
  'name',
  'timer_seconds',
  'difficulty',
  'min_word_length',
  'allow_late_join',
  'board_rows',
  'board_cols',
  'is_default',
  'created_at',
  'updated_at',
];

function wireSupabase() {
  const selectArgs: (string | undefined)[] = [];
  const builder: Record<string, unknown> = {
    select: (cols?: string) => {
      selectArgs.push(cols);
      return builder;
    },
    eq: () => builder,
    order: () => builder,
    single: () => Promise.resolve({ data: { id: 'tpl-1' }, error: null }),
    then: (onOk: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(onOk),
  };
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    from: () => builder,
    auth: { getUser: vi.fn() },
  });
  return selectArgs;
}

describe('GET /api/education/templates — explicit column lists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names its columns when fetching a single template', async () => {
    const selectArgs = wireSupabase();

    const response = await GET(
      new NextRequest('http://localhost/api/education/templates?id=tpl-1')
    );

    expect(response.status).toBe(200);
    expect(selectArgs).toHaveLength(1);
    expect(selectArgs[0]).not.toBe('*');
    for (const column of TEMPLATE_COLUMNS) {
      expect(selectArgs[0]).toContain(column);
    }
  });

  it('names its columns when listing a lesson\'s templates', async () => {
    const selectArgs = wireSupabase();

    const response = await GET(
      new NextRequest('http://localhost/api/education/templates?lessonId=lesson-1')
    );

    expect(response.status).toBe(200);
    expect(selectArgs).toHaveLength(1);
    expect(selectArgs[0]).not.toBe('*');
    for (const column of TEMPLATE_COLUMNS) {
      expect(selectArgs[0]).toContain(column);
    }
  });
});
