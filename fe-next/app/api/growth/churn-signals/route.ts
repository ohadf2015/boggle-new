/**
 * Churn Signals API
 *
 * POST — Report churn signal data from the client
 *        Computes a risk score and stores it for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

/**
 * Signal weights for churn risk scoring
 */
const SIGNAL_WEIGHTS: Record<string, number> = {
  declining_session_length: 20,
  low_games_per_session: 15,
  notification_dismissals: 15,
  streak_freeze_used: 10,
  no_social_interactions: 20,
  score_plateau: 20,
};

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

function getRiskLevel(score: number): RiskLevel {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'medium';
  return 'low';
}

interface ChurnSignals {
  decliningSessionLength?: boolean;
  lowGamesPerSession?: boolean;
  notificationDismissals?: number;
  streakFreezeUsed?: boolean;
  noSocialInteractionsDays?: number;
  scorePlateau?: boolean;
}

/**
 * POST /api/growth/churn-signals
 * Report churn signal data and receive computed risk score
 *
 * Body: {
 *   decliningSessionLength?: boolean,
 *   lowGamesPerSession?: boolean,
 *   notificationDismissals?: number,
 *   streakFreezeUsed?: boolean,
 *   noSocialInteractionsDays?: number,
 *   scorePlateau?: boolean,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ChurnSignals = await req.json();

    // Compute risk score
    let riskScore = 0;

    if (body.decliningSessionLength) {
      riskScore += SIGNAL_WEIGHTS.declining_session_length;
    }

    if (body.lowGamesPerSession) {
      riskScore += SIGNAL_WEIGHTS.low_games_per_session;
    }

    if (body.notificationDismissals != null && body.notificationDismissals > 3) {
      riskScore += SIGNAL_WEIGHTS.notification_dismissals;
    }

    if (body.streakFreezeUsed) {
      riskScore += SIGNAL_WEIGHTS.streak_freeze_used;
    }

    if (body.noSocialInteractionsDays != null && body.noSocialInteractionsDays >= 7) {
      riskScore += SIGNAL_WEIGHTS.no_social_interactions;
    }

    if (body.scorePlateau) {
      riskScore += SIGNAL_WEIGHTS.score_plateau;
    }

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    const riskLevel = getRiskLevel(riskScore);

    // Store the signal
    const { error: insertErr } = await supabaseAdmin
      .from('churn_signals')
      .upsert(
        {
          player_id: user.id,
          risk_score: riskScore,
          risk_level: riskLevel,
          signals: {
            declining_session_length: body.decliningSessionLength ?? false,
            low_games_per_session: body.lowGamesPerSession ?? false,
            notification_dismissals: body.notificationDismissals ?? 0,
            streak_freeze_used: body.streakFreezeUsed ?? false,
            no_social_interactions_days: body.noSocialInteractionsDays ?? 0,
            score_plateau: body.scorePlateau ?? false,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id' }
      );

    if (insertErr) {
      console.error('[API] churn-signals POST error:', insertErr.message);
      return NextResponse.json({ error: 'Failed to store churn signal' }, { status: 500 });
    }

    return NextResponse.json({
      riskScore,
      riskLevel,
      breakdown: {
        decliningSessionLength: body.decliningSessionLength ? SIGNAL_WEIGHTS.declining_session_length : 0,
        lowGamesPerSession: body.lowGamesPerSession ? SIGNAL_WEIGHTS.low_games_per_session : 0,
        notificationDismissals: (body.notificationDismissals ?? 0) > 3 ? SIGNAL_WEIGHTS.notification_dismissals : 0,
        streakFreezeUsed: body.streakFreezeUsed ? SIGNAL_WEIGHTS.streak_freeze_used : 0,
        noSocialInteractions: (body.noSocialInteractionsDays ?? 0) >= 7 ? SIGNAL_WEIGHTS.no_social_interactions : 0,
        scorePlateau: body.scorePlateau ? SIGNAL_WEIGHTS.score_plateau : 0,
      },
    });
  } catch (error) {
    console.error('[API] churn-signals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
