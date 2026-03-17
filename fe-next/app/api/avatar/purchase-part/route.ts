/**
 * Avatar Premium Part Purchase API
 *
 * POST - Purchase a premium avatar part with gold
 * Server-side validation: checks premium status, price, gold balance, and optimistic lock.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isPremiumPart, getPartPrice } from '@/shared/types/customAvatar';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'avatar-purchase', {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { category, partId } = body;

    if (typeof category !== 'string' || typeof partId !== 'string' || !isPremiumPart(category, partId)) {
      return NextResponse.json({ error: 'Invalid premium part' }, { status: 400 });
    }

    const price = getPartPrice(category, partId);

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    let { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('total_coins, premium_avatar_parts')
      .eq('id', user.id)
      .single();

    // Auto-create profile if it doesn't exist (OAuth users may not have one yet)
    if (!profile && (!fetchError || fetchError.code === 'PGRST116')) {
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.email?.split('@')[0] || `player_${user.id.slice(0, 8)}`,
          display_name: user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Player',
          avatar_emoji: '😊',
          avatar_color: '#4F46E5',
          total_coins: 0,
          premium_avatar_parts: [],
        });

      if (createError && createError.code !== '23505') {
        console.error('[AVATAR PURCHASE API] Failed to auto-create profile:', createError);
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      // Re-fetch the newly created (or concurrently created) profile
      const refetch = await supabase
        .from('profiles')
        .select('total_coins, premium_avatar_parts')
        .eq('id', user.id)
        .single();

      profile = refetch.data;
      fetchError = refetch.error;
    }

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentGold = (profile.total_coins as number) ?? 0;
    const currentParts: string[] = (profile.premium_avatar_parts as string[]) ?? [];
    const partKey = `${category}:${partId}`;

    if (currentParts.includes(partKey)) {
      return NextResponse.json({ error: 'Part already purchased' }, { status: 400 });
    }

    if (currentGold < price) {
      return NextResponse.json({ error: 'Insufficient gold' }, { status: 400 });
    }

    const newParts = [...currentParts, partKey];
    const newGold = currentGold - price;

    const { data: updatedRow, error: updateError } = await supabase
      .from('profiles')
      .update({
        total_coins: newGold,
        premium_avatar_parts: newParts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('total_coins', currentGold)
      .select('total_coins, premium_avatar_parts')
      .maybeSingle();

    if (updateError) {
      console.error('[AVATAR PURCHASE API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save purchase' }, { status: 500 });
    }

    if (!updatedRow) {
      return NextResponse.json({ error: 'Purchase conflict, please retry' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      gold: updatedRow.total_coins,
      premiumAvatarParts: updatedRow.premium_avatar_parts,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/avatar/purchase-part', { method: 'POST' });
    console.error('[AVATAR PURCHASE API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
