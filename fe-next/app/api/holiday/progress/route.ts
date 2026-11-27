import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { HOLIDAY_KEYS, windowFor, type HolidayKey } from '@/lib/holidays/calendar';
import { isPlausibleLocalDate, markHolidayDayPlayed, readHolidayProgress } from '@/lib/holidayEvent/progress.server';
import { captureApiError } from '@/utils/sentry';

const LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'];

function parse(holiday: unknown, localDate: unknown, locale?: unknown): { holiday: HolidayKey; localDate: string; locale: string } | null {
  if (typeof holiday !== 'string' || !(HOLIDAY_KEYS as readonly string[]).includes(holiday)) return null;
  if (typeof localDate !== 'string' || !isPlausibleLocalDate(localDate)) return null;
  const l = typeof locale === 'string' && LOCALES.includes(locale.slice(0, 2)) ? locale.slice(0, 2) : 'en';
  return { holiday: holiday as HolidayKey, localDate, locale: l };
}

export async function GET(request: NextRequest) {
  if (!checkApiRateLimit(request, 'holiday-progress-read', { maxRequests: 30, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const input = parse(searchParams.get('holiday'), searchParams.get('localDate'), searchParams.get('locale'));
  if (!input) return NextResponse.json({ error: 'Invalid holiday or date' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });

  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const win = windowFor(input.holiday, input.localDate, input.locale);
    if (!win) return NextResponse.json({ error: 'No event today' }, { status: 404 });
    return NextResponse.json(await readHolidayProgress(supabase, user.id, win));
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/holiday/progress', { method: 'GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkApiRateLimit(request, 'holiday-progress-mark', { maxRequests: 10, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { holiday?: unknown; localDate?: unknown; locale?: unknown } | null;
  const input = parse(body?.holiday, body?.localDate, body?.locale);
  if (!input) return NextResponse.json({ error: 'Invalid holiday or date' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });

  try {
    const user = await getAuthedUser(request, { writes: true });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await markHolidayDayPlayed({ supabase, userId: user.id, ...input }));
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/holiday/progress', { method: 'POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
