import type { OfflineStore } from './storage';
import { safeRandomUUID } from '@/lib/safeRandomUUID';

export type ScoreMode =
  | 'sp'
  | 'wotd'
  | 'daily-survival'
  | 'daily-wordhunt'
  | 'brain'
  | 'adventure'
  | 'blast';

export interface QueueRow {
  id: string;
  mode: ScoreMode;
  payload: unknown;
  created_at: number;
  attempts: number;
  last_error: string | null;
}

export interface SubmitResult {
  accepted: boolean;
  error?: string;
}

export type SubmitFn = (row: QueueRow) => Promise<SubmitResult>;

interface FlushOptions {
  stopAtError?: boolean;
}

export async function enqueueScore(
  store: OfflineStore,
  mode: ScoreMode,
  payload: unknown,
): Promise<string> {
  const id = safeRandomUUID();
  const createdAt = Date.now();
  await store.sql.run(
    'INSERT INTO score_queue(id, mode, payload, created_at, attempts) VALUES (?, ?, ?, ?, 0)',
    [id, mode, JSON.stringify(payload), createdAt],
  );
  return id;
}

export async function queueDepth(store: OfflineStore): Promise<number> {
  const { rows } = await store.sql.run('SELECT COUNT(*) AS c FROM score_queue');
  return (rows[0] as { c: number } | undefined)?.c ?? 0;
}

export async function peekQueue(store: OfflineStore, limit = 100): Promise<QueueRow[]> {
  const { rows } = await store.sql.run(
    'SELECT id, mode, payload, created_at, attempts, last_error FROM score_queue ORDER BY created_at ASC LIMIT ?',
    [limit],
  );
  return rows.map((r) => {
    const raw = r as {
      id: string;
      mode: ScoreMode;
      payload: string;
      created_at: number;
      attempts: number;
      last_error: string | null;
    };
    return {
      id: raw.id,
      mode: raw.mode,
      payload: JSON.parse(raw.payload),
      created_at: raw.created_at,
      attempts: raw.attempts,
      last_error: raw.last_error,
    };
  });
}

export async function flushQueue(
  store: OfflineStore,
  submit: SubmitFn,
  options: FlushOptions = {},
): Promise<{ accepted: number; rejected: number }> {
  let accepted = 0;
  let rejected = 0;
  const rows = await peekQueue(store);
  for (const row of rows) {
    const result = await submit(row);
    if (result.accepted) {
      await store.sql.run('DELETE FROM score_queue WHERE id = ?', [row.id]);
      accepted++;
    } else {
      await store.sql.run(
        'UPDATE score_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?',
        [result.error ?? null, row.id],
      );
      rejected++;
      if (options.stopAtError) return { accepted, rejected };
    }
  }
  return { accepted, rejected };
}
