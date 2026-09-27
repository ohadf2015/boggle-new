import { createClient } from '@/utils/supabase/server';
import { applyAntiCheatCaps, applyAntiCheatCapsWithLevel, starRating, type ClearSubmission } from '@/lib/blast/v2/anti-cheat';
import { buildRegistry, getLevelSourceForLevel } from '@/lib/blast/v2/level-source-registry';
import { CURATED_LEVEL_CUTOFF } from '@/lib/blast/v2/level-source';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import type { BlastLevel } from '@/lib/blast/v2/types';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { mergeUnlocksSeen } from '@/lib/blast/v2/mergeUnlocksSeen';
import { validateUnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let submission: ClearSubmission & {
    earnedCoins: number;
    earnedGems: number;
    submissionId?: string;
    unlocksSeen?: Record<string, boolean>;
  };
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

  if (!submission.wordsFound || !Array.isArray(submission.wordsFound)) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }

  // Resolve the level once: needed for level-aware anti-cheat caps AND for the
  // real star rating. Generated levels (31+) resolve deterministically too.
  let level: BlastLevel | null = null;
  try {
    const registry = buildRegistry();
    level = await getLevelSourceForLevel(submission.levelNumber, submission.locale, registry).resolve(
      submission.levelNumber,
      submission.locale,
    );
  } catch (err) {
    // Pack missing / load failure — anti-cheat falls back to the level-less
    // ceiling and stars default to 1.
    console.error('[blast/clear-level] level resolve failed', {
      level: submission.levelNumber,
      locale: submission.locale,
      err,
    });
  }

  // Anti-cheat: level-aware caps for curated levels (1..CURATED_LEVEL_CUTOFF),
  // level-less ceiling otherwise — unchanged behavior.
  const capped =
    level && submission.levelNumber <= CURATED_LEVEL_CUTOFF
      ? applyAntiCheatCapsWithLevel(submission, submission.earnedCoins, level)
      : applyAntiCheatCaps(submission, submission.earnedCoins);
  if (!capped.ok) {
    return NextResponse.json({ error: 'Invalid submission', reason: capped.reason }, { status: 400 });
  }

  // Real star rating (was hardcoded to 1, so every clear persisted 1★). Bonus
  // words = found words not in the level's theme set, locale-aware normalized.
  let stars: 1 | 2 | 3 = 1;
  if (level) {
    const norm = LOCALE_CONFIGS[submission.locale].normalize;
    const themeNorm = new Set(level.words.map(norm));
    const bonusWordsFound = submission.wordsFound.filter((w) => !themeNorm.has(norm(w))).length;
    stars = starRating(submission, level, bonusWordsFound);
  }
  const totalCoins = capped.trustedCoins;
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
    const { error: insertErr } = await supabase.from('blast_progress').insert({
      user_id: user.id,
      current_level: submission.levelNumber + 1,
      locale: submission.locale,
    });
    if (insertErr) {
      console.error('[blast/clear-level] blast_progress insert failed', { userId: user.id, insertErr });
    }
  }

  // Insert level clear record
  const { error: clearErr } = await supabase.from('blast_level_clears').insert({
    user_id: user.id,
    level_number: submission.levelNumber,
    locale: submission.locale,
    submission_id: submissionId,
    stars,
    coins_earned: totalCoins,
    gems_collected: submission.earnedGems,
    hints_used: submission.hintsUsed,
    cascades_triggered: submission.cascadesTriggered,
    wrong_attempts: submission.wrongAttempts,
    time_seconds: submission.timeSeconds,
  });
  if (clearErr) {
    console.error('[blast/clear-level] blast_level_clears insert failed', { userId: user.id, clearErr });
  }

  // Update progress via RPC
  //
  // Chest delta combines:
  // - gems collected (legacy: each gem tile = 2% chest progress)
  // - base words-found contribution (5% per theme word + 1% per letter past 3)
  //   so chains without gem tiles still visibly fill the chest. Mirrors the
  //   in-game baseChestDeltaForWord formula in useBlastV2.ts.
  const wordsCount = submission.wordsFound.length;
  const totalLetters = submission.wordsFound.reduce((sum, w) => sum + w.length, 0);
  const wordBase = wordsCount * 0.05 + Math.max(0, totalLetters - wordsCount * 3) * 0.01;
  const chestDelta = submission.earnedGems * 0.02 + wordBase;
  const { data: updated, error: rpcErr } = await supabase.rpc('increment_blast_progress', {
    p_user_id: user.id,
    p_chest_progress_delta: chestDelta,
    p_next_level: submission.levelNumber + 1,
    p_coins_delta: totalCoins,
  });
  if (rpcErr) {
    // Loud: a silent failure here froze progress + chest for ~25 days (PL/pgSQL
    // column-ambiguity). Never swallow it again.
    console.error('[blast/clear-level] increment_blast_progress RPC failed', { userId: user.id, rpcErr });
  }

  // Persist the player's seen-tutorial flags so a resume skips FTUE prompts they
  // already cleared. Merge (never replace) to keep the server-owned
  // veteran_bonus_granted flag intact — a replace could let the 500-coin bonus
  // re-fire on the next load.
  if (submission.unlocksSeen && typeof submission.unlocksSeen === 'object') {
    const mergedUnlocks = validateUnlocksSeen(
      mergeUnlocksSeen(
        (existingProgress?.unlocks_seen as Record<string, boolean> | null) ?? null,
        submission.unlocksSeen,
      ),
    );
    const { error: unlocksErr } = await supabase
      .from('blast_progress')
      .update({ unlocks_seen: mergedUnlocks })
      .eq('user_id', user.id);
    if (unlocksErr) {
      console.error('[blast/clear-level] unlocks_seen update failed', { userId: user.id, unlocksErr });
    }
  }

  // Prefer the RPC's returned row; if the RPC errored, read the row so the client
  // still sees the true persisted coins/chest instead of a misleading zero.
  let progressRow = updated?.[0];
  if (!progressRow) {
    const { data: fresh } = await supabase
      .from('blast_progress')
      .select('total_coins_earned_blast, current_chest_progress, current_chest_number')
      .eq('user_id', user.id)
      .single();
    progressRow = fresh ?? undefined;
  }

  return NextResponse.json({
    coins: progressRow?.total_coins_earned_blast ?? 0,
    chestProgress: progressRow?.current_chest_progress ?? 0,
    chestNumber: progressRow?.current_chest_number ?? 1,
  });
}
