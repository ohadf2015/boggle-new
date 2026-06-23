import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/player/gifts/[id]
 * Fetch a single gift by ID regardless of claimed status.
 * Used when clicking gift notifications to show the gift modal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: giftId } = await params;

    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: gift, error: giftError } = await supabase
      .from('admin_gift_messages')
      .select(`
        id,
        title,
        message,
        template_type,
        image_url,
        xp_amount,
        coin_amount,
        badge_id,
        badge:collectible_items!admin_gift_messages_badge_id_fkey(id, name_key, icon, image_url, rarity),
        claimed,
        claimed_at,
        created_at,
        sender:profiles!admin_gift_messages_sender_id_fkey(username, display_name)
      `)
      .eq('id', giftId)
      .eq('recipient_id', user.id)
      .single();

    if (giftError || !gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    // Transform FK joins from arrays to single objects
    const sender = Array.isArray(gift.sender) && gift.sender.length > 0
      ? gift.sender[0]
      : undefined;

    let badge = null;
    if (Array.isArray(gift.badge) && gift.badge.length > 0) {
      badge = gift.badge[0];
    } else if (gift.badge && !Array.isArray(gift.badge)) {
      badge = gift.badge;
    }

    return NextResponse.json({
      success: true,
      gift: { ...gift, sender, badge },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in GET /api/player/gifts/[id]:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/player/gifts/[id]',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
