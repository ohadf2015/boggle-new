// Claimed before the email goes out so overlapping runs cannot both send; a failed send releases it.
import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { fetchInChunks } from './pro/fetchAll';

type Db = Pick<SupabaseClient, 'from'>;

export const LEDGER_TABLE = 'teacher_lifecycle_sends';
export const DIGEST_JOB = 'teacher-weekly-digest';
const HEARTBEAT_TABLE = 'cron_heartbeats';

export interface LedgerKey {
  userId: string;
  kind: string;
  periodKey: string;
}

export interface LedgerRow {
  user_id: string;
  kind: string;
  period_key: string;
  sent_at: string;
}

export async function loadLedger(sb: Db, userIds: string[]): Promise<LedgerRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await fetchInChunks<LedgerRow>(
    sb, LEDGER_TABLE, 'user_id, kind, period_key, sent_at', 'user_id', userIds, [], ['user_id', 'kind', 'period_key'],
  );
  if (error) throw new Error(`${LEDGER_TABLE} read failed: ${error.message}`);
  return data;
}

export function lastSendAt(rows: readonly LedgerRow[], userId: string, kind: (k: string) => boolean): string | null {
  let latest: string | null = null;
  for (const r of rows) {
    if (r.user_id === userId && kind(r.kind) && (!latest || r.sent_at > latest)) latest = r.sent_at;
  }
  return latest;
}

/** True when this run now owns the send; false when another run already holds it. Throws on a write error. */
export async function claimSend(sb: Db, key: LedgerKey): Promise<boolean> {
  const { data, error } = await sb
    .from(LEDGER_TABLE)
    .upsert(
      { user_id: key.userId, kind: key.kind, period_key: key.periodKey },
      { onConflict: 'user_id,kind,period_key', ignoreDuplicates: true },
    )
    .select('user_id');
  if (error) throw new Error(`${LEDGER_TABLE} claim failed for ${key.kind}: ${error.message}`);
  return (data ?? []).length > 0;
}

export async function releaseSend(sb: Db, key: LedgerKey): Promise<void> {
  const { error } = await sb
    .from(LEDGER_TABLE)
    .delete()
    .eq('user_id', key.userId)
    .eq('kind', key.kind)
    .eq('period_key', key.periodKey);
  if (error) logger.error(`[lifecycle-ledger] could not release ${key.kind} for ${key.userId}: ${error.message}`);
}

export async function writeHeartbeat(sb: Db, job: string, result: Record<string, unknown>, now = new Date()): Promise<void> {
  const { error } = await sb
    .from(HEARTBEAT_TABLE)
    .upsert({ job, last_run_at: now.toISOString(), last_result: result }, { onConflict: 'job' });
  if (error) throw new Error(`${HEARTBEAT_TABLE} write failed for ${job}: ${error.message}`);
}

export async function readHeartbeat(sb: Db, job: string): Promise<string | null> {
  const { data, error } = await sb.from(HEARTBEAT_TABLE).select('last_run_at').eq('job', job).maybeSingle();
  if (error) throw new Error(`${HEARTBEAT_TABLE} read failed for ${job}: ${error.message}`);
  return (data as { last_run_at?: string } | null)?.last_run_at ?? null;
}
