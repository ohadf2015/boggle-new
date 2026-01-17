import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

interface GiftMessage {
  id: string;
  title: string;
  message: string;
  template_type: string | null;
  image_url: string | null;
  xp_amount: number;
  coin_amount: number;
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
 * Get player's gift messages (unclaimed first)
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

    const { data: gifts, error: giftsError } = await supabase
      .from('admin_gift_messages')
      .select(`
        id,
        title,
        message,
        template_type,
        image_url,
        xp_amount,
        coin_amount,
        claimed,
        claimed_at,
        created_at,
        sender:profiles!admin_gift_messages_sender_id_fkey(username, display_name)
      `)
      .eq('recipient_id', user.id)
      .order('claimed', { ascending: true })
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

    // Transform the sender field from array to single object
    const transformedGifts: GiftMessage[] = (gifts || []).map((gift) => ({
      ...gift,
      // Supabase returns foreign key joins as arrays, extract first element
      sender: Array.isArray(gift.sender) && gift.sender.length > 0
        ? gift.sender[0]
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      gifts: transformedGifts,
    });
  } catch (error) {
    console.error('Error in GET /api/player/gifts:', error);
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
