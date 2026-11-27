import type { SupabaseClient } from '@supabase/supabase-js';
import { HUNT_GOAL, SEEKER_PART, huntItemFor, huntSlotFor, type HuntSlot } from './hunt';
import { claimOnce, grantHolidayReward, readClaim } from './holidayGrant.server';
import type { HolidayInput } from './holidayRequest.server';

const TABLE = 'holiday_hunt_finds';

export interface HuntState {
  slot: HuntSlot;
  item: string;
  foundToday: boolean;
  count: number;
  goal: number;
  seeker: boolean;
}

async function finds(supabase: SupabaseClient, userId: string, eventKey: string): Promise<string[]> {
  const { data, error } = await supabase.from(TABLE).select('find_date').eq('user_id', userId).eq('event_key', eventKey);
  if (error) throw new Error(`${TABLE} read: ${error.message}`);
  return (data ?? []).map((r: { find_date: string }) => r.find_date);
}

export async function readHunt(supabase: SupabaseClient, userId: string, i: HolidayInput): Promise<HuntState> {
  const [dates, seeker] = await Promise.all([finds(supabase, userId, i.eventKey), readClaim(supabase, userId, i.eventKey, 'seeker')]);
  return {
    slot: huntSlotFor(userId, i.localDate),
    item: huntItemFor(i.holiday, i.localDate),
    foundToday: dates.includes(i.localDate),
    count: dates.length,
    goal: HUNT_GOAL[i.holiday],
    seeker: seeker !== null,
  };
}

export type HuntFindResult = { status: 'wrong_slot' } | ({ status: 'found' | 'already'; seekerJustEarned: boolean } & HuntState);

export async function recordHuntFind(supabase: SupabaseClient, userId: string, i: HolidayInput, slot: string): Promise<HuntFindResult> {
  if (slot !== huntSlotFor(userId, i.localDate)) return { status: 'wrong_slot' };
  const { error } = await supabase.from(TABLE).insert({ user_id: userId, event_key: i.eventKey, find_date: i.localDate, slot });
  if (error && error.code !== '23505') throw new Error(`${TABLE} insert: ${error.message}`);
  const status = error ? 'already' : 'found';
  const state = await readHunt(supabase, userId, i);
  let seekerJustEarned = false;
  if (!state.seeker && state.count >= state.goal) {
    const partKey = SEEKER_PART[i.holiday];
    const res = await claimOnce(supabase, { userId, eventKey: i.eventKey, kind: 'seeker', detail: { title: 'seeker', partKey } }, () =>
      grantHolidayReward(supabase, userId, i.eventKey, { partKey }, 'seeker'),
    );
    seekerJustEarned = res.status === 'claimed';
    state.seeker = true;
  }
  return { status, seekerJustEarned, ...state };
}
