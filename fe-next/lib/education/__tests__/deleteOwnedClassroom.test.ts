import { describe, it, expect } from 'vitest';
import { deleteOwnedClassroom, type ClassroomDeleteClient, type ClassroomDeleteResult } from '@/lib/education/deleteOwnedClassroom';

function client(script: {
  rounds?: ClassroomDeleteResult[];
  classrooms?: ClassroomDeleteResult[];
  still?: ClassroomDeleteResult[];
}): ClassroomDeleteClient & { calls: string[] } {
  const calls: string[] = [];
  const take = (queue: ClassroomDeleteResult[] | undefined, fallback: ClassroomDeleteResult) => {
    if (!queue || queue.length === 0) return fallback;
    return queue.length > 1 ? queue.shift()! : queue[0];
  };
  return {
    calls,
    deleteWhere: async (table) => {
      calls.push(`delete:${table}`);
      if (table === 'classroom_rounds') {
        return take(script.rounds, { data: [], error: null });
      }
      return take(script.classrooms, { data: [{ id: 'c1' }], error: null });
    },
    selectWhere: async (table) => {
      calls.push(`select:${table}`);
      return take(script.still, { data: null, error: null });
    },
  };
}

describe('deleteOwnedClassroom', () => {
  it('deletes rounds before the classroom so SET NULL cannot orphan reports', async () => {
    const c = client({});
    const outcome = await deleteOwnedClassroom(c, 'c1', { retryDelayMs: 0 });
    expect(outcome.ok).toBe(true);
    expect(outcome.alreadyDeleted).toBe(false);
    expect(c.calls).toEqual(['delete:classroom_rounds', 'delete:classrooms']);
  });

  it('treats an already-gone classroom as success', async () => {
    const c = client({
      classrooms: [{ data: [], error: null }],
      still: [{ data: null, error: null }],
    });
    const outcome = await deleteOwnedClassroom(c, 'c1', { retryDelayMs: 0 });
    expect(outcome).toMatchObject({ ok: true, alreadyDeleted: true });
  });

  it('retries a timeout once, then succeeds', async () => {
    const c = client({
      rounds: [
        { data: null, error: { message: 'timeout', status: 504 } },
        { data: [], error: null },
      ],
    });
    const outcome = await deleteOwnedClassroom(c, 'c1', { retryDelayMs: 0 });
    expect(outcome.ok).toBe(true);
    expect(outcome.attempts).toBe(2);
  });

  it('returns failure when the classroom is still there after a retryable error', async () => {
    const c = client({
      classrooms: [{ data: null, error: { message: 'timeout', status: 504 } }],
      still: [{ data: { id: 'c1' }, error: null }],
    });
    const outcome = await deleteOwnedClassroom(c, 'c1', { maxAttempts: 1, retryDelayMs: 0 });
    expect(outcome.ok).toBe(false);
  });
});
