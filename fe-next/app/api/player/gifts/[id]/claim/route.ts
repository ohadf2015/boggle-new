import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

interface ClaimResult {
  success: boolean;
  xp_awarded: number;
  coins_awarded: number;
}

/**
 * POST /api/player/gifts/[id]/claim
 * Claim a gift and receive XP/coins rewards
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: giftId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the database function for atomic claim operation
    const { data: result, error: claimError } = await supabase
      .rpc('claim_admin_gift', { gift_id: giftId });

    if (claimError) {
      console.error('Error claiming gift:', claimError);
      captureApiError(new Error(claimError.message), '/api/player/gifts/[id]/claim', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
        body: { giftId },
      });
      return NextResponse.json({ error: 'Failed to claim gift' }, { status: 500 });
    }

    const claimResult = result as ClaimResult;

    if (!claimResult.success) {
      return NextResponse.json(
        { error: 'Cannot claim gift' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      xpAwarded: claimResult.xp_awarded,
      coinsAwarded: claimResult.coins_awarded,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in POST /api/player/gifts/[id]/claim:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/player/gifts/[id]/claim',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
