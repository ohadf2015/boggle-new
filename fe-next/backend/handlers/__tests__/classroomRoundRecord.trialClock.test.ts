import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';

const h = vi.hoisted(() => ({
  priorRealRounds: 0,
  trialRow: null as null | { id: string; trial_expires_at: string | null; trial_reminders_sent: string[] | null },
  updates: [] as Array<{ table: string; patch: unknown; id: unknown }>,
  rehearsalIds: [] as string[],
}));

function from(table: string) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  for (const m of ['select', 'eq', 'gte', 'in', 'order', 'limit']) c[m] = self;
  c.insert = async () => ({ error: null });
  c.maybeSingle = async () => ({ data: table === 'teacher_access_requests' ? h.trialRow : null, error: null });
  c.update = (patch: unknown) => ({
    eq: async (_col: string, id: unknown) => {
      h.updates.push({ table, patch, id });
      return { error: null };
    },
  });
  c.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      table === 'classroom_rounds'
        ? { count: h.priorRealRounds, error: null }
        : table === 'classroom_memberships'
          ? { data: h.rehearsalIds.map((student_id) => ({ student_id })), error: null }
          : { data: [], error: null },
    ).then(resolve);
  return c;
}

vi.mock('../../modules/supabase/client', () => ({ getSupabase: () => ({ from }) }));
vi.mock('../../utils/educationTelemetry', () => ({ captureEduServerEvents: vi.fn() }));
vi.mock('../../utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), log: vi.fn() } }));

import { recordClassroomRound } from '../classroomRoundRecord';

const game = {
  gameCode: 'GHY123',
  teacherId: 'teacher-1',
  classroomId: 'class-1',
  lessonIds: [],
  settings: { gameMode: 'classic' },
} as unknown as ClassroomGame;

describe('recordClassroomRound: the access trial clock starts at the first real class game', () => {
  beforeEach(() => {
    h.priorRealRounds = 0;
    h.updates = [];
    h.rehearsalIds = [];
    h.trialRow = { id: 'req-1', trial_expires_at: '2026-01-01T00:00:00Z', trial_reminders_sent: ['t-3'] };
  });

  it('restarts an expired access trial when the first 2-player round completes', async () => {
    await recordClassroomRound(game, { playerIds: ['s1', 's2'], durationSeconds: 60, startedAt: null });
    const trialUpdate = h.updates.find((u) => u.table === 'teacher_access_requests');
    expect(trialUpdate?.id).toBe('req-1');
    const patch = trialUpdate?.patch as { trial_expires_at: string; trial_reminders_sent: string[] };
    expect(Date.parse(patch.trial_expires_at)).toBeGreaterThan(Date.now() + 13 * 86_400_000);
    expect(patch.trial_reminders_sent).toEqual([]);
  });

  it('does not start the clock when the second player is the phone test seat', async () => {
    h.rehearsalIds = ['rehearsal'];
    await recordClassroomRound(game, { playerIds: ['s1', 'rehearsal'], durationSeconds: 60, startedAt: null });
    expect(h.updates.filter((u) => u.table === 'teacher_access_requests')).toEqual([]);
  });

  it('leaves the trial alone on a solo self-test round', async () => {
    await recordClassroomRound(game, { playerIds: ['s1'], durationSeconds: 60, startedAt: null });
    expect(h.updates.filter((u) => u.table === 'teacher_access_requests')).toEqual([]);
  });

  it('leaves the trial alone after the teacher already ran a real round', async () => {
    h.priorRealRounds = 2;
    await recordClassroomRound(game, { playerIds: ['s1', 's2'], durationSeconds: 60, startedAt: null });
    expect(h.updates.filter((u) => u.table === 'teacher_access_requests')).toEqual([]);
  });
});
