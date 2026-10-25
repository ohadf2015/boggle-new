import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: (a: (typeof captured)[number]) => captured.push(a) }) }));
vi.mock('../logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const db = vi.hoisted(() => ({ rounds: [] as Array<{ teacher_id: string; game_code: string }>, flagged: [] as string[], roundsError: null as null | { message: string } }));
vi.mock('../../modules/supabase/client', () => ({
  getSupabase: () => ({
    from: (table: string) => {
      if (table === 'classroom_rounds') {
        const f: Array<[string, unknown]> = [];
        const q: Record<string, unknown> = {
          select: () => q,
          eq: (c: string, v: unknown) => { f.push([c, v]); return q; },
          then: (ok: (v: unknown) => unknown) => Promise.resolve(db.roundsError
            ? { count: null, error: db.roundsError }
            : { count: db.rounds.filter((r) => f.every(([c, v]) => (r as Record<string, unknown>)[c] === v)).length, error: null }).then(ok),
        };
        return q;
      }
      if (table === 'classrooms') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { teacher_id: 't1' }, error: null }) }) }) };
      }
      return { select: () => ({ in: (_c: string, ids: string[]) => ({ eq: async () => ({ data: ids.filter((i) => db.flagged.includes(i)).map((id) => ({ id })), error: null }) }) }) };
    },
  }),
}));

import { captureLiveGameEnded, captureJoinRefusal } from '../eduLiveEvents';

const game = { gameCode: 'G1', classroomId: 'c1', teacherId: 't1', players: [], lessonIds: [], settings: {}, startedAt: '2026-10-01T10:00:00Z' } as unknown as ClassroomGame;

describe('captureLiveGameEnded', () => {
  beforeEach(() => { captured.length = 0; db.rounds = []; db.flagged = []; db.roundsError = null; });

  it('Given an empty roster but two recorded rounds, Then the ended event says 2 rounds, not a bounce', async () => {
    db.rounds = [{ teacher_id: 't1', game_code: 'G1' }, { teacher_id: 't1', game_code: 'G1' }, { teacher_id: 't1', game_code: 'OTHER' }];
    await captureLiveGameEnded(game);
    expect(captured[0].properties).toMatchObject({ rounds_recorded: 2, roster_count: 0 });
  });

  it('Given a game that ended with no recorded round, Then rounds_recorded is 0', async () => {
    await captureLiveGameEnded(game);
    expect(captured[0].properties.rounds_recorded).toBe(0);
  });

  it('Given the round count read fails, Then rounds_recorded is null (unknown), never 0', async () => {
    db.roundsError = { message: 'down' };
    await captureLiveGameEnded(game);
    expect(captured[0].properties.rounds_recorded).toBeNull();
  });
});

describe('captureJoinRefusal', () => {
  beforeEach(() => { captured.length = 0; db.flagged = []; });

  it('Given a refused guest in a QA teacher class, Then the refusal is tagged as test traffic', async () => {
    db.flagged = ['t1'];
    await captureJoinRefusal({ gameCode: 'G1', classroomId: 'c1', reason: 'NOT_A_MEMBER', door: 'classroomBanner', actorId: null });
    expect(captured[0]).toMatchObject({ event: 'edu_classroom_join_refused', properties: { is_test_account: true, reason: 'NOT_A_MEMBER' } });
  });

  it('Given an unknown code (no classroom), Then the refusal still fires with an explicit false', async () => {
    await captureJoinRefusal({ gameCode: 'ZZZ', classroomId: null, reason: 'CODE_UNKNOWN', door: 'join', actorId: null });
    expect(captured[0].properties.is_test_account).toBe(false);
  });
});
