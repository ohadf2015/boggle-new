// Server-only: isPublicName pulls in the profanity filter.
import type { SupabaseClient } from '@supabase/supabase-js';
import { isPublicName } from '@/lib/names/publicName';
import { resolveDisplayTitle } from '@/lib/titles/playerTitles';
import { RECORD_KEYS, getRecordDef } from './recordKeys';
import type { WorldRecord } from './worldRecordTypes';

const MAX_RECORDS = RECORD_KEYS.length + 10;
const ORDER = new Map(RECORD_KEYS.map((d, i) => [d.key, i]));

interface RecordRow {
  record_key: string;
  holder_id: string;
  holder_name: string;
  score: number | string;
  set_at: string;
}

interface HolderRow {
  id: string;
  avatar_config: unknown;
  chosen_title: string | null;
  current_level: number | null;
}

/** Every known world record (or one, by key), with the holder's avatar and title. Throws on a failed read. */
export async function getWorldRecords(db: SupabaseClient, recordKey?: string): Promise<WorldRecord[]> {
  let query = db.from('game_records').select('record_key, holder_id, holder_name, score, set_at');
  if (recordKey) query = query.eq('record_key', recordKey);
  const { data, error } = await query.order('record_key').limit(recordKey ? 1 : MAX_RECORDS);
  if (error) throw new Error(`game_records read failed: ${error.message}`);

  const rows = ((data ?? []) as RecordRow[]).filter((r) => getRecordDef(r.record_key) && isPublicName(r.holder_name));
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.holder_id))];
  const { data: holders } = await db
    .from('profiles')
    .select('id, avatar_config, chosen_title, current_level')
    .in('id', ids)
    .limit(ids.length);
  const byId = new Map(((holders ?? []) as HolderRow[]).map((h) => [h.id, h]));

  return rows
    .sort((a, b) => (ORDER.get(a.record_key) ?? 0) - (ORDER.get(b.record_key) ?? 0))
    .map((r) => {
      const def = getRecordDef(r.record_key)!;
      const holder = byId.get(r.holder_id);
      return {
        recordKey: r.record_key,
        mode: def.mode,
        labelKey: def.labelKey,
        unit: def.unit,
        holderId: r.holder_id,
        holderName: r.holder_name.trim(),
        score: Number(r.score),
        setAt: r.set_at,
        avatarConfig: (holder?.avatar_config ?? null) as WorldRecord['avatarConfig'],
        title: holder ? resolveDisplayTitle({ chosenTitle: holder.chosen_title, level: holder.current_level }) : null,
      };
    });
}
