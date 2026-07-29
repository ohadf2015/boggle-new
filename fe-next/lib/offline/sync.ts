import type { OfflineStore } from './storage';
import { peekQueue, type QueueRow } from './scoreQueue';

export interface SyncSummary {
  accepted: number;
  rejected: number;
  rejectedWordCount: number;
  skipped: number;
}

interface ApiResult {
  id: string;
  accepted: boolean;
  finalScore: number;
  rejectedWords: string[];
  reason?: string;
}

interface ApiResponse {
  results: ApiResult[];
}

const SYNC_ENDPOINT = '/api/scores/sync';

function buildBatch(rows: QueueRow[]) {
  return rows.map((row) => ({
    id: row.id,
    mode: row.mode,
    payload: row.payload,
    clientCompletedAt: row.created_at,
  }));
}

export async function syncQueueViaApi(store: OfflineStore): Promise<SyncSummary> {
  const summary: SyncSummary = { accepted: 0, rejected: 0, rejectedWordCount: 0, skipped: 0 };
  const rows = await peekQueue(store);
  if (rows.length === 0) return summary;

  let response: Response;
  try {
    response = await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions: buildBatch(rows) }),
    });
  } catch {
    return summary;
  }

  if (!response.ok) return summary;

  let data: ApiResponse;
  try {
    data = (await response.json()) as ApiResponse;
  } catch {
    return summary;
  }

  const resultsById = new Map<string, ApiResult>();
  for (const r of data.results ?? []) resultsById.set(r.id, r);

  for (const row of rows) {
    const result = resultsById.get(row.id);
    if (!result) {
      summary.skipped++;
      continue;
    }
    summary.rejectedWordCount += result.rejectedWords?.length ?? 0;
    if (result.accepted) {
      await store.sql.run('DELETE FROM score_queue WHERE id = ?', [row.id]);
      summary.accepted++;
    } else {
      await store.sql.run(
        'UPDATE score_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?',
        [result.reason ?? 'rejected', row.id],
      );
      summary.rejected++;
    }
  }

  return summary;
}
