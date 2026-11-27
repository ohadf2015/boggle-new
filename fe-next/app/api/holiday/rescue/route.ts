import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { HOLIDAY_KEYS, type HolidayKey } from '@/lib/holidays/calendar';
import { readRescueState, rescueInviter } from '@/lib/holidays/dailyRescue.server';
import { holidayLocale } from '@/lib/holidays/holidayRequest.server';
import { isPlausibleLocalDate } from '@/lib/holidayEvent/progress.server';
import { captureApiError } from '@/utils/sentry';

const isHoliday = (v: unknown): v is HolidayKey => typeof v === 'string' && (HOLIDAY_KEYS as readonly string[]).includes(v);
const isDate = (v: unknown): v is string => typeof v === 'string' && isPlausibleLocalDate(v);

function failed(error: unknown, method: string) {
  captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/holiday/rescue', { method });
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  if (!checkApiRateLimit(request, 'holiday-rescue-read', { maxRequests: 30, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const holiday = searchParams.get('holiday');
  const localDate = searchParams.get('localDate');
  if (!isHoliday(holiday) || !isDate(localDate)) return NextResponse.json({ error: 'Invalid holiday or date' }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ rescue: await readRescueState({ supabase, userId: user.id, holiday, localDate, locale: holidayLocale(searchParams.get('locale')) }) });
  } catch (error) {
    return failed(error, 'GET');
  }
}

export async function POST(request: NextRequest) {
  if (!checkApiRateLimit(request, 'holiday-rescue', { maxRequests: 5, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { ref?: unknown; holiday?: unknown; localDate?: unknown; locale?: unknown } | null;
  const holiday = body?.holiday;
  const localDate = body?.localDate;
  if (!isHoliday(holiday) || !isDate(localDate)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  try {
    const user = await getAuthedUser(request, { writes: true });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await rescueInviter({ supabase, friendId: user.id, ref: body?.ref, holiday, localDate, locale: holidayLocale(body?.locale) }));
  } catch (error) {
    return failed(error, 'POST');
  }
}
