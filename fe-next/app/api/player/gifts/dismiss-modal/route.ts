import { NextRequest, NextResponse } from 'next/server';
import { createRequestClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

/**
 * POST /api/player/gifts/dismiss-modal
 * Mark the gift modal as dismissed for the current user
 * This prevents auto-showing the modal in future sessions
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, token } = await createRequestClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token ?? undefined);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dismissedAt = new Date().toISOString();

    // Update profile to mark modal as dismissed
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        gift_modal_dismissed_at: dismissedAt,
        updated_at: dismissedAt,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error dismissing gift modal:', updateError);
      captureApiError(new Error(updateError.message), '/api/player/gifts/dismiss-modal', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to dismiss modal' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      dismissedAt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in POST /api/player/gifts/dismiss-modal:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/player/gifts/dismiss-modal',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
