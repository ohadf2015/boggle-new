import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (arg: (typeof captured)[number]) => captured.push(arg) }),
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { captureStudentReturned } from '../studentReturnTelemetry';

interface World {
  memberships: Array<{ classroom_id: string; joined_at: string }>;
  assigned: Array<{ lesson_id: string; classroom_id: string }>;
  flagged: string[];
}

function fake(w: World) {
  return {
    from: (table: string) => {
      if (table === 'classroom_memberships') {
        return { select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [...w.memberships].sort((a, b) => a.joined_at.localeCompare(b.joined_at)), error: null }) }) }) }) };
      }
      if (table === 'lesson_assignments') {
        return {
          select: () => ({
            eq: (_c: string, lessonId: string) => ({
              in: (_c2: string, rooms: string[]) => ({
                limit: async () => ({ data: w.assigned.filter((a) => a.lesson_id === lessonId && rooms.includes(a.classroom_id)), error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return { select: () => ({ in: (_c: string, ids: string[]) => ({ eq: async () => ({ data: ids.filter((i) => w.flagged.includes(i)).map((id) => ({ id })), error: null }) }) }) };
      }
      throw new Error(`unexpected ${table}`);
    },
  };
}

const NOW = new Date('2026-10-10T12:00:00Z');

describe('captureStudentReturned', () => {
  beforeEach(() => { captured.length = 0; });

  it('Given a student who joined 3 days ago starts solo practice, Then a D3 return fires on the practice surface', async () => {
    await captureStudentReturned(fake({ memberships: [{ classroom_id: 'c1', joined_at: '2026-10-07T10:00:00Z' }], assigned: [], flagged: [] }) as never,
      { studentId: 's1', gameMode: 'flashcard', surface: 'practice', lessonId: 'l1', now: NOW });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      distinctId: 's1',
      event: 'edu_student_returned',
      properties: { classroom_id: 'c1', day_n: 3, retention_day: 3, game_mode: 'flashcard', surface: 'practice', is_test_account: false },
    });
  });

  it('Given the lesson is assigned to one of their classes, Then the surface is assignment and that class is named', async () => {
    await captureStudentReturned(fake({
      memberships: [{ classroom_id: 'c1', joined_at: '2026-10-01T10:00:00Z' }, { classroom_id: 'c2', joined_at: '2026-10-02T10:00:00Z' }],
      assigned: [{ lesson_id: 'l9', classroom_id: 'c2' }],
      flagged: ['s1'],
    }) as never, { studentId: 's1', gameMode: 'solo_board', surface: 'practice', lessonId: 'l9', now: NOW });
    expect(captured[0].properties).toMatchObject({ classroom_id: 'c2', surface: 'assignment', day_n: 9, retention_day: 7, is_test_account: true });
  });

  it('Given a student with no classroom, or one who joined today, Then nothing fires', async () => {
    await captureStudentReturned(fake({ memberships: [], assigned: [], flagged: [] }) as never,
      { studentId: 's1', gameMode: 'duel', surface: 'duel', now: NOW });
    await captureStudentReturned(fake({ memberships: [{ classroom_id: 'c1', joined_at: '2026-10-10T08:00:00Z' }], assigned: [], flagged: [] }) as never,
      { studentId: 's1', gameMode: 'duel', surface: 'duel', now: NOW });
    expect(captured).toHaveLength(0);
  });
});
