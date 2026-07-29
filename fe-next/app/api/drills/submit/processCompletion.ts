/**
 * Pure brain-drill submission processor.
 *
 * Extracted from route.ts so the offline sync route can dispatch drill
 * awards through the same pipeline. The route owns auth + body parse +
 * idempotency-key header resolution; everything past that lives here.
 *
 * Behavior-preserving against route.ts as of 2026-05-11.
 */

import { captureApiError } from '@/utils/sentry';
import { getPostHogServer } from '@/lib/posthog';
import { DRILL_DOMAINS, type DrillType, type CognitiveDomain } from '@/shared/types/cognitive';
import {
  calculateRollingAverage,
  calculateOverallScore,
  getTierFromScore,
  calculateTierProgress,
} from '@/utils/cognitiveScoring';
import { computeDrillProgressUpdate } from '@/shared/utils/drillLeveling';
import { validateDrillSubmission } from '@/shared/utils/drillSubmissionValidation';
import { computeDrillImprovement, type DrillImprovement } from '@/shared/utils/drillImprovement';

export type SupabaseLike = any;

export interface ProcessDrillContext {
  supabase: SupabaseLike;
  source: 'live' | 'offline-sync';
}

export interface DrillSubmitBody {
  drillType: DrillType;
  level: number;
  score: number;
  durationSeconds: number;
  wordsFound: number;
  domainScoreEarned?: number;
  extraData?: Record<string, unknown>;
}

export interface DrillCompletionResponseBody {
  success: true;
  idempotent?: boolean;
  data: Record<string, unknown>;
  brainScore?: {
    overallScore: number;
    tier: string;
    domainScores: Record<CognitiveDomain, number>;
    scoreDelta: number;
    targetDomain: CognitiveDomain;
  };
  xpAwarded: number;
  levelPromoted: boolean;
  newLevel?: number;
  previousLevel?: number;
  /** "You got better" signals for the results screen (best-effort). */
  improvement?: DrillImprovement;
}

export type DrillProcessResult =
  | { ok: true; body: DrillCompletionResponseBody }
  | { ok: false; status: number; error: string };

const DRILL_LEVEL_MAX_SCORES: Record<number, number> = {
  1: 500,
  2: 750,
  3: 1000,
  4: 1500,
  5: 2000,
};

function calculateDomainScoreFromDrill(score: number, level: number): number {
  const maxScore = DRILL_LEVEL_MAX_SCORES[level] ?? DRILL_LEVEL_MAX_SCORES[1];
  const levelBonus = (level - 1) * 5;
  const baseScore = Math.min(100, (score / maxScore) * 80);
  return Math.min(100, Math.round(baseScore + levelBonus));
}

export async function processBrainDrillCompletion(
  body: DrillSubmitBody,
  userId: string,
  submissionId: string,
  ctx: ProcessDrillContext,
): Promise<DrillProcessResult> {
  const { supabase } = ctx;
  const { drillType, level, score, durationSeconds, wordsFound, domainScoreEarned, extraData } = body ?? {};

  if (
    drillType === undefined ||
    level === undefined ||
    score === undefined ||
    durationSeconds === undefined ||
    wordsFound === undefined
  ) {
    return {
      ok: false,
      status: 400,
      error: 'Missing required fields: drillType, level, score, durationSeconds, wordsFound',
    };
  }

  const validation = validateDrillSubmission({ drillType, level, score, wordsFound, durationSeconds });
  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.error };
  }

  if (submissionId) {
    const fiveMinAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('drill_sessions')
      .select('id, score, level, duration_seconds, words_found, domain_score_earned, created_at')
      .eq('user_id', userId)
      .eq('drill_type', drillType)
      .gte('created_at', fiveMinAgoIso)
      .filter('extra_data->>submissionId', 'eq', submissionId)
      .maybeSingle();

    if (existing) {
      return {
        ok: true,
        body: {
          success: true,
          idempotent: true,
          data: existing,
          xpAwarded: 0,
          levelPromoted: false,
        },
      };
    }
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('drill_sessions')
    .insert({
      user_id: userId,
      drill_type: drillType,
      level,
      score,
      duration_seconds: durationSeconds,
      words_found: wordsFound,
      domain_score_earned: domainScoreEarned || null,
      extra_data: extraData || null,
    })
    .select()
    .single();

  if (sessionError) {
    console.error('Error saving drill session:', sessionError);
    captureApiError(new Error(sessionError.message), '/api/drills/submit', {
      method: 'POST',
      userId,
      statusCode: 500,
    });
    return { ok: false, status: 500, error: 'Failed to save drill result' };
  }

  const { data: progressData, error: progressError } = await supabase
    .from('drill_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('drill_type', drillType)
    .single();

  if (progressError && progressError.code !== 'PGRST116') {
    console.error('Error fetching drill progress:', progressError);
  }

  const priorSnapshot = progressData
    ? {
        level: progressData.level ?? 1,
        highScore: progressData.high_score ?? 0,
        totalPlays: progressData.total_plays ?? 0,
        totalScore: progressData.total_score ?? 0,
      }
    : null;
  const nextProgress = computeDrillProgressUpdate(priorSnapshot, score);
  const nowIso = new Date().toISOString();

  if (progressData) {
    const { error: updateError } = await supabase
      .from('drill_progress')
      .update({
        level: nextProgress.level,
        high_score: nextProgress.highScore,
        total_plays: nextProgress.totalPlays,
        total_score: nextProgress.totalScore,
        avg_score: nextProgress.avgScore,
        last_played_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', progressData.id);

    if (updateError) {
      console.error('Error updating drill progress:', updateError);
    }
  } else {
    const { error: insertError } = await supabase
      .from('drill_progress')
      .insert({
        user_id: userId,
        drill_type: drillType,
        level: nextProgress.level,
        high_score: nextProgress.highScore,
        total_plays: nextProgress.totalPlays,
        total_score: nextProgress.totalScore,
        avg_score: nextProgress.avgScore,
        last_played_at: nowIso,
      });

    if (insertError) {
      console.error('Error creating drill progress:', insertError);
    }
  }

  const targetDomain = DRILL_DOMAINS[drillType];
  const domainScore = calculateDomainScoreFromDrill(score, level);

  await supabase
    .from('drill_sessions')
    .update({ domain_score_earned: domainScore })
    .eq('id', sessionData.id);

  const { data: currentBrainScore } = await supabase
    .from('brain_scores')
    .select('*')
    .eq('user_id', userId)
    .single();

  let updatedBrainScore;

  if (currentBrainScore) {
    const currentDomainScores: Record<CognitiveDomain, number> = {
      processingSpeed: currentBrainScore.processing_speed,
      workingMemory: currentBrainScore.working_memory,
      attention: currentBrainScore.attention,
      flexibility: currentBrainScore.flexibility,
      vocabulary: currentBrainScore.vocabulary,
    };

    const totalActivities = (currentBrainScore.games_analyzed || 0) + (currentBrainScore.drills_completed || 0);
    const newDomainScore = calculateRollingAverage(
      currentDomainScores[targetDomain],
      domainScore,
      totalActivities
    );

    currentDomainScores[targetDomain] = newDomainScore;

    const newOverallScore = calculateOverallScore(currentDomainScores);
    const newTier = getTierFromScore(newOverallScore);
    const newTierProgress = calculateTierProgress(newOverallScore);

    const { error: brainUpdateError } = await supabase
      .from('brain_scores')
      .update({
        processing_speed: currentDomainScores.processingSpeed,
        working_memory: currentDomainScores.workingMemory,
        attention: currentDomainScores.attention,
        flexibility: currentDomainScores.flexibility,
        vocabulary: currentDomainScores.vocabulary,
        overall_score: newOverallScore,
        tier: newTier,
        tier_progress: newTierProgress,
        drills_completed: (currentBrainScore.drills_completed || 0) + 1,
        last_activity_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (brainUpdateError) {
      console.error('Error updating brain score from drill:', brainUpdateError);
    }

    updatedBrainScore = {
      overallScore: newOverallScore,
      tier: newTier,
      domainScores: currentDomainScores,
      scoreDelta: newOverallScore - currentBrainScore.overall_score,
      targetDomain,
    };
  } else {
    const initialDomainScores: Record<CognitiveDomain, number> = {
      processingSpeed: 50,
      workingMemory: 50,
      attention: 50,
      flexibility: 50,
      vocabulary: 50,
    };
    initialDomainScores[targetDomain] = domainScore;

    const newOverallScore = calculateOverallScore(initialDomainScores);
    const newTier = getTierFromScore(newOverallScore);
    const newTierProgress = calculateTierProgress(newOverallScore);

    const { error: brainCreateError } = await supabase
      .from('brain_scores')
      .insert({
        user_id: userId,
        processing_speed: initialDomainScores.processingSpeed,
        working_memory: initialDomainScores.workingMemory,
        attention: initialDomainScores.attention,
        flexibility: initialDomainScores.flexibility,
        vocabulary: initialDomainScores.vocabulary,
        overall_score: newOverallScore,
        tier: newTier,
        tier_progress: newTierProgress,
        games_analyzed: 0,
        drills_completed: 1,
        last_activity_at: new Date().toISOString(),
      });

    if (brainCreateError) {
      console.error('Error creating brain score from drill:', brainCreateError);
    }

    updatedBrainScore = {
      overallScore: newOverallScore,
      tier: newTier,
      domainScores: initialDomainScores,
      scoreDelta: newOverallScore,
      targetDomain,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: existingHistory } = await supabase
    .from('brain_score_history')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', 'daily')
    .eq('period_start', today)
    .single();

  if (existingHistory) {
    await supabase
      .from('brain_score_history')
      .update({
        overall_score: updatedBrainScore.overallScore,
        processing_speed: updatedBrainScore.domainScores.processingSpeed,
        working_memory: updatedBrainScore.domainScores.workingMemory,
        attention: updatedBrainScore.domainScores.attention,
        flexibility: updatedBrainScore.domainScores.flexibility,
        vocabulary: updatedBrainScore.domainScores.vocabulary,
        drills_completed: (existingHistory.drills_completed || 0) + 1,
      })
      .eq('id', existingHistory.id);
  } else {
    await supabase
      .from('brain_score_history')
      .insert({
        user_id: userId,
        period_type: 'daily',
        period_start: today,
        overall_score: updatedBrainScore.overallScore,
        processing_speed: updatedBrainScore.domainScores.processingSpeed,
        working_memory: updatedBrainScore.domainScores.workingMemory,
        attention: updatedBrainScore.domainScores.attention,
        flexibility: updatedBrainScore.domainScores.flexibility,
        vocabulary: updatedBrainScore.domainScores.vocabulary,
        games_played: 0,
        drills_completed: 1,
      });
  }

  const DRILL_XP_BASE: Record<number, number> = { 1: 30, 2: 30, 3: 50, 4: 80, 5: 80 };
  const baseXp = DRILL_XP_BASE[level] ?? 30;
  const comboEstimate = Math.min(10, Math.floor(score / 100));
  const comboMultiplier = 1 + comboEstimate * 0.1;
  const xpToAward = Math.min(Math.round(baseXp * comboMultiplier), 150);
  let xpAwarded = 0;

  if (xpToAward > 0) {
    const { data: xpData, error: xpError } = await supabase.rpc('increment_player_xp', {
      p_player_id: userId,
      p_xp_amount: xpToAward,
    });

    if (xpError) {
      console.error('Error awarding drill XP:', xpError);
    } else if (xpData && xpData.length > 0) {
      xpAwarded = xpData[0].xp_granted ?? xpToAward;
    } else {
      xpAwarded = xpToAward;
    }
  }

  getPostHogServer()?.capture({
    distinctId: userId,
    event: 'drill_completed',
    properties: {
      drill_type: drillType,
      level,
      score,
      words_found: wordsFound,
      xp_awarded: xpAwarded,
      cognitive_domain: targetDomain,
      source: ctx.source,
    },
  });

  const previousLevel = priorSnapshot?.level ?? 1;
  const levelPromoted = nextProgress.level > previousLevel;

  // "You got better" signals for the results screen. priorSnapshot is the
  // progress BEFORE this run; the current run's session row is already inserted
  // above, so exclude it by id when reading the immediately-previous score.
  let lastSessionScore: number | null = null;
  try {
    const { data: priorSessions } = await supabase
      .from('drill_sessions')
      .select('score')
      .eq('user_id', userId)
      .eq('drill_type', drillType)
      .neq('id', sessionData.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (Array.isArray(priorSessions) && priorSessions.length > 0) {
      lastSessionScore = priorSessions[0]?.score ?? null;
    }
  } catch {
    /* non-fatal — improvement just omits the vs-last signal */
  }
  const improvement = computeDrillImprovement(
    priorSnapshot
      ? {
          highScore: priorSnapshot.highScore,
          totalPlays: priorSnapshot.totalPlays,
          totalScore: priorSnapshot.totalScore,
        }
      : null,
    score,
    lastSessionScore,
  );

  // Fire-and-forget: mark brainDrills quest slot complete for today
  import('@/backend/modules/dailyMissionsManager').then(({ completeMissionForMode }) => {
    completeMissionForMode(userId, 'brainDrills').catch(() => {});
  });

  return {
    ok: true,
    body: {
      success: true,
      data: sessionData,
      brainScore: updatedBrainScore,
      xpAwarded,
      levelPromoted,
      newLevel: nextProgress.level,
      previousLevel,
      improvement,
    },
  };
}
