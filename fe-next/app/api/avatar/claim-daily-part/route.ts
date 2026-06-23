/**
 * Daily Avatar Part Claim API
 *
 * GET  - Read cooldown state + remaining unowned count (auth-only).
 * POST - Claim the daily ad-rewarded premium avatar part (24h cooldown).
 * Grants a random unowned premium part. No coin cost (ad is the price).
 * Placement: `avatar_daily_free_part`. Auth-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getPremiumParts, PREMIUM_CATEGORIES } from '@/shared/types/customAvatar';
import { captureApiError } from '@/utils/sentry';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function collectAllPremiumKeys(): string[] {
  const keys: string[] = [];
  for (const category of PREMIUM_CATEGORIES) {
    for (const partId of getPremiumParts(category)) {
      keys.push(`${category}:${partId}`);
    }
  }
  return keys;
}

export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'avatar-claim-daily-part-status', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('premium_avatar_parts, last_daily_part_claim_at')
      .eq('id', user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const lastClaimAt = profile.last_daily_part_claim_at as string | null;
    const ownedParts: string[] = (profile.premium_avatar_parts as string[]) ?? [];
    const unownedCount = collectAllPremiumKeys().filter((k) => !ownedParts.includes(k)).length;

    const now = Date.now();
    const nextClaimAt = lastClaimAt
      ? new Date(new Date(lastClaimAt).getTime() + COOLDOWN_MS).toISOString()
      : null;
    const cooldownActive = !!(lastClaimAt && now - new Date(lastClaimAt).getTime() < COOLDOWN_MS);

    return NextResponse.json({
      cooldownActive,
      nextClaimAt,
      unownedCount,
      eligible: !cooldownActive && unownedCount > 0,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/avatar/claim-daily-part', { method: 'GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'avatar-claim-daily-part', {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('premium_avatar_parts, last_daily_part_claim_at')
      .eq('id', user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const lastClaimAt = profile.last_daily_part_claim_at as string | null;
    const now = Date.now();

    if (lastClaimAt) {
      const elapsed = now - new Date(lastClaimAt).getTime();
      if (elapsed < COOLDOWN_MS) {
        const nextClaimAt = new Date(new Date(lastClaimAt).getTime() + COOLDOWN_MS).toISOString();
        return NextResponse.json(
          { error: 'COOLDOWN_ACTIVE', nextClaimAt },
          { status: 429 },
        );
      }
    }

    const ownedParts: string[] = (profile.premium_avatar_parts as string[]) ?? [];
    const ownedSet = new Set(ownedParts);
    const unowned = collectAllPremiumKeys().filter((k) => !ownedSet.has(k));

    if (unowned.length === 0) {
      return NextResponse.json({ error: 'ALL_PARTS_OWNED' }, { status: 400 });
    }

    const granted = unowned[Math.floor(Math.random() * unowned.length)];
    const newParts = [...ownedParts, granted];
    const claimedAt = new Date(now).toISOString();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        premium_avatar_parts: newParts,
        last_daily_part_claim_at: claimedAt,
        updated_at: claimedAt,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[AVATAR DAILY CLAIM] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to save claim' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      granted,
      premiumAvatarParts: newParts,
      nextClaimAt: new Date(now + COOLDOWN_MS).toISOString(),
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/avatar/claim-daily-part', { method: 'POST' });
    console.error('[AVATAR DAILY CLAIM] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
