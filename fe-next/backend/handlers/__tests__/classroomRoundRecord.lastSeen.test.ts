import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';

const h = vi.hoisted(() => ({
  profileUpdates: [] as Array<{ id: string; patch: Record<string, unknown> }>,
  profileReads: 0,
  roundInserts: 0,
  lastSeenAt: null as string | null,
  bumpThrows: false,
}));

vi.mock('../../modules/supabase/client', () => ({
  getSupabase: () => ({
    from(table: string) {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      for (const m of ['select', 'eq', 'gte', 'in', 'order', 'limit']) chain[m] = self;
      chain.maybeSingle = async () => {
        if (table === 'profiles') {
          h.profileReads += 1;
          if (h.bumpThrows) throw new Error('profile read down');
          return { data: { last_seen_at: h.lastSeenAt }, error: null };
        }
        return { data: null, error: null };
      };
      chain.insert = async () => {
        if (table === 'classroom_rounds') h.roundInserts += 1;
        return { error: null };
      };
      chain.update = (patch: Record<string, unknown>) => ({
        eq: async (_col: string, id: string) => {
          if (table === 'profiles') h.profileUpdates.push({ id, patch });
          return { error: null };
        },
      });
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(
          table === 'classroom_rounds' ? { count: 1, error: null } : { data: [], error: null },
        ).then(resolve);
      return chain;
    },
  }),
}));
vi.mock('../../utils/educationTelemetry', () => ({ captureEduServerEvents: vi.fn() }));
vi.mock('../../utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), log: vi.fn() } }));

import { recordClassroomRound } from '../classroomRoundRecord';
import { captureEduServerEvents } from '../../utils/educationTelemetry';

function game(teacherId: string): ClassroomGame {
  return {
    gameCode: 'RND123',
    teacherId,
    classroomId: 'class-1',
    teacherName: 'Ms K',
    lessonIds: [],
    lessonNames: [],
    vocabularyWords: [],
    settings: { gameMode: 'classic' },
    players: [],
    createdAt: new Date().toISOString(),
    status: 'finished',
  };
}

describe('recordClassroomRound — profiles.last_seen_at', () => {
  beforeEach(() => {
    h.profileUpdates = [];
    h.profileReads = 0;
    h.roundInserts = 0;
    h.lastSeenAt = null;
    h.bumpThrows = false;
    vi.clearAllMocks();
  });

  it('bumps last_seen_at after an authed teacher round row is created', async () => {
    await recordClassroomRound(game('teacher-1'), { playerIds: ['s1', 's2'], durationSeconds: 60, startedAt: null });
    expect(h.roundInserts).toBe(1);
    expect(h.profileUpdates).toHaveLength(1);
    expect(h.profileUpdates[0].id).toBe('teacher-1');
    expect(h.profileUpdates[0].patch.last_seen_at).toEqual(expect.any(String));
  });

  it('skips the profile update when last_seen_at is already within 5 minutes', async () => {
    h.lastSeenAt = new Date().toISOString();
    await recordClassroomRound(game('teacher-1'), { playerIds: ['s1'], durationSeconds: 30, startedAt: null });
    expect(h.roundInserts).toBe(1);
    expect(h.profileReads).toBeGreaterThan(0);
    expect(h.profileUpdates).toEqual([]);
  });

  it('performs no profile write when the round has no authenticated teacher', async () => {
    await recordClassroomRound(game(''), { playerIds: [], durationSeconds: 30, startedAt: null });
    expect(h.roundInserts).toBe(1);
    expect(h.profileReads).toBe(0);
    expect(h.profileUpdates).toEqual([]);
  });

  it('still records the round and emits telemetry when the bump throws', async () => {
    h.bumpThrows = true;
    await expect(
      recordClassroomRound(game('teacher-1'), { playerIds: ['s1', 's2'], durationSeconds: 60, startedAt: null }),
    ).resolves.toBeUndefined();
    expect(h.roundInserts).toBe(1);
    expect(h.profileUpdates).toEqual([]);
    expect(captureEduServerEvents).toHaveBeenCalled();
  });
});
