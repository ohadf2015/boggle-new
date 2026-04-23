import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';
import {
  COINS_PER_REFERRAL,
  REFERRAL_MILESTONES,
} from '@/lib/referral/rewards';

/**
 * GET /api/referral/stats
 * Returns extended referral statistics including milestones and coin totals.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch profile referral data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_code, referral_count, referral_reward_xp, username, display_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      captureApiError(new Error(profileError.message), '/api/referral/stats', {
        method: 'GET',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Fetch detailed referrals with referred user info
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select(`
        id,
        referred_id,
        created_at,
        reward_granted,
        referred_first_game_played,
        referred_games_played,
        referred_total_score
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (referralsError) {
      console.error('Error fetching referrals:', referralsError);
      captureApiError(new Error(referralsError.message), '/api/referral/stats', {
        method: 'GET',
        userId: user.id,
        statusCode: 500,
      });
    }

    // Fetch referred user profiles
    const referredIds = referrals?.map(r => r.referred_id) || [];
    let referredUsers: Array<{
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_emoji: string | null;
      avatar_color: string | null;
    }> = [];

    if (referredIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_emoji, avatar_color')
        .in('id', referredIds);

      referredUsers = users || [];
    }

    // Combine referral + user data and compute status
    const referralDetails = (referrals || []).map(referral => {
      const referred = referredUsers.find(u => u.id === referral.referred_id);
      let status: 'active' | 'invited' | 'inactive' = 'invited';
      if (referral.referred_first_game_played && referral.referred_games_played >= 5) {
        status = 'active';
      } else if (referral.referred_first_game_played) {
        status = 'inactive';
      }
      return {
        id: referral.id,
        referredId: referral.referred_id,
        createdAt: referral.created_at,
        rewardGranted: referral.reward_granted,
        gamesPlayed: referral.referred_games_played,
        username: referred?.username || null,
        displayName: referred?.display_name || null,
        avatarEmoji: referred?.avatar_emoji || null,
        avatarColor: referred?.avatar_color || null,
        status,
      };
    });

    const totalInvited = referralDetails.length;
    const totalJoined = referralDetails.filter(r => r.rewardGranted).length;
    const totalActive = referralDetails.filter(r => r.status === 'active').length;

    // Real coin total from ledger (signup + milestones + activity bonuses)
    const { data: rewardRows } = await supabase
      .from('referral_rewards')
      .select('coin_amount')
      .eq('player_id', user.id);
    const ledgerCoins = (rewardRows || []).reduce(
      (sum, r) => sum + (r.coin_amount || 0),
      0
    );
    // Fallback for legacy rows with no coin_amount recorded
    const coinsEarned = ledgerCoins > 0 ? ledgerCoins : totalJoined * COINS_PER_REFERRAL;

    // Compute milestone progress
    const milestones = REFERRAL_MILESTONES.map(m => ({
      id: m.id,
      label: m.label,
      threshold: m.threshold,
      coins: m.coins,
      reached: totalJoined >= m.threshold,
    }));

    // Build share URL
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://www.lexiclash.live';
    const shareUrl = `${origin}?ref=${profile.referral_code}`;

    return NextResponse.json({
      success: true,
      data: {
        referralCode: profile.referral_code,
        shareUrl,
        totalInvited,
        totalJoined,
        totalActive,
        coinsEarned,
        referralRewardXp: profile.referral_reward_xp,
        milestones,
        referrals: referralDetails,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in GET /api/referral/stats:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/referral/stats',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
