import type { SupabaseClient } from '@supabase/supabase-js';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { grantPremiumPart } from '@/lib/avatar/grantChestPart.server';

export interface GrantableReward {
  coins?: number;
  partKey?: string;
}

const CLAIMS = 'holiday_event_claims';

export async function grantHolidayReward(
  supabase: SupabaseClient,
  userId: string,
  eventKey: string,
  reward: GrantableReward,
  kind: string,
): Promise<boolean> {
  if (reward.partKey && !(await grantPremiumPart(supabase, userId, reward.partKey))) return false;
  if (reward.coins) return (await awardCoinsServer(userId, reward.coins, 'holiday_event', { event: eventKey, kind })).success;
  return true;
}

export type ClaimResult<T> = { status: 'claimed' | 'already'; detail: T };

export async function readClaim<T>(supabase: SupabaseClient, userId: string, eventKey: string, kind: string): Promise<T | null> {
  const { data, error } = await supabase.from(CLAIMS).select('detail').eq('user_id', userId).eq('event_key', eventKey).eq('kind', kind).maybeSingle();
  if (error) throw new Error(`${CLAIMS} read: ${error.message}`);
  return (data?.detail as T | undefined) ?? null;
}

export async function claimOnce<T>(
  supabase: SupabaseClient,
  args: { userId: string; eventKey: string; kind: 'gift' | 'comeback' | 'seeker'; detail: T },
  grant: () => Promise<boolean>,
): Promise<ClaimResult<T>> {
  const { userId, eventKey, kind, detail } = args;
  const { error } = await supabase.from(CLAIMS).insert({ user_id: userId, event_key: eventKey, kind, detail });
  if (error) {
    if (error.code === '23505') return { status: 'already', detail: (await readClaim<T>(supabase, userId, eventKey, kind)) ?? detail };
    throw new Error(`${CLAIMS} insert: ${error.message}`);
  }
  if (!(await grant())) {
    await supabase.from(CLAIMS).delete().eq('user_id', userId).eq('event_key', eventKey).eq('kind', kind);
    throw new Error(`holiday ${kind} grant failed for ${userId} ${eventKey}`);
  }
  return { status: 'claimed', detail };
}

export async function litDays(supabase: SupabaseClient, userId: string, eventKey: string): Promise<Map<number, { title?: string }>> {
  const { data, error } = await supabase.from('holiday_event_progress').select('day_index, claimed_reward').eq('user_id', userId).eq('event_key', eventKey);
  if (error) throw new Error(`holiday_event_progress read: ${error.message}`);
  return new Map((data ?? []).map((r: { day_index: number; claimed_reward: { title?: string } | null }) => [r.day_index, r.claimed_reward ?? {}]));
}
