/**
 * Mark All Notifications Read API
 * POST /api/player/notifications/mark-all-read - Mark all notifications as read
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/player/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use database function for efficient bulk update
    const { data, error } = await supabase.rpc('mark_all_notifications_read');

    if (error) {
      console.error('Failed to mark all notifications as read:', error);
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.count || 0,
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
