import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

/**
 * POST /api/referral/milestone
 * Track milestone events for referred users and grant rewards to referrers
 * Called when a referred user completes important actions (first game, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { milestone, metadata } = body;

    // Valid milestones: 'first_game_played', 'five_games_played', 'ten_games_played'
    const validMilestones = ['first_game_played', 'five_games_played', 'ten_games_played'];
    if (!milestone || !validMilestones.includes(milestone)) {
      return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 });
    }

    // Check if this user was referred
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referred_by, total_games')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      captureApiError(new Error(profileError.message), '/api/referral/milestone', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile.referred_by) {
      // User wasn't referred, no milestone to track
      return NextResponse.json({
        success: true,
        message: 'User not referred, no milestone tracked',
      });
    }

    // Get the referral record
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', profile.referred_by)
      .eq('referred_id', user.id)
      .single();

    if (referralError || !referral) {
      console.error('Error fetching referral record:', referralError);
      if (referralError) {
        captureApiError(new Error(referralError.message), '/api/referral/milestone', {
          method: 'POST',
          userId: user.id,
          statusCode: 404,
        });
      }
      return NextResponse.json({ error: 'Referral record not found' }, { status: 404 });
    }

    // Define milestone rewards (XP + coins granted to the referrer)
    const MILESTONE_REWARDS: Record<
      string,
      { xp: number; coins: number; description: string; field: string }
    > = {
      first_game_played: {
        xp: 50,
        coins: 5,
        description: 'Your friend played their first game',
        field: 'referred_first_game_played',
      },
      five_games_played: {
        xp: 100,
        coins: 10,
        description: 'Your friend played 5 games',
        field: 'referred_games_played',
      },
      ten_games_played: {
        xp: 200,
        coins: 20,
        description: 'Your friend played 10 games',
        field: 'referred_games_played',
      },
    };

    const reward = MILESTONE_REWARDS[milestone];

    // Check if milestone already granted
    if (milestone === 'first_game_played' && referral.referred_first_game_played) {
      return NextResponse.json({
        success: true,
        message: 'Milestone already granted',
      });
    }

    // For games played milestones, check the count
    if (milestone === 'five_games_played' && referral.referred_games_played >= 5) {
      return NextResponse.json({
        success: true,
        message: 'Milestone already granted',
      });
    }

    if (milestone === 'ten_games_played' && referral.referred_games_played >= 10) {
      return NextResponse.json({
        success: true,
        message: 'Milestone already granted',
      });
    }

    // Update referral record with milestone
    const updateData: Record<string, any> = {
      referred_total_score: metadata?.totalScore || referral.referred_total_score,
    };

    if (milestone === 'first_game_played') {
      updateData.referred_first_game_played = true;
      updateData.referred_games_played = 1;
    } else {
      updateData.referred_games_played = profile.total_games;
    }

    const { error: updateError } = await supabase
      .from('referrals')
      .update(updateData)
      .eq('id', referral.id);

    if (updateError) {
      console.error('Error updating referral milestone:', updateError);
      captureApiError(new Error(updateError.message), '/api/referral/milestone', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
    }

    // Grant reward XP to referrer
    const { error: xpError } = await supabase.rpc('increment_profile_xp', {
      p_player_id: profile.referred_by,
      p_xp_amount: reward.xp,
    });

    if (xpError) {
      console.error('Error granting milestone XP:', xpError);
      captureApiError(new Error(xpError.message), '/api/referral/milestone', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
      // Try direct update if RPC fails
      const { data: fallbackProfile } = await supabase
        .from('profiles')
        .select('referral_reward_xp, total_xp')
        .eq('id', profile.referred_by)
        .single();

      const { error: fallbackError } = await supabase
        .from('profiles')
        .update({
          total_xp: (fallbackProfile?.total_xp || 0) + reward.xp,
          referral_reward_xp: (fallbackProfile?.referral_reward_xp || 0) + reward.xp,
        })
        .eq('id', profile.referred_by);

      if (fallbackError) {
        console.error('Fallback XP update also failed:', fallbackError);
      }
    }

    // Grant reward coins to referrer via atomic sync_coins RPC
    const { error: coinError } = await supabase.rpc('sync_coins', {
      p_user_id: profile.referred_by,
      p_amount: reward.coins,
      p_reason: `referral_milestone_${milestone}`,
      p_metadata: { referred_user_id: user.id, milestone },
    });

    if (coinError) {
      console.error('Error granting milestone coins:', coinError);
      captureApiError(new Error(coinError.message), '/api/referral/milestone', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
    }

    // Record the reward
    const { error: rewardError } = await supabase.from('referral_rewards').insert({
      player_id: profile.referred_by,
      referral_id: referral.id,
      reward_type: `milestone_${milestone}`,
      reward_description: reward.description,
      xp_amount: reward.xp,
      coin_amount: reward.coins,
      metadata: {
        referred_user_id: user.id,
        milestone,
        ...metadata,
      },
    });

    if (rewardError) {
      console.error('Error recording referral reward:', rewardError);
      captureApiError(new Error(rewardError.message), '/api/referral/milestone', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Milestone tracked and reward granted',
      data: {
        milestone,
        rewardXp: reward.xp,
        rewardCoins: reward.coins,
        referrerId: profile.referred_by,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in POST /api/referral/milestone:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/referral/milestone',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
