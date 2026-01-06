import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';
import type { DrillType } from '@/shared/types/cognitive';

interface DrillSubmitRequest {
  drillType: DrillType;
  level: number;
  score: number;
  durationSeconds: number;
  wordsFound: number;
  domainScoreEarned?: number;
  extraData?: Record<string, unknown>;
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

    return NextResponse.json({
      success: true,
      data: sessionData,
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
