/**
 * Measurement-gap regression (audit 2026-10-31).
 *
 * A teacher who returns without bumping last_seen_at stayed stuck at signup:
 * the friends writer never mounts on /teacher, so classroom rounds were invisible
 * to profiles.last_seen_at. These tests lock the server half of that fix.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassroomGame } from '../../modules/classroomGameManager';

const SIGNUP = '2026-10-29T02:40:00.000Z';

const h = vi.hoisted(() => ({
  lastSeenAt: '2026-10-29T02:40:00.000Z' as string | null,
  writes: [] as Array<{ id: string; patch: Record<string, unknown> }>,
  reads: 0,
}));

function client() {
  return {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from(table: string) {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      for (const method of ['select', 'eq', 'gte', 'in', 'order', 'limit', 'is']) chain[method] = self;
      chain.insert = async () => ({ error: null });
      chain.update = (patch: Record<string, unknown>) => ({
        eq: async (_col: string, id: string) => {
          if (table === 'profiles' && Object.prototype.hasOwnProperty.call(patch, 'last_seen_at')) {
            h.writes.push({ id, patch });
            h.lastSeenAt = (patch.last_seen_at as string | null) ?? null;
          }
          return { error: null };
        },
      });
      chain.maybeSingle = async () => {
        if (table === 'profiles') {
          h.reads += 1;
          return { data: { last_seen_at: h.lastSeenAt }, error: null };
        }
        return { data: null, error: null };
      };
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
      return chain;
    },
  };
}

vi.mock('../../utils/logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));
vi.mock('../../utils/educationTelemetry', () => ({ captureEduServerEvents: vi.fn() }));
vi.mock('../../modules/supabase/client', () => ({
  getSupabase: () => client(),
}));

import { LAST_SEEN_BUMP_THROTTLE_MS, bumpAuthedClassroomTeacher, bumpTeacherLastSeen } from '../bumpTeacherLastSeen';
import { recordClassroomRound } from '../classroomRoundRecord';

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
    createdAt: SIGNUP,
    status: 'finished',
  };
}

/** The profiles write TeacherPresencePing / updateOnlineStatus performs on /[locale]/teacher. */
async function teacherRoutePresencePing(userId: string, at: Date) {
  const supabase = client() as unknown as SupabaseClient;
  await supabase.from('profiles').update({ last_seen_at: at.toISOString() }).eq('id', userId);
}

describe('teacher who returns without bumping last_seen_at', () => {
  beforeEach(() => {
    h.lastSeenAt = SIGNUP;
    h.writes = [];
    h.reads = 0;
  });

  it('opens /en/teacher and starts a classroom round with last_seen_at >= started_at', async () => {
    const startedAt = new Date('2026-10-30T03:08:00.000Z');
    const supabase = client() as unknown as SupabaseClient;

    await teacherRoutePresencePing('teacher-1', startedAt);
    expect(h.lastSeenAt).toBe(startedAt.toISOString());

    await bumpAuthedClassroomTeacher(supabase, 'teacher-1', 'teacher-1', startedAt);

    expect(h.lastSeenAt).not.toBe(SIGNUP);
    expect(Date.parse(h.lastSeenAt!)).toBeGreaterThanOrEqual(startedAt.getTime());
  });

  it('starts a classroom round from a stuck signup last_seen and records last_seen_at >= started_at', async () => {
    const startedAt = new Date(Date.now() - 5_000);
    await recordClassroomRound(game('teacher-1'), {
      playerIds: ['s1'],
      durationSeconds: 60,
      startedAt,
    });

    const seenWrites = h.writes.filter((w) => 'last_seen_at' in w.patch);
    expect(seenWrites).toHaveLength(1);
    expect(seenWrites[0].id).toBe('teacher-1');
    expect(Date.parse(String(seenWrites[0].patch.last_seen_at))).toBeGreaterThanOrEqual(startedAt.getTime());
    expect(Date.parse(h.lastSeenAt!)).toBeGreaterThanOrEqual(startedAt.getTime());
  });

  it('anonymous sessions produce no profiles write on round start', async () => {
    const startedAt = new Date('2026-10-30T03:08:00.000Z');
    const supabase = client() as unknown as SupabaseClient;

    await bumpAuthedClassroomTeacher(supabase, null, 'teacher-1', startedAt);
    await bumpAuthedClassroomTeacher(supabase, 'student-1', 'teacher-1', startedAt);
    await bumpTeacherLastSeen(supabase, null, startedAt);
    await bumpTeacherLastSeen(supabase, '', startedAt);
    await recordClassroomRound(game(''), { playerIds: [], durationSeconds: 30, startedAt });

    expect(h.reads).toBe(0);
    expect(h.writes).toEqual([]);
    expect(h.lastSeenAt).toBe(SIGNUP);
  });

  it('two pings within the 5-minute throttle yield one profiles update', async () => {
    const supabase = client() as unknown as SupabaseClient;
    const first = new Date('2026-10-30T03:00:00.000Z');
    const second = new Date(first.getTime() + 60_000);

    expect(LAST_SEEN_BUMP_THROTTLE_MS).toBe(5 * 60 * 1000);
    await bumpTeacherLastSeen(supabase, 'teacher-1', first);
    await bumpTeacherLastSeen(supabase, 'teacher-1', second);

    expect(h.writes).toHaveLength(1);
    expect(h.writes[0]).toEqual({ id: 'teacher-1', patch: { last_seen_at: first.toISOString() } });
    expect(h.reads).toBe(2);
  });
});
