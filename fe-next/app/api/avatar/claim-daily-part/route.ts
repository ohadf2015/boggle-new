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
import { getSupabaseAdmin } from '@/lib/admin/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getPremiumParts, PREMIUM_CATEGORIES } from '@/shared/types/customAvatar';
import { captureApiError } from '@/utils/sentry';
import { adTicketSecret, signAdTicket, verifyAdTicket } from '@/lib/ads/adTicket';

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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      adTicket: signAdTicket(user.id, now, adTicketSecret()),
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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const body = (await request.json().catch(() => ({}))) as { adTicket?: unknown };
    if (!verifyAdTicket(body?.adTicket, { userId: user.id, lastClaimAt, now, secret: adTicketSecret() })) {
      return NextResponse.json({ error: 'AD_NOT_WATCHED' }, { status: 400 });
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

    // Conditional on the cooldown stamp we read: two concurrent POSTs can't both win.
    const guardedUpdate = supabase
      .from('profiles')
      .update({
        premium_avatar_parts: newParts,
        last_daily_part_claim_at: claimedAt,
        updated_at: claimedAt,
      })
      .eq('id', user.id);
    const { data: updatedRows, error: updateError } = await (
      lastClaimAt
        ? guardedUpdate.eq('last_daily_part_claim_at', lastClaimAt)
        : guardedUpdate.is('last_daily_part_claim_at', null)
    ).select('id');

    if (updateError) {
      console.error('[AVATAR DAILY CLAIM] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to save claim' }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: 'COOLDOWN_ACTIVE', nextClaimAt: new Date(now + COOLDOWN_MS).toISOString() },
        { status: 429 },
      );
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
