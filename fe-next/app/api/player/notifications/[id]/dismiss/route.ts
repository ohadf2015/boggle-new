/**
 * Dismiss Notification API
 * POST /api/player/notifications/[id]/dismiss - Dismiss a single notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('user_notifications')
      .update({
        dismissed: true,
        dismissed_at: new Date().toISOString(),
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }
      console.error('Failed to dismiss notification:', error);
      return NextResponse.json(
        { error: 'Failed to dismiss notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notificationId: data.id,
    });
  } catch (error) {
    console.error('Dismiss notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
