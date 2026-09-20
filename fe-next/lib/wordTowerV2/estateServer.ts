/**
 * SERVER-ONLY helpers for the estate routes (app/api/word-tower/estate/**):
 * row <-> Estate mapping, load-or-create, and a compare-and-swap mutate so two
 * tabs banking runs at once can't double-spend. Raids are applied by the
 * `word_tower_apply_raid` RPC instead (two rows + a log row, one transaction).
 */
import type { getSupabaseAdmin } from '@/lib/email';
import { type Estate, emptyEstate, sanitizeEstate } from './estate';
import { encodeTower } from './estateTower';

export type Db = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export const ESTATES = 'word_tower_estates';
export const RAIDS = 'word_tower_raids';
export const ESTATE_COLS =
  'player_id, coins, district, plots, shields, bricks, blueprints, raid_charges, last_tower, best_m, runs, updated_at';
/** `avatar_config` is the profiles column (`custom_avatar` exists only on leaderboard views). */
export const PROFILE_COLS = 'id, username, display_name, avatar_image, avatar_config, avatar_emoji, avatar_color';

type Row = Record<string, unknown>;

export function rowToEstate(r: Row): Estate {
  return sanitizeEstate({
    coins: Number(r.coins),
    district: Number(r.district),
    plots: r.plots,
    shields: Number(r.shields),
    bricks: Number(r.bricks),
    blueprints: Number(r.blueprints),
    raidCharges: Number(r.raid_charges),
    bestM: Number(r.best_m),
    runs: Number(r.runs),
    lastTower: r.last_tower,
  });
}

export function estateToRow(e: Estate): Row {
  return {
    coins: e.coins,
    district: e.district,
    plots: e.plots,
    shields: e.shields,
    bricks: e.bricks,
    blueprints: e.blueprints,
    raid_charges: e.raidCharges,
    last_tower: encodeTower(e.lastTower),
    best_m: e.bestM,
    runs: e.runs,
  };
}

export interface Loaded {
  estate: Estate;
  updatedAt: string;
}

export async function loadEstate(db: Db, playerId: string): Promise<Loaded | null> {
  const { data, error } = await db.from(ESTATES).select(ESTATE_COLS).eq('player_id', playerId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as Row;
  return { estate: rowToEstate(r), updatedAt: String(r.updated_at) };
}

export async function loadOrCreateEstate(db: Db, playerId: string): Promise<Loaded> {
  const found = await loadEstate(db, playerId);
  if (found) return found;
  const { error } = await db
    .from(ESTATES)
    .upsert({ player_id: playerId, ...estateToRow(emptyEstate()) }, { onConflict: 'player_id', ignoreDuplicates: true });
  if (error) throw error;
  const created = await loadEstate(db, playerId);
  if (!created) throw new Error('estate row missing after create');
  return created;
}

export type MutateStep<X> = { ok: true; estate: Estate; extra: X } | { ok: false; reason: string };

/**
 * Read -> pure step -> write only if nobody wrote in between (updated_at CAS).
 * Retries on a lost race; a refused step (`ok: false`) writes nothing.
 */
export async function mutateEstate<X>(
  db: Db,
  playerId: string,
  step: (e: Estate) => MutateStep<X>,
  attempts = 3,
): Promise<MutateStep<X> | { ok: false; reason: 'conflict' }> {
  for (let i = 0; i < attempts; i += 1) {
    const cur = await loadOrCreateEstate(db, playerId);
    const res = step(cur.estate);
    if (!res.ok) return res;
    const { data, error } = await db
      .from(ESTATES)
      .update({ ...estateToRow(res.estate), updated_at: new Date().toISOString() })
      .eq('player_id', playerId)
      .eq('updated_at', cur.updatedAt)
      .select('updated_at');
    if (error) throw error;
    if (Array.isArray(data) && data.length === 1) return res;
  }
  return { ok: false, reason: 'conflict' };
}

export interface PublicProfile {
  userId: string;
  displayName: string;
  avatar: { avatarConfig: unknown; avatarEmoji: string | null; avatarColor: string | null; avatarImage: string | null };
}

export function profileView(id: string, p: Row | undefined): PublicProfile {
  return {
    userId: id,
    displayName: (p?.display_name as string) || (p?.username as string) || 'Rival',
    avatar: {
      avatarConfig: p?.avatar_config ?? null,
      avatarEmoji: (p?.avatar_emoji as string | null) ?? null,
      avatarColor: (p?.avatar_color as string | null) ?? null,
      avatarImage: (p?.avatar_image as string | null) ?? null,
    },
  };
}

/** Separate query on purpose: estates FK to auth.users, so a PostgREST `profiles(...)` embed can never resolve. */
export async function profilesByIds(db: Db, ids: string[]): Promise<Map<string, PublicProfile>> {
  const out = new Map<string, PublicProfile>();
  if (!ids.length) return out;
  const { data, error } = await db.from('profiles').select(PROFILE_COLS).in('id', ids);
  if (error) throw error;
  const byId = new Map(((data as Row[] | null) ?? []).map((p) => [String(p.id), p]));
  for (const id of ids) out.set(id, profileView(id, byId.get(id)));
  return out;
}
