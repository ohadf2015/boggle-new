import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { HOLIDAY_KEYS, type HolidayKey } from '@/lib/holidays/calendar';
import { createHolidayTable, joinHolidayTable, leaveHolidayTable, readHolidayTable } from '@/lib/holidays/dailyTable.server';
import { holidayLocale } from '@/lib/holidays/holidayRequest.server';
import { isPlausibleLocalDate } from '@/lib/holidayEvent/progress.server';
import { captureApiError } from '@/utils/sentry';

const isHoliday = (v: unknown): v is HolidayKey => typeof v === 'string' && (HOLIDAY_KEYS as readonly string[]).includes(v);
const isDate = (v: unknown): v is string => typeof v === 'string' && isPlausibleLocalDate(v);

function failed(error: unknown, method: string) {
  captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/holiday/table', { method });
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  if (!checkApiRateLimit(request, 'holiday-table-read', { maxRequests: 30, windowMs: 60_000 }).success) {
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
    const locale = holidayLocale(searchParams.get('locale'));
    return NextResponse.json({ table: await readHolidayTable({ supabase, userId: user.id, holiday, localDate, locale }) });
  } catch (error) {
    return failed(error, 'GET');
  }
}

export async function POST(request: NextRequest) {
  if (!checkApiRateLimit(request, 'holiday-table-write', { maxRequests: 10, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { action?: unknown; holiday?: unknown; localDate?: unknown; locale?: unknown; code?: unknown } | null;
  const action = body?.action;
  const localDate = body?.localDate;
  if (!isDate(localDate) || !['create', 'join', 'leave'].includes(action as string)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (action !== 'join' && !isHoliday(body?.holiday)) return NextResponse.json({ error: 'Invalid holiday' }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  try {
    const user = await getAuthedUser(request, { writes: true });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const holiday = body?.holiday as HolidayKey;
    const locale = holidayLocale(body?.locale);
    if (action === 'join') return NextResponse.json(await joinHolidayTable({ supabase, userId: user.id, code: body?.code, localDate, locale }));
    if (action === 'create') return NextResponse.json(await createHolidayTable({ supabase, userId: user.id, holiday, localDate, locale }));
    await leaveHolidayTable({ supabase, userId: user.id, holiday, localDate, locale });
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return failed(error, 'POST');
  }
}
