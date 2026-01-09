import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';
import { DRILL_DOMAINS, type DrillType, type CognitiveDomain } from '@/shared/types/cognitive';
import {
  calculateRollingAverage,
  calculateOverallScore,
  getTierFromScore,
  calculateTierProgress,
} from '@/utils/cognitiveScoring';

interface DrillSubmitRequest {
  drillType: DrillType;
  level: number;
  score: number;
  durationSeconds: number;
  wordsFound: number;
  domainScoreEarned?: number;
  extraData?: Record<string, unknown>;
}

// Expected max scores per drill level (used for normalization)
const DRILL_LEVEL_MAX_SCORES: Record<number, number> = {
  1: 500,
  2: 750,
  3: 1000,
  4: 1500,
  5: 2000,
};

/**
 * Convert drill score to cognitive domain score (0-100)
 * Takes into account the drill level for proper normalization
 */
function calculateDomainScoreFromDrill(score: number, level: number): number {
  const maxScore = DRILL_LEVEL_MAX_SCORES[level] ?? DRILL_LEVEL_MAX_SCORES[1];
  // Normalize to 0-100, with level bonus (higher levels are harder)
  const levelBonus = (level - 1) * 5; // Levels 2-5 get 5-20 bonus points
  const baseScore = Math.min(100, (score / maxScore) * 80); // Max 80 from raw score
  return Math.min(100, Math.round(baseScore + levelBonus));
}

/**
 * POST /api/drills/submit
 * Submit a drill session result
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: DrillSubmitRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { drillType, level, score, durationSeconds, wordsFound, domainScoreEarned, extraData } = body;

    if (!drillType || !level || score === undefined || durationSeconds === undefined || wordsFound === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: drillType, level, score, durationSeconds, wordsFound' },
        { status: 400 }
      );
    }

    const validDrillTypes: DrillType[] = [
      'lightning-round',
      'memory-hunt',
      'combo-master',
      'pattern-switcher',
      'rare-gems',
    ];

    if (!validDrillTypes.includes(drillType)) {
      return NextResponse.json({ error: 'Invalid drill type' }, { status: 400 });
    }

    if (level < 1 || level > 5) {
      return NextResponse.json({ error: 'Level must be between 1 and 5' }, { status: 400 });
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from('drill_sessions')
      .insert({
        user_id: user.id,
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
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to save drill result' }, { status: 500 });
    }

    const { data: progressData, error: progressError } = await supabase
      .from('drill_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('drill_type', drillType)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching drill progress:', progressError);
    }

    if (progressData) {
      const newHighScore = Math.max(progressData.high_score || 0, score);
      const newTotalPlays = (progressData.total_plays || 0) + 1;
      const newTotalScore = (progressData.total_score || 0) + score;
      const newAvgScore = Math.round(newTotalScore / newTotalPlays);

      const { error: updateError } = await supabase
        .from('drill_progress')
        .update({
          high_score: newHighScore,
          total_plays: newTotalPlays,
          total_score: newTotalScore,
          avg_score: newAvgScore,
          last_played_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', progressData.id);

      if (updateError) {
        console.error('Error updating drill progress:', updateError);
      }
    } else {
      const { error: insertError } = await supabase
        .from('drill_progress')
        .insert({
          user_id: user.id,
          drill_type: drillType,
          level,
          high_score: score,
          total_plays: 1,
          total_score: score,
          avg_score: score,
          last_played_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating drill progress:', insertError);
      }
    }

    // =====================================================
    // Update Brain Scores based on drill performance
    // =====================================================
    const targetDomain = DRILL_DOMAINS[drillType];
    const domainScore = calculateDomainScoreFromDrill(score, level);

    // Update the domain_score_earned in drill_sessions
    await supabase
      .from('drill_sessions')
      .update({ domain_score_earned: domainScore })
      .eq('id', sessionData.id);

    // Fetch current brain score
    const { data: currentBrainScore } = await supabase
      .from('brain_scores')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let updatedBrainScore;

    if (currentBrainScore) {
      // Update existing brain score with new domain score
      const currentDomainScores: Record<CognitiveDomain, number> = {
        processingSpeed: currentBrainScore.processing_speed,
        workingMemory: currentBrainScore.working_memory,
        attention: currentBrainScore.attention,
        flexibility: currentBrainScore.flexibility,
        vocabulary: currentBrainScore.vocabulary,
      };

      // Calculate new domain score using rolling average
      // For drills, use games_analyzed + drills_completed as the count
      const totalActivities = (currentBrainScore.games_analyzed || 0) + (currentBrainScore.drills_completed || 0);
      const newDomainScore = calculateRollingAverage(
        currentDomainScores[targetDomain],
        domainScore,
        totalActivities
      );

      // Update the specific domain
      currentDomainScores[targetDomain] = newDomainScore;

      // Recalculate overall score
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
        .eq('user_id', user.id);

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
      // Create new brain score with only the target domain set
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
          user_id: user.id,
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

    // Update brain_score_history using UPSERT to handle multiple activities per day
    const today = new Date().toISOString().split('T')[0];
    const { data: existingHistory } = await supabase
      .from('brain_score_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_type', 'daily')
      .eq('period_start', today)
      .single();

    if (existingHistory) {
      // Update existing history entry for today
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
      // Insert new history entry for today
      await supabase
        .from('brain_score_history')
        .insert({
          user_id: user.id,
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

    return NextResponse.json({
      success: true,
      data: sessionData,
      brainScore: updatedBrainScore,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Unexpected error in drill submit:', err);
    captureApiError(err, '/api/drills/submit', {
      method: 'POST',
      statusCode: 500,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
