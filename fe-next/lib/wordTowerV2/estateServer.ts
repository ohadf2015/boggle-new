/**
 * SERVER-ONLY helpers for the estate routes (app/api/word-tower/estate/**):
 * row <-> Estate mapping, load-or-create, and a compare-and-swap mutate so two
 * tabs banking runs at once can't double-spend. Raids are applied by the
 * `word_tower_apply_raid` RPC instead (two rows + a log row, one transaction).
 *
 * COINS are not stored here: `Estate.coins` is the player's app-wide wallet
 * (profiles.total_coins, estateWallet), read at load and moved by a signed
 * delta in mutateEstate. The row's `coins` column is legacy — anything found
 * in it (old balances, a raid gain credited by the RPC) is folded into the
 * wallet on the next load.
 */
import type { getSupabaseAdmin } from '@/lib/email';
import { type Estate, emptyEstate, sanitizeEstate } from './estate';
import { encodeTower } from './estateTower';
import { type Wallet, dbWallet } from './estateWallet';

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
    // Never a balance: the wallet owns coins (see header). Writing it here would
    // be folded back in on the next load and pay the player twice.
    coins: 0,
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

/**
 * Move coins left in the legacy column into the wallet. Zero FIRST (guarded on
 * the exact amount, so two loads can't both claim it), then credit; a failed
 * credit puts the coins back rather than losing them.
 */
async function foldLegacyCoins(db: Db, wallet: Wallet, playerId: string, coins: number): Promise<string | null> {
  const { data, error } = await db
    .from(ESTATES)
    .update({ coins: 0, updated_at: new Date().toISOString() })
    .eq('player_id', playerId)
    .eq('coins', coins)
    .select('updated_at');
  if (error) throw error;
  const won = Array.isArray(data) && data.length === 1 ? String((data[0] as Row).updated_at) : null;
  if (!won) return null;
  const credited = await wallet.apply(playerId, coins, 'word_tower_estate_merge');
  if (!credited.ok) {
    await db.from(ESTATES).update({ coins }).eq('player_id', playerId).eq('coins', 0);
    throw new Error(`estate coin merge failed: ${credited.reason}`);
  }
  return won;
}

export async function loadEstate(db: Db, playerId: string, wallet: Wallet = dbWallet(db)): Promise<Loaded | null> {
  const { data, error } = await db.from(ESTATES).select(ESTATE_COLS).eq('player_id', playerId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as Row;
  let updatedAt = String(r.updated_at);
  const legacy = Math.max(0, Math.floor(Number(r.coins) || 0));
  if (legacy > 0) updatedAt = (await foldLegacyCoins(db, wallet, playerId, legacy)) ?? updatedAt;
  return { estate: { ...rowToEstate(r), coins: await wallet.balance(playerId) }, updatedAt };
}

export async function loadOrCreateEstate(db: Db, playerId: string, wallet: Wallet = dbWallet(db)): Promise<Loaded> {
  const found = await loadEstate(db, playerId, wallet);
  if (found) return found;
  const { error } = await db
    .from(ESTATES)
    .upsert({ player_id: playerId, ...estateToRow(emptyEstate()) }, { onConflict: 'player_id', ignoreDuplicates: true });
  if (error) throw error;
  const created = await loadEstate(db, playerId, wallet);
  if (!created) throw new Error('estate row missing after create');
  return created;
}

export type MutateStep<X> = { ok: true; estate: Estate; extra: X } | { ok: false; reason: string };

/**
 * Read -> pure step -> write only if nobody wrote in between (updated_at CAS).
 * Retries on a lost race; a refused step (`ok: false`) writes nothing.
 *
 * The step's coin change is applied to the wallet BEFORE the CAS: a debit the
 * wallet refuses (spent elsewhere since the read) refuses the whole step, and
 * a lost CAS hands the delta back before retrying. A credit that fails throws —
 * callers queue and replay runs, so a failed payout is never silently dropped.
 */
export async function mutateEstate<X>(
  db: Db,
  playerId: string,
  step: (e: Estate) => MutateStep<X>,
  attempts = 3,
  wallet: Wallet = dbWallet(db),
): Promise<MutateStep<X> | { ok: false; reason: 'conflict' | 'coins' }> {
  for (let i = 0; i < attempts; i += 1) {
    const cur = await loadOrCreateEstate(db, playerId, wallet);
    const res = step(cur.estate);
    if (!res.ok) return res;
    const delta = res.estate.coins - cur.estate.coins;
    let balance = cur.estate.coins;
    if (delta !== 0) {
      const moved = await wallet.apply(playerId, delta, delta > 0 ? 'word_tower_earn' : 'word_tower_spend');
      if (!moved.ok) {
        if (delta < 0) return { ok: false, reason: 'coins' };
        throw new Error(`word tower payout failed: ${moved.reason}`);
      }
      balance = moved.balance;
    }
    const { data, error } = await db
      .from(ESTATES)
      .update({ ...estateToRow(res.estate), updated_at: new Date().toISOString() })
      .eq('player_id', playerId)
      .eq('updated_at', cur.updatedAt)
      .select('updated_at');
    if (error || !(Array.isArray(data) && data.length === 1)) {
      if (delta !== 0) {
        const back = await wallet.apply(playerId, -delta, 'word_tower_estate_revert');
        if (!back.ok) throw new Error(`word tower revert failed (delta ${delta}): ${back.reason}`);
      }
      if (error) throw error;
      continue;
    }
    return { ...res, estate: { ...res.estate, coins: balance } };
  }
  return { ok: false, reason: 'conflict' };
}

export interface PublicProfile {
  userId: string;
  displayName: string;
  avatar: { avatarConfig: unknown; avatarEmoji: string | null; avatarColor: string | null; avatarImage: string | null };
}

/**
 * The signup trigger names a profile `Player_<first 8 of the uuid>`, so that
 * username IS the id — 637 of 735 prod rows carry one. Falling back to it made
 * the empire and raid screens print an id where a name belongs.
 */
const AUTO_USERNAME = /^(?:player|user)[_-][0-9a-f]{6,}$/i;

function humanName(p: Row | undefined): string {
  const display = String(p?.display_name ?? '').trim();
  if (display) return display;
  const username = String(p?.username ?? '').trim();
  return username && !AUTO_USERNAME.test(username) ? username : '';
}

/**
 * `displayName` is '' when the player has no human-readable name. The client
 * fills that in with a translated stand-in (`rivalName`) — a server-side
 * English 'Rival' would have been untranslatable in all five other locales.
 */
export function profileView(id: string, p: Row | undefined): PublicProfile {
  return {
    userId: id,
    displayName: humanName(p),
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
