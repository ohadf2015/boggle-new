/** A row from game_record_candidates(): top players per record, before the app-side name check. */
export interface RecordCandidate {
  record_key: string;
  mode: string;
  holder_id: string;
  display_name: string | null;
  username: string | null;
  score: number | string;
  set_at: string;
  rank: number;
}

export interface StoredRecord {
  record_key: string;
  mode: string;
  holder_id: string;
  holder_name: string;
  score: number;
  set_at: string;
  previous_holder_id: string | null;
  previous_score: number | null;
}

export interface BrokenRecord {
  recordKey: string;
  mode: string;
  previousHolderId: string;
  newHolderId: string;
  newHolderName: string;
  score: number;
  previousScore: number;
}

export interface RecordPlan {
  upserts: StoredRecord[];
  broken: BrokenRecord[];
}

type IsPublic = (name: string | null | undefined) => boolean;

/** First candidate per record whose display name, or else username, may be shown publicly. */
export function pickHolders(candidates: readonly RecordCandidate[], isPublic: IsPublic): Map<string, StoredRecord> {
  const sorted = [...candidates].sort((a, b) => a.rank - b.rank);
  const out = new Map<string, StoredRecord>();
  for (const c of sorted) {
    if (out.has(c.record_key)) continue;
    const name = isPublic(c.display_name) ? c.display_name : isPublic(c.username) ? c.username : null;
    if (!name) continue;
    out.set(c.record_key, {
      record_key: c.record_key,
      mode: c.mode,
      holder_id: c.holder_id,
      holder_name: name.trim(),
      score: Number(c.score),
      set_at: c.set_at,
      previous_holder_id: null,
      previous_score: null,
    });
  }
  return out;
}

function unchanged(a: StoredRecord, b: StoredRecord): boolean {
  return a.holder_id === b.holder_id && a.holder_name === b.holder_name && Number(a.score) === b.score && a.set_at === b.set_at;
}

/**
 * A record counts as broken only when a different player beats the stored score.
 * A holder dropping out (test account, renamed to a default) hands it on silently.
 */
export function planRecordChanges(stored: Map<string, StoredRecord>, picked: Map<string, StoredRecord>): RecordPlan {
  const upserts: StoredRecord[] = [];
  const broken: BrokenRecord[] = [];
  for (const [key, next] of picked) {
    const prev = stored.get(key);
    if (prev && unchanged(prev, next)) continue;
    if (!prev) {
      upserts.push(next);
      continue;
    }
    if (prev.holder_id === next.holder_id) {
      upserts.push({ ...next, previous_holder_id: prev.previous_holder_id, previous_score: prev.previous_score });
      continue;
    }
    const prevScore = Number(prev.score);
    if (next.score > prevScore) {
      upserts.push({ ...next, previous_holder_id: prev.holder_id, previous_score: prevScore });
      broken.push({
        recordKey: key,
        mode: next.mode,
        previousHolderId: prev.holder_id,
        newHolderId: next.holder_id,
        newHolderName: next.holder_name,
        score: next.score,
        previousScore: prevScore,
      });
    } else {
      upserts.push(next);
    }
  }
  return { upserts, broken };
}

export interface RefreshDeps {
  fetchCandidates: () => Promise<RecordCandidate[]>;
  fetchStored: () => Promise<StoredRecord[]>;
  upsert: (rows: StoredRecord[]) => Promise<void>;
  notifyBroken: (previousHolderId: string, newHolderName: string, recordKey: string, newHolderId: string) => Promise<void>;
  grant: (userId: string) => Promise<string[]>;
  capture: (userId: string, event: string, props: Record<string, unknown>) => void;
  isPublic: IsPublic;
}

export async function refreshWorldRecords(deps: RefreshDeps): Promise<{ records: number; written: number; broken: number }> {
  const candidates = await deps.fetchCandidates();
  if (candidates.length === 0) throw new Error('no record candidates: every source query came back empty');
  const stored = new Map((await deps.fetchStored()).map((r) => [r.record_key, r]));
  const picked = pickHolders(candidates, deps.isPublic);
  const plan = planRecordChanges(stored, picked);
  if (plan.upserts.length > 0) await deps.upsert(plan.upserts);

  const holders = new Set(plan.upserts.map((r) => r.holder_id));
  await Promise.allSettled([...holders].map((id) => deps.grant(id)));
  await Promise.allSettled(plan.broken.map((b) => {
    deps.capture(b.newHolderId, 'world_record_broken', {
      mode: b.mode,
      record_key: b.recordKey,
      score: b.score,
      previous_score: b.previousScore,
    });
    return deps.notifyBroken(b.previousHolderId, b.newHolderName, b.recordKey, b.newHolderId);
  }));
  return { records: picked.size, written: plan.upserts.length, broken: plan.broken.length };
}
