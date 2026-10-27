import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';

const h = vi.hoisted(() => ({
  priorRealRounds: 0,
}));

function from(table: string) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  for (const m of ['select', 'eq', 'gte', 'in', 'order', 'limit']) c[m] = self;
  c.insert = async () => ({ error: null });
  c.maybeSingle = async () => ({ data: null, error: null });
  c.update = () => ({ eq: async () => ({ error: null }) });
  c.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      table === 'classroom_rounds' ? { count: h.priorRealRounds, error: null } : { data: [], error: null },
    ).then(resolve);
  return c;
}

vi.mock('../../modules/supabase/client', () => ({ getSupabase: () => ({ from }) }));
vi.mock('../../modules/supabase/teacherActivation', () => ({
  markTeacherLiveStarted: vi.fn(async () => undefined),
  markTeacherRoomOpened: vi.fn(async () => undefined),
}));
vi.mock('../../utils/educationTelemetry', () => ({ captureEduServerEvents: vi.fn() }));
vi.mock('../../utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), log: vi.fn() } }));

import { recordClassroomRound } from '../classroomRoundRecord';
import { markTeacherLiveStarted } from '../../modules/supabase/teacherActivation';

const game = {
  gameCode: 'GHY123',
  teacherId: 'teacher-1',
  classroomId: 'class-1',
  lessonIds: [],
  settings: { gameMode: 'classic' },
} as unknown as ClassroomGame;

describe('recordClassroomRound: live-started is stamped by the first REAL class round', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.priorRealRounds = 0;
  });

  it('stamps live-started when the first 2-player round completes', async () => {
    await recordClassroomRound(game, { playerIds: ['s1', 's2'], durationSeconds: 60, startedAt: null });
    expect(markTeacherLiveStarted).toHaveBeenCalledTimes(1);
    expect(markTeacherLiveStarted).toHaveBeenCalledWith('teacher-1');
  });

  it('does not stamp on a solo self-test round', async () => {
    await recordClassroomRound(game, { playerIds: ['s1'], durationSeconds: 60, startedAt: null });
    expect(markTeacherLiveStarted).not.toHaveBeenCalled();
  });

  it('does not stamp again once a real round already exists', async () => {
    h.priorRealRounds = 3;
    await recordClassroomRound(game, { playerIds: ['s1', 's2'], durationSeconds: 60, startedAt: null });
    expect(markTeacherLiveStarted).not.toHaveBeenCalled();
  });

  it('does not stamp a rehearsal with bots only (no real player rows)', async () => {
    // Bots never reach playerIds: they have no persisted practice sessions, so
    // persistClassroomGameScores only forwards authenticated participants. The
    // zero-player round is the bot-rehearsal shape at this layer.
    await recordClassroomRound(game, { playerIds: [], durationSeconds: 60, startedAt: null });
    expect(markTeacherLiveStarted).not.toHaveBeenCalled();
  });
});
