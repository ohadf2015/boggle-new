import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, description, type, status, start_time, end_time, config, rewards')
      .in('status', ['active', 'upcoming'])
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[API /events] DB error:', error.message);
      return NextResponse.json({ active: [], upcoming: [], myEvents: [] });
    }

    const active = (events ?? []).filter((e) => e.status === 'active');
    const upcoming = (events ?? []).filter((e) => e.status === 'upcoming');

    // Fetch the user's joined events (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();
    let myEvents: typeof active = [];

    if (user) {
      const { data: participations } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id);

      if (participations?.length) {
        const joinedIds = new Set(participations.map((p) => p.event_id));
        myEvents = (events ?? []).filter((e) => joinedIds.has(e.id));
      }
    }

    return NextResponse.json({ active, upcoming, myEvents });
  } catch (err) {
    console.error('[API /events] Unexpected error:', err);
    return NextResponse.json({ active: [], upcoming: [], myEvents: [] });
  }
}
