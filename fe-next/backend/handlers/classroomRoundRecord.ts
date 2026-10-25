/**
 * One row per completed classroom live round (`classroom_rounds`), plus the
 * education events that round produces. The planner is pure; the recorder
 * owns the two queries and the insert, and never throws into the game path.
 */
import { getSupabase } from '../modules/supabase/client';
import type { ClassroomGame } from '../modules/classroomGameManager';
import logger from '../utils/logger';
import { REAL_CLASS_MIN_PLAYERS } from '@/lib/education/teacherUsagePrompt';
import { planTrialClockStart, type TrialClockRow } from '@/lib/education/trialClockStart';
import { captureEduServerEvents, type EduServerEvent } from '../utils/educationTelemetry';
import {
  buildLiveRoundCompletedEvent,
  buildStudentReturnedEvents,
  buildTeacherFirstLiveGameEvent,
} from '../utils/educationRoundTelemetry';


export interface RoundMembership {
  userId: string;
  joinedAt: string | null;
}

export function planClassroomRoundEvents(args: {
  game: ClassroomGame;
  playerIds: string[];
  durationSeconds: number | null;
  /** Earlier rounds by this teacher with a real class (2+ players); a solo self-test is not a class. */
  priorRealRounds: number;
  memberships: RoundMembership[];
  now: Date;
}): EduServerEvent[] {
  const { game } = args;
  if (!game?.classroomId) return [];

  const completed = buildLiveRoundCompletedEvent({
    game,
    durationSeconds: args.durationSeconds,
    playerCount: args.playerIds.length,
  });
  const events: EduServerEvent[] = completed ? [completed] : [];

  if (args.priorRealRounds === 0 && args.playerIds.length >= REAL_CLASS_MIN_PLAYERS) {
    events.push(
      buildTeacherFirstLiveGameEvent({
        teacherId: game.teacherId,
        classroomId: game.classroomId,
        gameMode: game.settings?.gameMode ?? 'classic',
        playerCount: args.playerIds.length,
      })
    );
  }

  const players = new Set(args.playerIds);
  events.push(
    ...buildStudentReturnedEvents({
      classroomId: game.classroomId,
      now: args.now,
      students: args.memberships.filter((m) => players.has(m.userId)),
    })
  );
  return events;
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
      }));
    }

    if ((count ?? 0) === 0 && opts.playerIds.length >= REAL_CLASS_MIN_PLAYERS) {
      await startAccessTrialClock(supabase, game.teacherId, now.getTime());
    }

    captureEduServerEvents(
      planClassroomRoundEvents({
        game,
        playerIds: opts.playerIds,
        durationSeconds: opts.durationSeconds,
        priorRealRounds: count ?? 0,
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

async function startAccessTrialClock(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  teacherId: string,
  nowMs: number
): Promise<void> {
  const { data, error } = await supabase
    .from('teacher_access_requests')
    .select('id, trial_expires_at, trial_reminders_sent')
    .eq('user_id', teacherId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logger.error('CLASSROOM_GAME', `Trial clock lookup failed for ${teacherId}: ${error.message}`);
    return;
  }
  if (!data) return;
  const row = data as unknown as TrialClockRow & { id: string };
  const patch = planTrialClockStart(row, nowMs);
  if (!patch) return;
  const { error: updateError } = await supabase.from('teacher_access_requests').update(patch as never).eq('id', row.id);
  if (updateError) {
    logger.error('CLASSROOM_GAME', `Trial clock start failed for ${teacherId}: ${updateError.message}`);
    return;
  }
  logger.info('CLASSROOM_GAME', `Access trial clock started at first real class game for ${teacherId}: ends ${patch.trial_expires_at}`);
}
