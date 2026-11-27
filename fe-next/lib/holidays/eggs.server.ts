import type { SupabaseClient } from '@supabase/supabase-js';
import { fnv1a } from './hash';
import { momentsFor } from './moments';
import { grantHolidayReward } from './holidayGrant.server';
import type { HolidayInput } from './holidayRequest.server';

const TABLE = 'holiday_egg_finds';
export const ROSCON_SLICES = 8;
export const FIGURINE_COINS = 50;
export const SERVER_ONLY_EGGS = new Set(['roscon', 'haba', 'figurine']);

export async function readEggs(supabase: SupabaseClient, userId: string, i: HolidayInput): Promise<string[]> {
  const { data, error } = await supabase.from(TABLE).select('egg_id').eq('user_id', userId).eq('event_key', i.eventKey);
  if (error) throw new Error(`${TABLE} read: ${error.message}`);
  return (data ?? []).map((r: { egg_id: string }) => r.egg_id);
}

async function insertEgg(supabase: SupabaseClient, userId: string, i: HolidayInput, egg: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).insert({ user_id: userId, event_key: i.eventKey, egg_id: egg });
  if (error && error.code !== '23505') throw new Error(`${TABLE} insert: ${error.message}`);
  return !error;
}

export async function recordEgg(supabase: SupabaseClient, userId: string, i: HolidayInput, egg: string) {
  const fresh = await insertEgg(supabase, userId, i, egg);
  return { status: fresh ? ('found' as const) : ('already' as const), found: await readEggs(supabase, userId, i) };
}

export type RosconOutcome = 'haba' | 'figurine' | 'none';
export type RosconResult = { status: 'closed' } | { status: 'picked' | 'already'; outcome: RosconOutcome; coins: number };

function rosconLayout(userId: string, date: string) {
  const haba = fnv1a(`${userId}|${date}|haba`) % ROSCON_SLICES;
  const figurine = (haba + 1 + (fnv1a(`${userId}|${date}|fig`) % (ROSCON_SLICES - 1))) % ROSCON_SLICES;
  return { haba, figurine };
}

export async function pickRoscon(supabase: SupabaseClient, userId: string, i: HolidayInput, pick: number): Promise<RosconResult> {
  if (!momentsFor({ holiday: i.holiday, locale: i.locale, localDate: i.localDate, hour: 12 }).includes('roscon')) return { status: 'closed' };
  const { haba, figurine } = rosconLayout(userId, i.localDate);
  if (!(await insertEgg(supabase, userId, i, 'roscon'))) {
    const found = await readEggs(supabase, userId, i);
    const outcome: RosconOutcome = found.includes('haba') ? 'haba' : found.includes('figurine') ? 'figurine' : 'none';
    return { status: 'already', outcome, coins: 0 };
  }
  const outcome: RosconOutcome = pick === haba ? 'haba' : pick === figurine ? 'figurine' : 'none';
  if (outcome !== 'none') await insertEgg(supabase, userId, i, outcome);
  let coins = 0;
  if (outcome === 'figurine') {
    if (!(await grantHolidayReward(supabase, userId, i.eventKey, { coins: FIGURINE_COINS }, 'figurine'))) {
      await supabase.from(TABLE).delete().eq('user_id', userId).eq('event_key', i.eventKey).eq('egg_id', 'roscon');
      await supabase.from(TABLE).delete().eq('user_id', userId).eq('event_key', i.eventKey).eq('egg_id', 'figurine');
      throw new Error(`roscon figurine coins failed for ${userId}`);
    }
    coins = FIGURINE_COINS;
  }
  return { status: 'picked', outcome, coins };
}
