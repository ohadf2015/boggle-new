import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';

/**
 * POST /api/player/gifts/[id]/claim
 *
 * Pays out an admin gift: credits the coins + XP the sender attached, and
 * stamps the row claimed.
 *
 * This route did not exist. `useUnclaimedGifts.ts:141` has been POSTing here
 * all along and getting a 404, so every gift ever sent was displayed to the
 * player and never paid (26 of 29 rows unclaimed, 6,509 coins undelivered when
 * this was found while triaging a player's "I don't have enough coins" report).
 *
 * The conditional UPDATE ... WHERE claimed = false IS the idempotency lock:
 * a double tap (or a retry after a dropped response) updates zero rows and
 * takes the already-claimed branch, so nobody gets paid twice. Credits happen
 * after the flag is taken, and the flag is released again if the coin credit
 * fails — better to let the player retry than to burn the gift.
 */
export async function POST(
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

    // Claim the row first — scoped to this recipient, and only if still unclaimed.
    const { data: claimed, error: claimError } = await supabase
      .from('admin_gift_messages')
      .update({ claimed: true, claimed_at: new Date().toISOString() })
      .eq('id', giftId)
      .eq('recipient_id', user.id)
      .eq('claimed', false)
      .select('id, xp_amount, coin_amount')
      .maybeSingle();

    if (claimError) {
      captureApiError(new Error(claimError.message), '/api/player/gifts/[id]/claim', {
        method: 'POST',
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to claim gift' }, { status: 500 });
    }

    if (!claimed) {
      // Either it is not this player's gift, it does not exist, or it was
      // already claimed. Distinguish the last case so the UI can settle.
      const { data: existing } = await supabase
        .from('admin_gift_messages')
        .select('id, claimed')
        .eq('id', giftId)
        .eq('recipient_id', user.id)
        .maybeSingle();

      if (existing?.claimed) {
        return NextResponse.json({ success: true, alreadyClaimed: true, xpAwarded: 0, coinsAwarded: 0 });
      }
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    const coinAmount = Number(claimed.coin_amount) || 0;
    const xpAmount = Number(claimed.xp_amount) || 0;

    let coinsAwarded = 0;
    if (coinAmount > 0) {
      const res = await awardCoinsServer(user.id, coinAmount, 'admin_gift', { giftId });
      if (!res.success) {
        // Put the gift back so the player can retry instead of losing it.
        await supabase
          .from('admin_gift_messages')
          .update({ claimed: false, claimed_at: null })
          .eq('id', giftId);
        return NextResponse.json({ error: 'Failed to credit coins' }, { status: 500 });
      }
      coinsAwarded = coinAmount;
    }

    // XP is best-effort AFTER the coins: a failed XP grant must not undo a
    // successful coin credit (and re-opening the gift would double-pay them).
    let xpAwarded = 0;
    if (xpAmount > 0) {
      const { error: xpError } = await supabase.rpc('increment_player_xp', {
        p_player_id: user.id,
        p_xp_amount: xpAmount,
      });
      if (xpError) {
        captureApiError(new Error(xpError.message), '/api/player/gifts/[id]/claim', {
          method: 'POST',
          statusCode: 500,
        });
      } else {
        xpAwarded = xpAmount;
      }
    }

    return NextResponse.json({ success: true, xpAwarded, coinsAwarded });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/player/gifts/[id]/claim',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
