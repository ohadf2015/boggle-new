/**
 * Push Token Registration API
 * POST /api/player/push-token - Register or update push token
 * GET /api/player/push-token - Get user's push tokens
 * DELETE /api/player/push-token - Remove all push tokens (logout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Validation schema for token registration
const registerTokenSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string().max(100).optional(),
});

/**
 * POST /api/player/push-token
 * Register or update a push token for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = registerTokenSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { token, platform, deviceId } = validation.data;

    // Use database function for upsert with token rotation handling
    const { data, error } = await supabase.rpc('upsert_push_token', {
      p_token: token,
      p_platform: platform,
      p_device_id: deviceId || null,
    });

    if (error) {
      console.error('Failed to register push token:', error);
      return NextResponse.json(
        { error: 'Failed to register token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tokenId: data.token_id,
      deviceId: data.device_id,
    });
  } catch (error) {
    console.error('Push token registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/player/push-token
 * Get current user's push tokens
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('id, platform, device_id, is_active, created_at, last_used_at')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch push tokens:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tokens: tokens || [],
    });
  } catch (error) {
    console.error('Get push tokens error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/player/push-token
 * Remove all push tokens for current user (used on logout)
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Deactivate all tokens rather than deleting (for audit trail)
    const { error } = await supabase
      .from('user_push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to remove push tokens:', error);
      return NextResponse.json(
        { error: 'Failed to remove tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete push tokens error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
