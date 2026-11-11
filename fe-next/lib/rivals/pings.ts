import type { SupabaseClient } from '@supabase/supabase-js';

export const RIVAL_PING_IDS = [
  'come_at_me',
  'beat_you',
  'rematch',
  'gg',
  'close_one',
  'your_turn',
  'nice_word',
  'see_you_tomorrow',
] as const;

export type RivalPingId = (typeof RIVAL_PING_IDS)[number];

export interface RivalPing {
  id: RivalPingId;
  emoji: string;
  textKey: `rivalPings.ping.${RivalPingId}`;
}

const EMOJI: Record<RivalPingId, string> = {
  come_at_me: '😤',
  beat_you: '🏆',
  rematch: '🔁',
  gg: '🤝',
  close_one: '😅',
  your_turn: '👉',
  nice_word: '🤯',
  see_you_tomorrow: '👋',
};

export const RIVAL_PINGS: Record<RivalPingId, RivalPing> = Object.fromEntries(
  RIVAL_PING_IDS.map((id) => [id, { id, emoji: EMOJI[id], textKey: `rivalPings.ping.${id}` }]),
) as Record<RivalPingId, RivalPing>;

export const RIVAL_PING_DAILY_LIMIT = 3;
export const RIVAL_PING_PER_TARGET_WINDOW_MS = 6 * 60 * 60 * 1000;
export const RIVAL_PING_NOTIFICATION_TYPE = 'rival_ping';

const ID_SET: ReadonlySet<string> = new Set(RIVAL_PING_IDS);

export function isRivalPingId(value: unknown): value is RivalPingId {
  return typeof value === 'string' && ID_SET.has(value);
}

export function getRivalPing(id: unknown): RivalPing | null {
  return isRivalPingId(id) ? RIVAL_PINGS[id] : null;
}

export const RIVAL_PING_ENTITY_PREFIX = 'rival_ping:';
export const RIVAL_PING_RECENT_WINDOW_MS = 48 * 60 * 60 * 1000;

export type RivalPingErrorCode =
  | 'sign_in_required'
  | 'invalid_request'
  | 'self'
  | 'not_found'
  | 'not_allowed'
  | 'blocked'
  | 'name_required'
  | 'daily_limit'
  | 'target_cooldown'
  | 'unavailable';

/** user_notifications has no metadata column; the ping id rides on related_entity_type. */
export function pingEntityType(id: RivalPingId): string {
  return `${RIVAL_PING_ENTITY_PREFIX}${id}`;
}

export function pingIdFromEntityType(value: string | null | undefined): RivalPingId | null {
  if (!value?.startsWith(RIVAL_PING_ENTITY_PREFIX)) return null;
  const id = value.slice(RIVAL_PING_ENTITY_PREFIX.length);
  return isRivalPingId(id) ? id : null;
}

type QueryDb = Pick<SupabaseClient, 'from'>;

/** ISO time of the newest ping `them` sent `me` in the window, read or not, or null. Never throws. */
export async function latestPingFrom(
  db: QueryDb,
  me: string,
  them: string,
  sinceMs = RIVAL_PING_RECENT_WINDOW_MS,
): Promise<string | null> {
  try {
    const { data, error } = await db
      .from('user_notifications')
      .select('created_at')
      .eq('user_id', me)
      .eq('sender_id', them)
      .like('related_entity_type', `${RIVAL_PING_ENTITY_PREFIX}%`)
      .gte('created_at', new Date(Date.now() - sinceMs).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return (data as { created_at: string }).created_at ?? null;
  } catch {
    return null;
  }
}
