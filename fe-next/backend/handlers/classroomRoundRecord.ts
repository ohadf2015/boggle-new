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
} from '../utils/educationRoundTelemetry';

export interface RoundMembership {
  userId: string;
  joinedAt: string | null;
}

export function planClassroomRoundEvents(args: {
  game: ClassroomGame;
  playerIds: string[];
  durationSeconds: number | null;
  priorRounds: number;
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

  if (args.priorRounds === 0) {
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
      .eq('teacher_id', game.teacherId);
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

    captureEduServerEvents(
      planClassroomRoundEvents({
        game,
        playerIds: opts.playerIds,
        durationSeconds: opts.durationSeconds,
        priorRounds: count ?? 0,
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
