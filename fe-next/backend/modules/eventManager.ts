/**
 * Event Manager
 * Framework for seasonal/limited-time events: holiday themes, weekend tournaments, special boards.
 */

import { getSupabase } from './supabaseServer';

// ==========================================
// Types
// ==========================================

export type EventType = 'tournament' | 'holiday' | 'weekend' | 'special';
export type EventStatus = 'upcoming' | 'active' | 'ended';

export interface EventReward {
  position: number;
  coins: number;
  title?: string;
  badge?: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  type: EventType;
  status: EventStatus;
  start_time: string;
  end_time: string;
  config: Record<string, unknown>;
  rewards: EventReward[];
  created_at: string;
}

export interface EventParticipation {
  id: string;
  event_id: string;
  user_id: string;
  score: number;
  joined_at: string;
  rewards_claimed: boolean;
}

// ==========================================
// getActiveEvents
// ==========================================

export async function getActiveEvents(): Promise<GameEvent[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('end_time', { ascending: true });

  if (error) throw new Error(`Failed to fetch active events: ${error.message}`);
  return (data ?? []) as GameEvent[];
}

// ==========================================
// getUpcomingEvents
// ==========================================

export async function getUpcomingEvents(): Promise<GameEvent[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'upcoming')
    .lte('start_time', sevenDaysFromNow)
    .order('start_time', { ascending: true });

  if (error) throw new Error(`Failed to fetch upcoming events: ${error.message}`);
  return (data ?? []) as GameEvent[];
}

// ==========================================
// joinEvent
// ==========================================

export async function joinEvent(userId: string, eventId: string): Promise<EventParticipation> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Check event exists and is active
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError || !event) throw new Error('Event not found');
  if (event.status !== 'active') throw new Error('Event is not active');

  // Check for duplicate join
  const { data: existing } = await supabase
    .from('event_participation')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (existing) throw new Error('Already joined');

  // Insert participation
  const { data: participation, error: insertError } = await supabase
    .from('event_participation')
    .insert({
      event_id: eventId,
      user_id: userId,
      score: 0,
      rewards_claimed: false,
    })
    .select('*')
    .single();

  if (insertError) throw new Error(`Failed to join event: ${insertError.message}`);
  return participation as EventParticipation;
}

// ==========================================
// submitEventScore
// ==========================================

export async function submitEventScore(
  userId: string,
  eventId: string,
  scoreToAdd: number
): Promise<EventParticipation> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Check participation exists
  const { data: participation, error: partError } = await supabase
    .from('event_participation')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (partError || !participation) throw new Error('Not a participant');

  // Check event is still active
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (!event || event.status !== 'active') throw new Error('Event is not active');

  // Update score (additive)
  const newScore = (participation.score || 0) + scoreToAdd;
  const { data: updated, error: updateError } = await supabase
    .from('event_participation')
    .update({ score: newScore })
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (updateError) throw new Error(`Failed to submit score: ${updateError.message}`);
  return updated as EventParticipation;
}

// ==========================================
// getEventLeaderboard
// ==========================================

export async function getEventLeaderboard(
  eventId: string,
  limit = 50
): Promise<EventParticipation[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from('event_participation')
    .select('*')
    .eq('event_id', eventId)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  return (data ?? []) as EventParticipation[];
}

// ==========================================
// getEventRewards
// ==========================================

export function getEventRewards(rewards: EventReward[], position: number): EventReward | null {
  if (!rewards || rewards.length === 0) return null;
  return rewards.find((r) => r.position === position) ?? null;
}

// ==========================================
// checkEventExpiry
// ==========================================

export async function checkEventExpiry(): Promise<{
  activated: number;
  ended: number;
}> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");
  const now = new Date().toISOString();

  // Activate upcoming events whose start_time has passed
  const { data: toActivate } = await supabase
    .from('events')
    .select('id')
    .eq('status', 'upcoming')
    .lte('start_time', now);

  let activated = 0;
  if (toActivate?.length) {
    for (const event of toActivate) {
      await supabase.from('events').update({ status: 'active' }).eq('id', event.id);
      activated++;
    }
  }

  // End active events whose end_time has passed
  const { data: toEnd } = await supabase
    .from('events')
    .select('id')
    .eq('status', 'active')
    .lt('end_time', now);

  let ended = 0;
  if (toEnd?.length) {
    for (const event of toEnd) {
      await supabase.from('events').update({ status: 'ended' }).eq('id', event.id);
      ended++;
    }
  }

  return { activated, ended };
}
