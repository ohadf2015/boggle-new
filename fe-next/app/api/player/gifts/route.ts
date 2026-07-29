import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

interface BadgeInfo {
  id: string;
  name_key: string;
  icon: string;
  image_url: string | null;
  rarity: string;
}

interface GiftMessage {
  id: string;
  title: string;
  message: string;
  template_type: string | null;
  image_url: string | null;
  xp_amount: number;
  coin_amount: number;
  badge_id: string | null;
  badge?: BadgeInfo | null;
  claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  sender?: {
    username: string;
    display_name: string | null;
  };
}

/**
 * GET /api/player/gifts
 * Get player's gift messages (unclaimed and not dismissed)
 *
 * Only returns gifts that:
 * 1. Are not claimed (claimed = false)
 * 2. Were created AFTER the user's gift_modal_dismissed_at timestamp (if set)
 *    This ensures dismissed gifts don't appear in the gift list/badge
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check gift_modal_dismissed_at
    const { data: profile } = await supabase
      .from('profiles')
      .select('gift_modal_dismissed_at')
      .eq('id', user.id)
      .single();

    // Build the query - filter by claimed status and dismissal timestamp
    let query = supabase
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
      .eq('recipient_id', user.id)
      .eq('claimed', false);

    // If user has dismissed the modal, only return gifts created AFTER that time
    if (profile?.gift_modal_dismissed_at) {
      query = query.gt('created_at', profile.gift_modal_dismissed_at);
    }

    const { data: gifts, error: giftsError } = await query
      .order('created_at', { ascending: false });

    if (giftsError) {
      console.error('Error fetching gifts:', giftsError);
      captureApiError(new Error(giftsError.message), '/api/player/gifts', {
        method: 'GET',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to fetch gifts' }, { status: 500 });
    }

    // Transform the sender and badge fields from array to single object
    const transformedGifts: GiftMessage[] = (gifts || []).map((gift) => {
      // Supabase returns foreign key joins as arrays, extract first element
      const sender = Array.isArray(gift.sender) && gift.sender.length > 0
        ? gift.sender[0]
        : undefined;

      // Badge is also a foreign key join - extract first element if array
      let badge: BadgeInfo | null = null;
      if (Array.isArray(gift.badge) && gift.badge.length > 0) {
        badge = gift.badge[0] as BadgeInfo;
      } else if (gift.badge && !Array.isArray(gift.badge)) {
        badge = gift.badge as BadgeInfo;
      }

      return {
        ...gift,
        sender,
        badge,
      };
    });

    return NextResponse.json({
      success: true,
      gifts: transformedGifts,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in GET /api/player/gifts:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/player/gifts',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
