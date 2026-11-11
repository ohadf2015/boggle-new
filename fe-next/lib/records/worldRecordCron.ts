// Server-only wiring for the hourly world-record refresh.
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyRecordBroken } from '@/backend/modules/pushNotificationTriggers';
import { grantAchievements } from '@/backend/modules/achievements/grantAchievements';
import { getPostHogServer } from '@/lib/posthog';
import { isPublicName } from '@/lib/names/publicName';
import logger from '@/utils/logger';
import type { RecordCandidate, RefreshDeps, StoredRecord } from './worldRecordRefresh';

export const WORLD_RECORD_ACHIEVEMENT = 'WORLD_RECORD';
const CANDIDATES_PER_KEY = 5;
const MAX_STORED = 100;

export function worldRecordDeps(db: SupabaseClient): RefreshDeps {
  return {
    async fetchCandidates() {
      const { data, error } = await db.rpc('game_record_candidates', { p_per_key: CANDIDATES_PER_KEY });
      if (error) throw new Error(`game_record_candidates failed: ${error.message}`);
      return (data ?? []) as RecordCandidate[];
    },
    async fetchStored() {
      const { data, error } = await db
        .from('game_records')
        .select('record_key, mode, holder_id, holder_name, score, set_at, previous_holder_id, previous_score')
        .limit(MAX_STORED);
      if (error) throw new Error(`game_records read failed: ${error.message}`);
      return ((data ?? []) as StoredRecord[]).map((r) => ({ ...r, score: Number(r.score) }));
    },
    async upsert(rows) {
      const refreshedAt = new Date().toISOString();
      const { error } = await db
        .from('game_records')
        .upsert(rows.map((r) => ({ ...r, refreshed_at: refreshedAt })), { onConflict: 'record_key' });
      if (error) throw new Error(`game_records upsert failed: ${error.message}`);
    },
    notifyBroken: (previousHolderId, newHolderName, recordKey, newHolderId) =>
      notifyRecordBroken(previousHolderId, newHolderName, recordKey, newHolderId),
    grant: (userId) =>
      grantAchievements(db, userId, [WORLD_RECORD_ACHIEVEMENT], (message) =>
        logger.error(`[world-records] achievement grant failed for ${userId}: ${message}`),
      ),
    capture(userId, event, properties) {
      getPostHogServer()?.capture({ distinctId: userId, event, properties });
    },
    isPublic: isPublicName,
  };
}
