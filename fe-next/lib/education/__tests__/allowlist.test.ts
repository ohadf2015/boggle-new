import { describe, it, expect, vi } from 'vitest';

const calls: any[] = [];

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    from: (t: string) => {
      if (t === 'teacher_access_allowlist') return {
        select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: { email: 'x@y.com' } }) }) }) }),
        update: vi.fn((u: any) => { calls.push({ table: t, op: 'update', u }); return { eq: vi.fn(async () => ({ error: null })) }; }),
      };
      if (t === 'profiles') return {
        update: vi.fn((u: any) => { calls.push({ table: t, op: 'update', u }); return { eq: vi.fn(async () => ({ error: null })) }; }),
      };
      return {} as any;
    },
  }),
}));

import { consumeTeacherAllowlist } from '../allowlist';

describe('consumeTeacherAllowlist', () => {
  it('flips role and marks consumed when match exists', async () => {
    calls.length = 0;
    const out = await consumeTeacherAllowlist({ userId: 'u-1', email: 'x@y.com' });
    expect(out.consumed).toBe(true);
    expect(calls.find((c) => c.table === 'profiles')?.u?.user_role).toBe('teacher');
  });
});
