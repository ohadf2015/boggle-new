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
// Claiming lives in POST /api/referral
// ============================================================
//
// There used to be a second, thinner claim handler here. It wrote the `referrals`
// row and `referred_by` and stopped there — no coins, no XP, no milestone
// bonuses, no reward rows — so whichever endpoint a caller happened to pick
// decided whether the referrer got paid. Neither had a caller, and the loop had
// never fired once (375 codes issued, 0 referrals). Removed rather than kept in
// sync: components/referral/ReferralCodeClaimer.tsx now claims against
// /api/referral, which grants the full reward.
