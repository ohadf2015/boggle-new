import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

const CAP = 5;

export async function GET(request: Request) {
  // Local JWT verify (sub-ms) when the caller sends a Bearer token via
  // fetchWithAuth; falls back to the cookie round-trip otherwise. Read-only.
  // The data query keeps the cookie client so RLS still applies (defense in
  // depth) — fetchWithAuth sends cookies alongside the Bearer, so the session
  // is present and PostgREST validates the JWT inline (no Auth round-trip).
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('daily_boost_count, last_boost_reset_date')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const stale = data.last_boost_reset_date < today;
  const used = stale ? 0 : (data.daily_boost_count ?? 0);
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return NextResponse.json({
    remaining: Math.max(0, CAP - used),
    capPerDay: CAP,
    resetAt: tomorrow.toISOString(),
  });
}
