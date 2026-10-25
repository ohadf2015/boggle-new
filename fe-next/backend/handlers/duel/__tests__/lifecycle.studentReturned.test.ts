import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';

const h = vi.hoisted(() => ({ returned: vi.fn(async () => undefined) }));

vi.mock('@/lib/education/studentReturnTelemetry', () => ({ captureStudentReturned: h.returned }));
vi.mock('@/backend/utils/logger', () => ({ default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../realtime', () => ({ startRealtimeDuel: vi.fn() }));

const DUEL = '550e8400-e29b-41d4-a716-446655440000';
const pending = { id: DUEL, status: 'pending', opponent_id: 'user-123', challenger_id: 'user-999', duel_type: 'async', board_state: [] };

vi.mock('@/backend/modules/supabase/client', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: pending, error: null }) }) }),
      update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { ...pending, status: 'active' }, error: null }) }) }) }) }),
    }),
  }),
}));

import { registerLifecycleHandlers } from '../lifecycle';

describe('duel:accept — edu_student_returned', () => {
  beforeEach(() => h.returned.mockClear());

  it('Given an accepted duel, Then both students get a duel-surface return event', async () => {
    const handlers: Record<string, (p: unknown) => Promise<void>> = {};
    const socket = {
      id: 's1', data: { userId: 'user-123', displayName: 'A', classroomIds: [] },
      on: (e: string, fn: (p: unknown) => Promise<void>) => { handlers[e] = fn; }, emit: vi.fn(), join: vi.fn(),
    } as unknown as DuelSocket;
    const ns = { to: vi.fn().mockReturnThis(), emit: vi.fn(), sockets: new Map() } as unknown as Namespace;
    registerLifecycleHandlers(ns, socket);

    await handlers['duel:accept']({ duelId: DUEL });

    const calls = h.returned.mock.calls.map((c) => (c as unknown[])[1] as { studentId: string; surface: string });
    expect(calls.map((a) => [a.studentId, a.surface]).sort()).toEqual([['user-123', 'duel'], ['user-999', 'duel']]);
  });
});
