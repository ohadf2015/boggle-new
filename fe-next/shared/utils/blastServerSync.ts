/**
 * Live MP Blast: when may a server board snapshot replace the board the player
 * sees? The client pops tiles optimistically, so a snapshot is only safe once
 * no newer word of the player's is still waiting on the server.
 *
 * Each accepted word gets exactly one ack (clearedBy = the player); a rejected
 * word gets none, so it is cleared by a requested resync.
 */

export const BLAST_RESYNC_CLEARED_BY = '__server_resync__';
export const BLAST_RESYNC_REQUEST = 'blastRequestBoard';
/** GridPositionSchema's bound on submitWord.path cells. */
const SUBMIT_PATH_MAX_INDEX = 10;

export interface BlastSyncState {
  /** Words sent that the server has not acked. */
  pending: number;
  /** Words sent since the last resync request, or null when none is outstanding. */
  sentSinceResync: number | null;
}

export const INITIAL_BLAST_SYNC: BlastSyncState = { pending: 0, sentSinceResync: null };

export function noteBlastSubmit(s: BlastSyncState): BlastSyncState {
  return {
    pending: s.pending + 1,
    sentSinceResync: s.sentSinceResync === null ? null : s.sentSinceResync + 1,
  };
}

export function noteBlastResyncRequested(s: BlastSyncState): BlastSyncState {
  return { ...s, sentSinceResync: 0 };
}

export function receiveBlastBoard(
  s: BlastSyncState,
  clearedBy: string,
  username: string | undefined
): { apply: boolean; state: BlastSyncState } {
  if (clearedBy === '__server_reconnect__') return { apply: true, state: INITIAL_BLAST_SYNC };
  if (clearedBy === BLAST_RESYNC_CLEARED_BY) {
    const after = s.sentSinceResync ?? 0;
    return { apply: after === 0, state: { pending: after, sentSinceResync: null } };
  }
  if (clearedBy === username) {
    const pending = Math.max(0, s.pending - 1);
    return { apply: pending === 0, state: { ...s, pending } };
  }
  return { apply: s.pending === 0, state: s };
}

export function blastSubmitPayload(
  word: string,
  comboType: string | null,
  path?: ReadonlyArray<{ row: number; col: number }>
): { word: string; comboType: string | null; path?: Array<{ row: number; col: number }> } {
  const inRange = (n: number) => Number.isInteger(n) && n >= 0 && n <= SUBMIT_PATH_MAX_INDEX;
  if (!path || path.length === 0 || !path.every((c) => inRange(c.row) && inRange(c.col))) return { word, comboType };
  return { word, comboType, path: path.map(({ row, col }) => ({ row, col })) };
}
