import { createClient } from '@/lib/supabase/server';
import { validateLevelClear, starRating, type ClearSubmission } from '@/lib/blast/v2/anti-cheat';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let submission: ClearSubmission & { earnedCoins: number; earnedGems: number; submissionId?: string };
  try {
    submission = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const submissionId = submission.submissionId || randomUUID();

  // Check for duplicate
  const { data: existing } = await supabase
    .from('blast_level_clears')
    .select('id')
    .eq('user_id', user.id)
    .eq('submission_id', submissionId)
    .single();

  if (existing) {
    const { data: progress } = await supabase
      .from('blast_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();
    return NextResponse.json({
      coins: progress?.total_coins_earned_blast ?? 0,
      chestProgress: progress?.current_chest_progress ?? 0,
      chestNumber: progress?.current_chest_number ?? 1,
    });
  }

  // For now, do minimal validation (full validation needs level re-derive from Plan 1)
  // Plan 3 stub: just validate basic structure
  if (!submission.wordsFound || !Array.isArray(submission.wordsFound)) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }

  const stars = 1; // Default 1-star; real rating from starRating() after level is available

  // Award coins
  const totalCoins = submission.earnedCoins;
  await awardCoinsServer(user.id, totalCoins, 'blast_v2_level_clear', {
    level: String(submission.levelNumber),
    stars: String(stars),
  });

  // Ensure blast_progress row exists
  const { data: existingProgress } = await supabase
    .from('blast_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!existingProgress) {
    await supabase.from('blast_progress').insert({
      user_id: user.id,
      current_level: submission.levelNumber + 1,
      locale: submission.locale,
    });
  }

  // Insert level clear record
  await supabase.from('blast_level_clears').insert({
    user_id: user.id,
    level_number: submission.levelNumber,
    locale: submission.locale,
    submission_id: submissionId,
    stars,
    coins_earned: submission.earnedCoins,
    gems_collected: submission.earnedGems,
    hints_used: submission.hintsUsed,
    cascades_triggered: submission.cascadesTriggered,
    wrong_attempts: submission.wrongAttempts,
    time_seconds: submission.timeSeconds,
  });

  // Update progress via RPC
  const chestDelta = submission.earnedGems * 0.02; // each gem = 2% chest progress
  const { data: updated } = await supabase.rpc('increment_blast_progress', {
    p_user_id: user.id,
    p_chest_progress_delta: chestDelta,
    p_next_level: submission.levelNumber + 1,
    p_coins_delta: totalCoins,
  });

  return NextResponse.json({
    coins: updated?.[0]?.total_coins_earned_blast ?? 0,
    chestProgress: updated?.[0]?.current_chest_progress ?? 0,
    chestNumber: updated?.[0]?.current_chest_number ?? 1,
  });
}
