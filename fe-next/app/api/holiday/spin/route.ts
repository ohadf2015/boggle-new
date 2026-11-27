import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { isPlausibleLocalDate } from '@/lib/holidayEvent/progress.server';
import { pullHolidayCracker, spinHolidayDreidel } from '@/lib/holidays/dailyBonus.server';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  if (!checkApiRateLimit(request, 'holiday-spin', { maxRequests: 10, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { kind?: unknown; puzzleDate?: unknown } | null;
  const kind = body?.kind;
  const puzzleDate = body?.puzzleDate;
  if ((kind !== 'dreidel' && kind !== 'cracker') || typeof puzzleDate !== 'string' || !isPlausibleLocalDate(puzzleDate)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });

  try {
    const user = await getAuthedUser(request, { writes: true });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const result = kind === 'dreidel'
      ? await spinHolidayDreidel({ supabase, userId: user.id, puzzleDate })
      : await pullHolidayCracker({ supabase, userId: user.id, puzzleDate });
    return NextResponse.json(result);
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/holiday/spin', { method: 'POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
