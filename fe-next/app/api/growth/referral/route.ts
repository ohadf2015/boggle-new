/**
 * Referral API
 *
 * GET  — Get current user's referral code + stats.
 * POST — Claim a referral code (body: { code: string }).
 *        Rewards both referrer and referee with bonus coins/XP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

const REFERRAL_REWARD_XP = 100;
const REFERRAL_REWARD_COINS = 50;

function admin() {
  const client = createAdminClient();
  if (!client) throw new Error('createAdminClient returned null');
  return client;
}

function bad(reason: string, status = 400) {
  return NextResponse.json({ error: reason }, { status });
}

/** Generate a short readable referral code from a UUID */
function generateReferralCode(userId: string): string {
  const hash = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `LEX${hash}`;
}

// ============================================================
// GET — Get current user's referral info
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) return bad('Unauthorized', 401);

    const supabase = admin();

    // Get profile with referral data
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, display_name, referral_code, referral_count, referral_reward_xp, total_coins')
      .eq('id', user.id)
      .single();

    if (profileErr) return bad('Profile not found', 404);

    // Auto-generate referral code if missing
    let referralCode = profile.referral_code;
    if (!referralCode) {
      referralCode = generateReferralCode(user.id);
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ referral_code: referralCode })
        .eq('id', user.id);
      if (updateErr) return bad('Failed to generate referral code', 500);
    }

    // Get recent referrals
    const { data: recentReferrals } = await supabase
      .from('referrals')
      .select('id, referred_id, created_at, reward_granted')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      referralCode,
      referralCount: profile.referral_count ?? 0,
      referralRewardXp: profile.referral_reward_xp ?? 0,
      totalCoins: profile.total_coins ?? 0,
      recentReferrals: recentReferrals ?? [],
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.lexiclash.live'}?ref=${referralCode}`,
    });
  } catch (err) {
    console.error('Referral GET error:', err);
    return bad('Internal server error', 500);
  }
}

// ============================================================
// POST — Claim a referral code
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) return bad('Unauthorized', 401);

    const { code } = await req.json();
    if (!code || typeof code !== 'string') return bad('Missing referral code');

    const supabase = admin();

    // Find the referrer by referral code
    const { data: referrer, error: referrerErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code.toUpperCase().trim())
      .single();

    if (referrerErr || !referrer) return bad('Invalid referral code', 404);

    // Cannot refer yourself
    if (referrer.id === user.id) return bad('Cannot refer yourself', 400);

    // Check if already referred by someone
    const { data: claimerProfile } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', user.id)
      .single();

    if (claimerProfile?.referred_by) return bad('Already referred by another user', 400);

    // Check for duplicate referral
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrer.id)
      .eq('referred_id', user.id)
      .maybeSingle();

    if (existing) return bad('Referral already claimed', 400);

    // Create referral record
    const { error: insertErr } = await supabase.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      referral_code: code.toUpperCase().trim(),
      reward_granted: false,
      reward_type: 'signup_bonus',
      reward_amount: REFERRAL_REWARD_XP,
      referred_first_game_played: false,
      referred_games_played: 0,
      referred_total_score: 0,
    });

    if (insertErr) return bad('Failed to create referral', 500);

    // Update claimer's profile (referred_by)
    const { error: claimerUpdateErr } = await supabase
      .from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', user.id);

    if (claimerUpdateErr) console.error('Failed to update claimer referred_by:', claimerUpdateErr);

    return NextResponse.json({
      success: true,
      message: 'Referral claimed! You and your friend will get bonus rewards after they play their first game.',
    });
  } catch (err) {
    console.error('Referral POST error:', err);
    return bad('Internal server error', 500);
  }
}