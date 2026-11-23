import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { clampTrialSince, readTrialUsage } from '@/lib/education/pro/trialUsage';
import logger from '@/utils/logger';

/** GET /api/teacher/trial-usage?since=ISO — the caller's own games, roster and practice since their trial began. */
export async function GET(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const since = clampTrialSince(new URL(req.url).searchParams.get('since'));
  if (!since) return NextResponse.json({ ok: false, error: 'Invalid since' }, { status: 400 });

  try {
    const usage = await readTrialUsage(createAdminClient() ?? sb, user.id, since);
    return NextResponse.json({ ok: true, usage }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (err) {
    logger.error('[trial-usage] read failed', err);
    return NextResponse.json({ ok: false, error: 'Read failed' }, { status: 500 });
  }
}
