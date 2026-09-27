/**
 * Report Manager Module
 * Persists user/message reports for moderation review (Google Play
 * "Social Apps & Features" policy: users must be able to report content/users).
 *
 * Writes to public.user_reports via the service-role client (RLS bypassed);
 * the calling socket handler is responsible for authenticating the reporter.
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';

export const REPORT_REASONS = ['harassment', 'spam', 'inappropriate', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

type ReportResult = { success: boolean; errorCode?: string };

function isValidReason(reason: string): reason is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(reason);
}

async function insertReport(row: Record<string, unknown>): Promise<ReportResult> {
  const supabase = getSupabase();
  if (!supabase) {
    logger.error('REPORT_MANAGER', 'Supabase client not available');
    return { success: false, errorCode: 'SERVER_ERROR' };
  }

  const { error } = await supabase.from('user_reports').insert(row);
  if (error) {
    logger.error('REPORT_MANAGER', `Error inserting report: ${error.message}`);
    return { success: false, errorCode: 'SERVER_ERROR' };
  }
  return { success: true };
}

/** Report an abusive user (ongoing harassment, not a single message). */
export async function reportUser(
  reporterId: string,
  targetUserId: string,
  reason: string,
  context?: string
): Promise<ReportResult> {
  if (!isValidReason(reason)) {
    return { success: false, errorCode: 'INVALID_REASON' };
  }
  if (reporterId === targetUserId) {
    return { success: false, errorCode: 'CANNOT_REPORT_SELF' };
  }
  return insertReport({
    reporter_id: reporterId,
    target_user_id: targetUserId,
    target_type: 'user',
    reason,
    context: context ?? null,
  });
}

export interface ReportMessageOptions {
  surface: 'direct_message' | 'room_chat';
  reason: ReportReason;
  context?: string;
  /** DM: the friend_messages row id. */
  messageId?: string;
  /** DM: the message author (so moderators can index by offender). */
  targetUserId?: string;
  /** Room chat: the game/room code (room messages are ephemeral, no FK). */
  gameCode?: string;
  /** Room chat: a denormalised snapshot of the offending message. */
  messageSnapshot?: { senderId?: string; senderName: string; message: string; timestamp: number };
}

/** Report a single chat message (DM or room chat). */
export async function reportMessage(reporterId: string, opts: ReportMessageOptions): Promise<ReportResult> {
  if (!isValidReason(opts.reason)) {
    return { success: false, errorCode: 'INVALID_REASON' };
  }
  return insertReport({
    reporter_id: reporterId,
    target_user_id: opts.targetUserId ?? null,
    target_type: opts.surface,
    target_ref: opts.messageId ?? null,
    game_code: opts.gameCode ?? null,
    message_snapshot: opts.messageSnapshot ?? null,
    reason: opts.reason,
    context: opts.context ?? null,
  });
}
