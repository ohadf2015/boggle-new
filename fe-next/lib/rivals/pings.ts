import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResultsMode } from './types';

export const RIVAL_PING_IDS = [
  'come_at_me',
  'beat_you',
  'rematch',
  'gg',
  'close_one',
  'your_turn',
  'nice_word',
  'see_you_tomorrow',
  'play_now',
  'good_luck',
  'after_this',
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
  play_now: '🎮',
  good_luck: '🍀',
  after_this: '🎯',
};

export const RIVAL_PINGS: Record<RivalPingId, RivalPing> = Object.fromEntries(
  RIVAL_PING_IDS.map((id) => [id, { id, emoji: EMOJI[id], textKey: `rivalPings.ping.${id}` }]),
) as Record<RivalPingId, RivalPing>;

/** Where the ping is sent from: a results screen, a reply, or a friend row that knows if they are mid-game. */
export type PingSituation = ResultsMode | 'reply' | 'friendFree' | 'friendPlaying';

const SCORE_CHASE: readonly RivalPingId[] = ['beat_you', 'your_turn', 'come_at_me', 'close_one', 'gg', 'see_you_tomorrow'];

const BY_SITUATION: Partial<Record<PingSituation, readonly RivalPingId[]>> = {
  friendPlaying: ['good_luck', 'after_this', 'come_at_me', 'see_you_tomorrow'],
  friendFree: ['play_now', 'come_at_me', 'your_turn', 'see_you_tomorrow'],
  reply: ['gg', 'rematch', 'play_now', 'come_at_me', 'your_turn', 'see_you_tomorrow'],
  multiplayer: ['gg', 'rematch', 'close_one', 'nice_word', 'beat_you', 'see_you_tomorrow'],
};

export function pingsFor(situation: PingSituation): readonly RivalPingId[] {
  return BY_SITUATION[situation] ?? SCORE_CHASE;
}

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
