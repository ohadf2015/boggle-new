/**
 * Player Notifications API
 * GET /api/player/notifications - Get notifications for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

/**
 * GET /api/player/notifications
 * Get notifications for current user with pagination
 *
 * Query params:
 * - unreadOnly: 'true' to filter only unread
 * - limit: max items to return (default 20, max 50)
 * - offset: pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const includeDismissed = searchParams.get('includeDismissed') === 'true';
    const dismissedOnly = searchParams.get('dismissedOnly') === 'true';
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Fetch notifications and unread count in parallel (was sequential — 2 round-trips)
    let query = supabase
      .from('user_notifications')
      .select(`
        id,
        title,
        body,
        notification_type,
        image_url,
        action_url,
        related_entity_type,
        related_entity_id,
        read,
        read_at,
        dismissed,
        created_at,
        sender:profiles!user_notifications_sender_profile_fkey(
          username,
          display_name,
          avatar_config
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dismissedOnly) {
      query = query.eq('dismissed', true);
    } else if (!includeDismissed) {
      query = query.eq('dismissed', false);
    }

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    query = query.range(offset, offset + limit - 1);

    const [notifResult, unreadResult] = await Promise.all([
      query,
      supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .eq('dismissed', false),
    ]);

    if (notifResult.error) {
      console.error('Failed to fetch notifications:', notifResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifications: notifResult.data || [],
      unreadCount: unreadResult.count || 0,
      pagination: {
        limit,
        offset,
        total: notifResult.count || 0,
        hasMore: (notifResult.count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
