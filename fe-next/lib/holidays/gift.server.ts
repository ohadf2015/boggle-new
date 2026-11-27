import type { SupabaseClient } from '@supabase/supabase-js';
import { trackIndex } from './calendar';
import { giftOpenable, giftReward, giftTier, GIFT_TRACK_LENGTH, type GiftReward } from './gift';
import { claimOnce, grantHolidayReward, litDays, readClaim } from './holidayGrant.server';
import type { HolidayInput } from './holidayRequest.server';

export interface GiftState {
  lit: number;
  total: number;
  tier: number;
  openable: boolean;
  finale: string;
  opened: GiftReward | null;
  gamesToday: number;
  comebackUsed: boolean;
}

export async function readGift(supabase: SupabaseClient, userId: string, i: HolidayInput): Promise<GiftState> {
  const [lit, opened, comeback, today] = await Promise.all([
    litDays(supabase, userId, i.eventKey),
    readClaim<GiftReward>(supabase, userId, i.eventKey, 'gift'),
    readClaim(supabase, userId, i.eventKey, 'comeback'),
    supabase.from('holiday_day_games').select('games').eq('user_id', userId).eq('event_key', i.eventKey).eq('played_on', i.localDate).maybeSingle(),
  ]);
  if (today.error) throw new Error(`holiday_day_games read: ${today.error.message}`);
  return {
    lit: lit.size,
    total: GIFT_TRACK_LENGTH[i.holiday],
    tier: giftTier(i.holiday, lit.size),
    openable: giftOpenable(i.win, i.localDate),
    finale: i.win.finale,
    opened,
    gamesToday: (today.data as { games?: number } | null)?.games ?? 0,
    comebackUsed: comeback !== null,
  };
}

export type OpenGiftResult = { status: 'locked' } | { status: 'opened' | 'already'; reward: GiftReward };

export async function openGift(supabase: SupabaseClient, userId: string, i: HolidayInput): Promise<OpenGiftResult> {
  if (!giftOpenable(i.win, i.localDate)) return { status: 'locked' };
  const lit = new Set((await litDays(supabase, userId, i.eventKey)).keys());
  const today = trackIndex(i.win, i.localDate);
  if (today !== null) lit.add(today);
  const reward = giftReward(i.holiday, lit.size);
  const res = await claimOnce(supabase, { userId, eventKey: i.eventKey, kind: 'gift', detail: reward }, () =>
    grantHolidayReward(supabase, userId, i.eventKey, reward, 'gift'),
  );
  return { status: res.status === 'claimed' ? 'opened' : 'already', reward: res.detail };
}
