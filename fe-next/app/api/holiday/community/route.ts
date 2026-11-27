import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { HOLIDAY_KEYS, type HolidayKey } from '@/lib/holidays/calendar';
import { communityCount } from '@/lib/holidays/dailyCommunity.server';
import { holidayLocale } from '@/lib/holidays/holidayRequest.server';
import { isPlausibleLocalDate } from '@/lib/holidayEvent/progress.server';

export async function GET(request: NextRequest) {
  if (!checkApiRateLimit(request, 'holiday-community', { maxRequests: 30, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const holiday = searchParams.get('holiday');
  const localDate = searchParams.get('localDate');
  if (!holiday || !(HOLIDAY_KEYS as readonly string[]).includes(holiday) || !localDate || !isPlausibleLocalDate(localDate)) {
    return NextResponse.json({ error: 'Invalid holiday or date' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const count = supabase ? await communityCount({ supabase, holiday: holiday as HolidayKey, localDate, locale: holidayLocale(searchParams.get('locale')) }).catch(() => null) : null;
  return NextResponse.json({ count }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } });
}
