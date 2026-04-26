import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { claimBoostServer } from '@/backend/services/economy/claimBoost';
import { isBoostType } from '@/shared/types/boosts';

const STATUS_FOR_ERROR: Record<string, number> = {
  cap_reached: 429,
  already_claimed: 409,
  invalid_type: 400,
  invalid_session: 400,
  profile_not_found: 404,
  no_supabase: 503,
  rpc_failed: 500,
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const { sessionId, boostType, adReceipt } = body as {
    sessionId?: string; boostType?: string; adReceipt?: { watched?: boolean };
  };

  if (!adReceipt?.watched) return NextResponse.json({ error: 'no_ad_receipt' }, { status: 400 });
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 128) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
  }
  if (!isBoostType(boostType)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 });

  const result = await claimBoostServer(user.id, sessionId, boostType);
  if (!result.success) {
    const status = STATUS_FOR_ERROR[result.error ?? 'rpc_failed'] ?? 500;
    return NextResponse.json({ success: false, error: result.error, remaining: result.remaining }, { status });
  }
  return NextResponse.json({ success: true, token: result.token, remaining: result.remaining });
}
