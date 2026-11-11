// Server-only: publicName pulls in the profanity filter.
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicNameOrNull } from '@/lib/names/publicName';
import { grantCountLadder, type RpcClient } from '@/backend/modules/achievements/grantAchievements';
import { COUNT_LADDERS } from '@/backend/modules/achievements/progressionAchievements';
import type { IncomingPingView } from './pingClient';
import {
  RIVAL_PING_DAILY_LIMIT,
  RIVAL_PING_ENTITY_PREFIX,
  RIVAL_PING_PER_TARGET_WINDOW_MS,
  RIVAL_PING_RECENT_WINDOW_MS,
  pingIdFromEntityType,
  type RivalPingErrorCode,
  type RivalPingId,
} from './pings';

const DAY_MS = 24 * 60 * 60 * 1000;

export type PingCheck =
  | { ok: true; senderName: string }
  | { ok: false; code: RivalPingErrorCode; status: number };

type Db = Pick<SupabaseClient, 'from'>;

const fail = (code: RivalPingErrorCode, status: number): PingCheck => ({ ok: false, code, status });

interface ProfileRow {
  id: string;
  display_name: string | null;
  username: string | null;
}

export function publicNameOf(row: Pick<ProfileRow, 'display_name' | 'username'> | undefined): string | null {
  if (!row) return null;
  return publicNameOrNull(row.display_name) ?? publicNameOrNull(row.username);
}

/** Every gate a rival ping must pass. Any lookup error refuses the ping. */
export async function checkPingAllowed(db: Db, senderId: string, targetId: string, now = new Date()): Promise<PingCheck> {
  if (senderId === targetId) return fail('self', 400);

  const pair = [senderId, targetId];
  const [profiles, blocks, students, consents, sent] = await Promise.all([
    db.from('profiles').select('id, display_name, username').in('id', pair),
    db
      .from('friends')
      .select('user_id')
      .eq('status', 'blocked')
      .or(`and(user_id.eq.${senderId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${senderId})`)
      .limit(2),
    db.from('classroom_memberships').select('student_id').in('student_id', pair).limit(1),
    db.from('parental_consents').select('user_id').in('user_id', pair).limit(1),
    db
      .from('user_notifications')
      .select('user_id, created_at')
      .eq('sender_id', senderId)
      .like('related_entity_type', `${RIVAL_PING_ENTITY_PREFIX}%`)
      .gte('created_at', new Date(now.getTime() - DAY_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(RIVAL_PING_DAILY_LIMIT + 5),
  ]);
  if (profiles.error || blocks.error || students.error || consents.error || sent.error) return fail('unavailable', 503);

  const rows = (profiles.data ?? []) as ProfileRow[];
  const target = rows.find((r) => r.id === targetId);
  if (!target) return fail('not_found', 404);

  const blockRows = (blocks.data ?? []) as { user_id: string }[];
  if (blockRows.some((r) => r.user_id === senderId)) return fail('blocked', 403);
  // Whoever blocked the sender stays private: the sender sees a generic refusal.
  if (blockRows.length > 0) return fail('not_allowed', 403);

  if ((students.data ?? []).length > 0 || (consents.data ?? []).length > 0) return fail('not_allowed', 403);
  if (!publicNameOf(target)) return fail('not_allowed', 403);

  const senderName = publicNameOf(rows.find((r) => r.id === senderId));
  if (!senderName) return fail('name_required', 403);

  const recent = (sent.data ?? []) as { user_id: string; created_at: string }[];
  if (recent.length >= RIVAL_PING_DAILY_LIMIT) return fail('daily_limit', 429);
  const cooldownStart = now.getTime() - RIVAL_PING_PER_TARGET_WINDOW_MS;
  if (recent.some((r) => r.user_id === targetId && new Date(r.created_at).getTime() > cooldownStart)) {
    return fail('target_cooldown', 429);
  }

  return { ok: true, senderName };
}

export type IncomingPing = IncomingPingView;

interface SenderRow extends ProfileRow {
  avatar_emoji: string | null;
  avatar_color: string | null;
  avatar_image: string | null;
  avatar_config: unknown;
}

const INCOMING_LIMIT = 10;

/** Unread rival pings to `me`, newest first, minus blocked or unnamed senders. Throws on a lookup error. */
export async function loadIncomingPings(db: Db, me: string, now = new Date()): Promise<IncomingPing[]> {
  const rows = await db
    .from('user_notifications')
    .select('id, sender_id, related_entity_type, created_at')
    .eq('user_id', me)
    .eq('read', false)
    .like('related_entity_type', `${RIVAL_PING_ENTITY_PREFIX}%`)
    .gte('created_at', new Date(now.getTime() - RIVAL_PING_RECENT_WINDOW_MS).toISOString())
    .order('created_at', { ascending: false })
    .limit(INCOMING_LIMIT);
  if (rows.error) throw new Error(`rival pings lookup failed: ${rows.error.message}`);

  const pings = ((rows.data ?? []) as { id: string; sender_id: string | null; related_entity_type: string | null; created_at: string }[])
    .map((r) => ({ ...r, pingId: pingIdFromEntityType(r.related_entity_type) }))
    .filter((r): r is typeof r & { sender_id: string; pingId: RivalPingId } => !!r.sender_id && !!r.pingId);
  if (pings.length === 0) return [];

  const senderIds = Array.from(new Set(pings.map((p) => p.sender_id)));
  const list = senderIds.join(',');
  const [profiles, blocks] = await Promise.all([
    db
      .from('profiles')
      .select('id, display_name, username, avatar_emoji, avatar_color, avatar_image, avatar_config')
      .in('id', senderIds),
    db
      .from('friends')
      .select('user_id, friend_id')
      .eq('status', 'blocked')
      .or(`and(user_id.eq.${me},friend_id.in.(${list})),and(friend_id.eq.${me},user_id.in.(${list}))`),
  ]);
  if (profiles.error || blocks.error) throw new Error('rival ping senders lookup failed');

  const blocked = new Set(
    ((blocks.data ?? []) as { user_id: string; friend_id: string }[]).map((b) => (b.user_id === me ? b.friend_id : b.user_id)),
  );
  const byId = new Map(((profiles.data ?? []) as SenderRow[]).map((p) => [p.id, p]));

  return pings.flatMap((p) => {
    const sender = byId.get(p.sender_id);
    const name = publicNameOf(sender);
    if (!sender || !name || blocked.has(p.sender_id)) return [];
    return [{
      id: p.id,
      pingId: p.pingId,
      createdAt: p.created_at,
      sender: {
        id: sender.id,
        name,
        avatar: { emoji: sender.avatar_emoji, color: sender.avatar_color, image: sender.avatar_image, config: sender.avatar_config },
      },
    }];
  });
}

/** After a ping is sent: grant the ping-count achievements from the sender's stored rival pings. */
export async function grantPingAchievements(db: Db & RpcClient, senderId: string): Promise<string[]> {
  try {
    const { count, error } = await db
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', senderId)
      .like('related_entity_type', `${RIVAL_PING_ENTITY_PREFIX}%`);
    if (error || count === null) throw new Error(error?.message ?? 'no count');
    return await grantCountLadder(db, senderId, COUNT_LADDERS.pings, count);
  } catch (err) {
    console.error('[ACHIEVEMENT] ping achievements failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
