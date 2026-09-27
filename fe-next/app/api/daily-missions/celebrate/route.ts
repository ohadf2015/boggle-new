/**
 * Daily Mission Celebration API — POST handler.
 *
 * Flips a per-mission "celebrated" flag server-side so the completion toast
 * fires exactly once per (player, day), even across devices (Capacitor
 * webview + browser share this state instead of siloed localStorage).
 *
 * Returns `{ newlyCelebrated: true }` only when the flag transitioned
 * false→true on this call — the client uses that signal to show the toast.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

const VALID_KEYS = new Set(['word_hunt', 'adventure', 'community', 'grand_slam']);

const lazyMarkCelebrated = async (
  playerId: string,
  key: 'word_hunt' | 'adventure' | 'community' | 'grand_slam',
) => {
  const { markCelebrated } = await import('@/backend/modules/dailyMissionsManager');
  return markCelebrated(playerId, key);
};

export async function POST(request: NextRequest) {
  const rate = checkApiRateLimit(request, 'daily-missions-celebrate', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rate.success) {
    const retryAfter = rate.retryAfter ?? 60;
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const key = body?.key;
    if (typeof key !== 'string' || !VALID_KEYS.has(key)) {
      return NextResponse.json({ success: false, error: 'Invalid key' }, { status: 400 });
    }

    const result = await lazyMarkCelebrated(
      user.id,
      key as 'word_hunt' | 'adventure' | 'community' | 'grand_slam',
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'daily-missions/celebrate');
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
