import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';
import { inputFromSearch, parseHolidayInput, type HolidayInput } from './holidayRequest.server';

export class BadRequest extends Error {}

interface Ctx<B> {
  supabase: SupabaseClient;
  userId: string | null;
  input: HolidayInput;
  body: B;
}

interface Opts {
  name: string;
  max: number;
  guestOk?: boolean;
}

export async function holidayRoute<B extends Record<string, unknown>>(
  request: NextRequest,
  opts: Opts,
  fn: (ctx: Ctx<B>) => Promise<unknown>,
): Promise<NextResponse> {
  if (!checkApiRateLimit(request, opts.name, { maxRequests: opts.max, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const isPost = request.method === 'POST';
  const body = (isPost ? await request.json().catch(() => null) : null) as B | null;
  const input = isPost ? parseHolidayInput(body) : inputFromSearch(request.url);
  if (!input) return NextResponse.json({ error: 'Invalid holiday or date' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });

  try {
    const user = await getAuthedUser(request, { writes: isPost });
    if (!user && !opts.guestOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await fn({ supabase, userId: user?.id ?? null, input, body: (body ?? {}) as B }));
  } catch (error) {
    if (error instanceof BadRequest) return NextResponse.json({ error: error.message }, { status: 400 });
    captureApiError(error instanceof Error ? error : new Error(String(error)), `/api/holiday/${opts.name}`, { method: request.method });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
