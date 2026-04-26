import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const CAP = 5;

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
