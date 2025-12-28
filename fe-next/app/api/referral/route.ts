import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/referral
 * Get user's referral code and referral stats
 */
export async function GET(request: NextRequest) {
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

    // Get user's profile with referral data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_code, referral_count, referral_reward_xp, username, display_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
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
    console.error('Error in GET /api/referral:', error);
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

    // Find referrer by referral code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id')
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
      // Don't fail the request if tracking fails
    }

    // Grant initial referral reward to referrer (100 XP)
    const REFERRAL_REWARD_XP = 100;

    // Update referrer's XP
    const { error: xpError } = await supabase
      .from('profiles')
      .update({
        total_xp: supabase.rpc('increment', { x: REFERRAL_REWARD_XP }),
        referral_reward_xp: supabase.rpc('increment', { x: REFERRAL_REWARD_XP }),
      })
      .eq('id', referrer.id);

    if (xpError) {
      console.error('Error granting referral XP:', xpError);
    }

    // Record the reward
    if (referralRecord) {
      await supabase.from('referral_rewards').insert({
        player_id: referrer.id,
        referral_id: referralRecord.id,
        reward_type: 'new_referral_xp',
        reward_description: 'New friend joined via your referral link',
        xp_amount: REFERRAL_REWARD_XP,
        metadata: { referred_user_id: user.id },
      });

      // Mark reward as granted
      await supabase
        .from('referrals')
        .update({
          reward_granted: true,
          reward_type: 'xp',
          reward_amount: REFERRAL_REWARD_XP,
          reward_granted_at: new Date().toISOString(),
        })
        .eq('id', referralRecord.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Referral tracked successfully',
      data: {
        referrerId: referrer.id,
        rewardGranted: true,
        rewardXp: REFERRAL_REWARD_XP,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
