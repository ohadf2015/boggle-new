/**
 * One row per completed classroom live round (`classroom_rounds`), plus the
 * education events that round produces. The planner is pure; the recorder
 * owns the two queries and the insert, and never throws into the game path.
 */
import { getSupabase } from '../modules/supabase/client';
import type { ClassroomGame } from '../modules/classroomGameManager';
import logger from '../utils/logger';
import { captureEduServerEvents, type EduServerEvent } from '../utils/educationTelemetry';
import {
  buildLiveRoundCompletedEvent,
  buildStudentReturnedEvents,
  buildTeacherFirstLiveGameEvent,
  buildTeacherSecondLiveGameDayEvent,
  secondLiveGameDaysSinceFirst,
  startOfNextUtcDay,
} from '../utils/educationRoundTelemetry';
import { loadTestAccountIds } from '@/lib/education/eduTestAccount';

const REAL_CLASS_MIN_PLAYERS = 2;

export interface RoundMembership {
  userId: string;
  joinedAt: string | null;
  isTestAccount: boolean;
}

export function planClassroomRoundEvents(args: {
  game: ClassroomGame;
  playerIds: string[];
  durationSeconds: number | null;
  /** Earlier rounds by this teacher with a real class (2+ players); a solo self-test is not a class. */
  priorRealRounds: number;
  /** The teacher's earliest real round before this one, and whether one already landed on a later UTC day. */
  firstRealRoundAt: string | null;
  secondDayReached: boolean;
  teacherIsTest: boolean;
  memberships: RoundMembership[];
  now: Date;
}): EduServerEvent[] {
  const { game, teacherIsTest } = args;
  if (!game?.classroomId) return [];

  const gameMode = game.settings?.gameMode ?? 'classic';
  const playerCount = args.playerIds.length;
  const isRealRound = playerCount >= REAL_CLASS_MIN_PLAYERS;
  const completed = buildLiveRoundCompletedEvent({
    game,
    durationSeconds: args.durationSeconds,
    playerCount,
    isTestAccount: teacherIsTest,
  });
  const events: EduServerEvent[] = completed ? [completed] : [];
  const teacher = { teacherId: game.teacherId, classroomId: game.classroomId, gameMode, playerCount, isTestAccount: teacherIsTest };

  if (args.priorRealRounds === 0 && isRealRound) events.push(buildTeacherFirstLiveGameEvent(teacher));

  const daysSinceFirst = secondLiveGameDaysSinceFirst({
    firstRealRoundAt: args.firstRealRoundAt,
    secondDayReached: args.secondDayReached,
    isRealRound,
    now: args.now,
  });
  if (daysSinceFirst !== null) events.push(buildTeacherSecondLiveGameDayEvent({ ...teacher, daysSinceFirst }));

  const players = new Set(args.playerIds);
  events.push(
    ...buildStudentReturnedEvents({
      classroomId: game.classroomId,
      now: args.now,
      gameMode,
      surface: 'live',
      students: args.memberships
        .filter((m) => players.has(m.userId))
        .map((m) => ({ ...m, isTestAccount: teacherIsTest || m.isTestAccount })),
    })
  );
  return events;
}

async function loadRealRoundHistory(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  teacherId: string
): Promise<{ firstRealRoundAt: string | null; secondDayReached: boolean }> {
  const realRounds = () =>
    supabase
      .from('classroom_rounds' as never)
      .select('completed_at')
      .eq('teacher_id', teacherId)
      .gte('player_count', REAL_CLASS_MIN_PLAYERS);
  const { data: first, error } = await realRounds().order('completed_at', { ascending: true }).limit(1);
  if (error) throw new Error(error.message);
  const firstRealRoundAt = ((first ?? []) as Array<{ completed_at: string | null }>)[0]?.completed_at ?? null;
  if (!firstRealRoundAt) return { firstRealRoundAt: null, secondDayReached: false };
  const { data: later, error: laterError } = await realRounds()
    .gte('completed_at', startOfNextUtcDay(firstRealRoundAt))
    .limit(1);
  if (laterError) throw new Error(laterError.message);
  return { firstRealRoundAt, secondDayReached: (later ?? []).length > 0 };
}

export async function recordClassroomRound(
  game: ClassroomGame,
  opts: { playerIds: string[]; durationSeconds: number | null; startedAt: Date | null }
): Promise<void> {
  if (!game?.classroomId) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { count, error: countError } = await supabase
      .from('classroom_rounds' as never)
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', game.teacherId)
      .gte('player_count', REAL_CLASS_MIN_PLAYERS);
    if (countError) throw new Error(countError.message);
    const history = await loadRealRoundHistory(supabase, game.teacherId);
    const flagged = await loadTestAccountIds(supabase, [game.teacherId, ...opts.playerIds]);

    const now = new Date();
    const { error: insertError } = await supabase.from('classroom_rounds' as never).insert({
      classroom_id: game.classroomId,
      teacher_id: game.teacherId,
      game_code: game.gameCode,
      game_mode: game.settings?.gameMode ?? 'classic',
      lesson_count: game.lessonIds?.length ?? 0,
      player_count: opts.playerIds.length,
      duration_seconds: opts.durationSeconds,
      started_at: opts.startedAt?.toISOString() ?? null,
      completed_at: now.toISOString(),
    } as never);
    if (insertError) throw new Error(insertError.message);

    let memberships: RoundMembership[] = [];
    if (opts.playerIds.length > 0) {
      const { data } = await supabase
        .from('classroom_memberships')
        .select('student_id, joined_at')
        .eq('classroom_id', game.classroomId)
        .in('student_id', opts.playerIds);
      memberships = (data ?? []).map((row) => ({
        userId: row.student_id,
        joinedAt: row.joined_at,
        isTestAccount: flagged.has(row.student_id),
      }));
    }

    captureEduServerEvents(
      planClassroomRoundEvents({
        game,
        playerIds: opts.playerIds,
        durationSeconds: opts.durationSeconds,
        priorRealRounds: count ?? 0,
        ...history,
        teacherIsTest: flagged.has(game.teacherId),
        memberships,
        now,
      })
    );
  } catch (err) {
    logger.error(
      'CLASSROOM_GAME',
      `Failed to record classroom round ${game.gameCode}: ${err instanceof Error ? err.message : 'unknown'}`
    );
  }
}
