import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';
import {
  COINS_PER_REFERRAL,
  milestonesCrossed,
} from '@/lib/referral/rewards';

/**
 * GET /api/referral
 * Get user's referral code and referral stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const user = await getAuthedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile with referral data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_code, referral_count, referral_reward_xp, username, display_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      captureApiError(new Error(profileError.message), '/api/referral', {
        method: 'GET',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Get detailed referral stats
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
      captureApiError(new Error(referralsError.message), '/api/referral', {
        method: 'GET',
        userId: user.id,
        statusCode: 500,
      });
    }

    // Get referred user details for display
    const referredIds = referrals?.map(r => r.referred_id) || [];
    let referredUsers: Array<{
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_emoji: string | null;
      avatar_color: string | null;
    }> = [];

    if (referredIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_emoji, avatar_color')
        .in('id', referredIds);

      if (!usersError) {
        referredUsers = users || [];
      }
    }

    // Combine referral data with user details
    const referralDetails = referrals?.map(referral => {
      const user = referredUsers.find(u => u.id === referral.referred_id);
      return {
        ...referral,
        username: user?.username,
        display_name: user?.display_name,
        avatar_emoji: user?.avatar_emoji,
        avatar_color: user?.avatar_color,
      };
    }) || [];

    // Calculate share URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.lexiclash.live';
    const shareUrl = `${origin}?ref=${profile.referral_code}`;

    return NextResponse.json({
      success: true,
      data: {
        referralCode: profile.referral_code,
        referralCount: profile.referral_count,
        referralRewardXp: profile.referral_reward_xp,
        shareUrl,
        referrals: referralDetails,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in GET /api/referral:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/referral',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/referral
 * Track referral usage when a user signs up with a referral code
 * Should be called after a new user completes registration
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
    const { referralCode, utmData } = body;

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    }

    // Find referrer by referral code (also grab current count for milestone detection)
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id, referral_count')
      .eq('referral_code', referralCode.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    // Don't allow self-referral
    if (referrer.id === user.id) {
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // Check if user was already referred
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', user.id)
      .single();

    if (existingProfile?.referred_by) {
      return NextResponse.json({ error: 'User already referred' }, { status: 400 });
    }

    // Update new user's profile with referrer
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating referred_by:', updateError);
      captureApiError(new Error(updateError.message), '/api/referral', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to track referral' }, { status: 500 });
    }

    // Create referral tracking record
    const { data: referralRecord, error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: user.id,
        referral_code: referralCode.toUpperCase(),
        utm_source: utmData?.utm_source || null,
        utm_medium: utmData?.utm_medium || null,
        utm_campaign: utmData?.utm_campaign || null,
      })
      .select()
      .single();

    if (referralError) {
      console.error('Error creating referral record:', referralError);
      captureApiError(new Error(referralError.message), '/api/referral', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
      // Don't fail the request if tracking fails
    }

    // Grant initial referral reward to referrer: coins (the promised gift) + XP
    const REFERRAL_REWARD_XP = 100;

    // 1) Coins via atomic sync_coins RPC — this is the UI-promised gift
    const { error: coinError } = await supabase.rpc('sync_coins', {
      p_user_id: referrer.id,
      p_amount: COINS_PER_REFERRAL,
      p_reason: 'referral_signup',
      p_metadata: { referred_user_id: user.id, referral_id: referralRecord?.id },
    });

    if (coinError) {
      console.error('Error granting referral coins:', coinError);
      captureApiError(new Error(coinError.message), '/api/referral', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
    }

    // 2) XP via atomic RPC (preserved for existing players)
    const { error: xpError } = await supabase.rpc('increment_profile_xp', {
      p_player_id: referrer.id,
      p_xp_amount: REFERRAL_REWARD_XP,
    });

    if (xpError) {
      console.error('Error granting referral XP:', xpError);
      captureApiError(new Error(xpError.message), '/api/referral', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
    }

    // Track referral-specific XP separately (used for display)
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('referral_reward_xp, referral_count')
      .eq('id', referrer.id)
      .single();

    const { error: trackError } = await supabase
      .from('profiles')
      .update({
        referral_reward_xp: (referrerProfile?.referral_reward_xp || 0) + REFERRAL_REWARD_XP,
      })
      .eq('id', referrer.id);

    if (trackError) {
      console.error('Error tracking referral XP:', trackError);
    }

    // 3) Milestone bonus coins — trigger has already bumped referral_count
    const prevCount = referrer.referral_count ?? 0;
    const newCount = referrerProfile?.referral_count ?? prevCount + 1;
    const crossed = milestonesCrossed(prevCount, newCount);
    const milestoneBonusCoins = crossed.reduce((sum, m) => sum + m.coins, 0);

    if (milestoneBonusCoins > 0) {
      const { error: bonusError } = await supabase.rpc('sync_coins', {
        p_user_id: referrer.id,
        p_amount: milestoneBonusCoins,
        p_reason: 'referral_milestone_bonus',
        p_metadata: {
          milestones: crossed.map(m => m.id),
          prev_count: prevCount,
          new_count: newCount,
        },
      });

      if (bonusError) {
        console.error('Error granting milestone bonus coins:', bonusError);
        captureApiError(new Error(bonusError.message), '/api/referral', {
          method: 'POST',
          userId: user.id,
          statusCode: 500,
        });
      }

      // Record one reward row per milestone for audit/history
      for (const m of crossed) {
        const { error: milestoneRewardError } = await supabase
          .from('referral_rewards')
          .insert({
            player_id: referrer.id,
            referral_id: referralRecord?.id ?? null,
            reward_type: `referrer_milestone_${m.id}`,
            reward_description: `Reached ${m.label} (${m.threshold} friends)`,
            xp_amount: 0,
            coin_amount: m.coins,
            metadata: {
              milestone_id: m.id,
              threshold: m.threshold,
              trigger_referred_user_id: user.id,
            },
          });
        if (milestoneRewardError) {
          console.error('Error recording milestone reward:', milestoneRewardError);
        }
      }
    }

    // 4) Record the base signup reward (coins + XP combined)
    if (referralRecord) {
      const { error: rewardInsertError } = await supabase.from('referral_rewards').insert({
        player_id: referrer.id,
        referral_id: referralRecord.id,
        reward_type: 'new_referral',
        reward_description: 'New friend joined via your referral link',
        xp_amount: REFERRAL_REWARD_XP,
        coin_amount: COINS_PER_REFERRAL,
        metadata: { referred_user_id: user.id },
      });

      if (rewardInsertError) {
        console.error('Error recording referral reward:', rewardInsertError);
      }

      // Mark reward as granted
      const { error: grantError } = await supabase
        .from('referrals')
        .update({
          reward_granted: true,
          reward_type: 'coins_xp',
          reward_amount: COINS_PER_REFERRAL,
          reward_granted_at: new Date().toISOString(),
        })
        .eq('id', referralRecord.id);

      if (grantError) {
        console.error('Error marking referral reward as granted:', grantError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Referral tracked successfully',
      data: {
        referrerId: referrer.id,
        rewardGranted: true,
        rewardCoins: COINS_PER_REFERRAL,
        rewardXp: REFERRAL_REWARD_XP,
        milestoneBonusCoins,
        milestonesCrossed: crossed.map(m => m.id),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in POST /api/referral:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/referral',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
