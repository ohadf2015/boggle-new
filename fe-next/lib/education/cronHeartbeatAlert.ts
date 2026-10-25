import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { escapeTelegramMarkdownV2, sendTelegramMessage } from '@/lib/telegram';
import { DIGEST_JOB, readHeartbeat } from './lifecycleLedger';

export const DIGEST_STALE_DAYS = 8;
const DAY_MS = 86_400_000;

/**
 * Run by a daily cron: the weekly digest is the job that stops silently (it once sat
 * unscheduled for a month), so a missing or week-old heartbeat pages the owner.
 */
export async function alertIfDigestStale(
  sb: Pick<SupabaseClient, 'from'>,
  nowMs: number,
): Promise<{ stale: boolean; lastRunAt: string | null }> {
  let lastRunAt: string | null = null;
  let problem: string | null = null;
  try {
    lastRunAt = await readHeartbeat(sb, DIGEST_JOB);
    if (!lastRunAt) problem = 'has never recorded a run';
    else if (nowMs - Date.parse(lastRunAt) > DIGEST_STALE_DAYS * DAY_MS) problem = `last ran ${lastRunAt}`;
  } catch (err) {
    problem = `heartbeat unreadable: ${err instanceof Error ? err.message : String(err)}`;
  }
  if (!problem) return { stale: false, lastRunAt };

  const text = `${DIGEST_JOB} ${problem} (alert after ${DIGEST_STALE_DAYS} days)`;
  logger.error(`[Cron Heartbeat] ${text}`);
  await sendTelegramMessage(escapeTelegramMarkdownV2(`LexiClash cron alert: ${text}`));
  return { stale: true, lastRunAt };
}
