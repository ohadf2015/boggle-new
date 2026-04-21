/**
 * Notification Preferences API
 * PUT /api/notifications/preferences - Save category preferences
 * GET /api/notifications/preferences - Load category preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const preferencesSchema = z.object({
  pushEnabled: z.boolean(),
  dailyChallenge: z.boolean(),
  streakWarning: z.boolean(),
  friendInvites: z.boolean(),
  weeklySummary: z.boolean(),
});

/**
 * PUT /api/notifications/preferences
 * Save notification category preferences for the authenticated user
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = preferencesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Upsert into user_notification_preferences table
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: user.id,
          push_enabled: validation.data.pushEnabled,
          daily_challenge: validation.data.dailyChallenge,
          streak_warning: validation.data.streakWarning,
          friend_invites: validation.data.friendInvites,
          weekly_summary: validation.data.weeklySummary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Failed to save notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/preferences
 * Load notification category preferences for the authenticated user
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

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select(
        'push_enabled, daily_challenge, streak_warning, friend_invites, weekly_summary'
      )
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found — that's fine, return defaults
      console.error('Failed to load notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to load preferences' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        pushEnabled: true,
        dailyChallenge: true,
        streakWarning: true,
        friendInvites: true,
        weeklySummary: false,
      });
    }

    return NextResponse.json({
      pushEnabled: data.push_enabled,
      dailyChallenge: data.daily_challenge,
      streakWarning: data.streak_warning,
      friendInvites: data.friend_invites,
      weeklySummary: data.weekly_summary,
    });
  } catch (error) {
    console.error('Notification preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
