/**
 * Throttled server-side bump of profiles.last_seen_at.
 *
 * Education and teacher surfaces never mount useFriends, so the client
 * updateOnlineStatus() writer never runs for a teacher who only teaches.
 * Classroom round start / round-row insert is the server signal that they
 * came back. The window matches the task: skip when the stored timestamp is
 * already within 5 minutes, so a burst of round starts is one write.
 *
 * Uses the service-role Supabase client the classroom recorder already holds.
 * Drizzle's profiles table does not include last_seen_at, and getDrizzleClient()
 * throws when DATABASE_URL is unset — a bump that cannot connect must not be
 * the path, and must never fail the round.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Socket } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';
import { getAuthUserId } from './classroomSocketAuth.js';
import logger from '../utils/logger.js';

/** Skip a write when last_seen_at is this recent. Age must be strictly greater to write. */
export const LAST_SEEN_BUMP_THROTTLE_MS = 5 * 60 * 1000;

export function shouldBumpLastSeen(
  lastSeenAt: string | null | undefined,
  nowMs: number,
  throttleMs: number = LAST_SEEN_BUMP_THROTTLE_MS,
): boolean {
  if (!lastSeenAt) return true;
  const seenMs = Date.parse(lastSeenAt);
  if (Number.isNaN(seenMs)) return true;
  return nowMs - seenMs > throttleMs;
}

/** Host auth on the game user, else the verified socket id. Null when anonymous. Never throws. */
export function classroomStarterAuthId(
  socket: Socket | null | undefined,
  game: Pick<GameState, 'users'> | null | undefined,
): string | null {
  try {
    const host = Object.values(game?.users ?? {}).find((u) => u?.isHost);
    if (host?.authUserId) return host.authUserId;
    const verified = (socket?.data as Record<string, unknown> | undefined)?.verifiedUserId;
    if (typeof verified === 'string' && verified) return verified;
    // getAuthUserId reads handshake.auth; a partial test socket (or a socket
    // that never completed the handshake) must not throw into game start.
    if (!socket?.handshake) return null;
    return getAuthUserId(socket) || null;
  } catch {
    return null;
  }
}

/**
 * Best-effort presence write. Returns without touching profiles when there is
 * no authenticated user id. Never throws — round start/record is the primary
 * operation.
 */
export async function bumpTeacherLastSeen(
  supabase: SupabaseClient | null,
  userId: string | null | undefined,
  now: Date = new Date(),
): Promise<void> {
  if (!userId || !supabase) return;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('last_seen_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      logger.warn('CLASSROOM_GAME', `last_seen read skipped for ${userId}: ${error.message}`);
      return;
    }
    const lastSeenAt = (data as { last_seen_at?: string | null } | null)?.last_seen_at ?? null;
    if (!shouldBumpLastSeen(lastSeenAt, now.getTime())) return;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_seen_at: now.toISOString() })
      .eq('id', userId);
    if (updateError) {
      logger.warn('CLASSROOM_GAME', `last_seen bump failed for ${userId}: ${updateError.message}`);
    }
  } catch (err) {
    logger.warn(
      'CLASSROOM_GAME',
      `last_seen bump threw for ${userId}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Start-path gate: only the authenticated teacher of this classroom is written.
 * An anonymous starter, or a starter who is not the teacher, performs no read
 * and no write.
 */
export async function bumpAuthedClassroomTeacher(
  supabase: SupabaseClient | null,
  authUserId: string | null | undefined,
  teacherId: string | null | undefined,
  now?: Date,
): Promise<void> {
  if (!authUserId || !teacherId || authUserId !== teacherId) return;
  await bumpTeacherLastSeen(supabase, authUserId, now);
}
