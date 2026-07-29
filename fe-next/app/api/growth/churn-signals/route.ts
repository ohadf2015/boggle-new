/**
 * Churn Signals API
 *
 * POST — Report churn signal data from the client
 *        Computes a risk score and stores it for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getBearerUser } from '@/lib/auth/getBearerUser';

function getSupabaseAdmin() {
  return createAdminClient()!;
}

/**
 * Signal weights for churn risk scoring. Derived from the raw engagement
 * metrics the client actually reports (see hooks/useChurnSignals.ts).
 */
const SIGNAL_WEIGHTS = {
  short_session: 20, // avg session length below SHORT_SESSION_SECONDS
  low_games_per_session: 15, // at most LOW_GAMES games this session
  notification_dismissals: 15, // more than DISMISSAL_THRESHOLD dismissals
  no_social_interactions: 20, // zero social interactions
} as const;

const SHORT_SESSION_SECONDS = 60;
const LOW_GAMES = 1;
const DISMISSAL_THRESHOLD = 3;

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

function getRiskLevel(score: number): RiskLevel {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'medium';
  return 'low';
}

/** Payload reported by useChurnSignals.buildPayload(). */
interface ChurnSignals {
  userId?: string;
  avgSessionLengthSeconds?: number;
  gamesPerSession?: number;
  socialInteractions?: number;
  notificationDismissals?: number;
}

/** Coerce an unknown numeric field to a finite number, defaulting to 0. */
function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * POST /api/growth/churn-signals
 * Report session engagement metrics and receive a computed churn risk score.
 *
 * Body: {
 *   userId?: string,
 *   avgSessionLengthSeconds?: number,
 *   gamesPerSession?: number,
 *   socialInteractions?: number,
 *   notificationDismissals?: number,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getBearerUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ChurnSignals = await req.json();

    const avgSessionLengthSeconds = num(body.avgSessionLengthSeconds);
    const gamesPerSession = num(body.gamesPerSession);
    const socialInteractions = num(body.socialInteractions);
    const notificationDismissals = num(body.notificationDismissals);

    // Compute risk score from the reported engagement metrics.
    let riskScore = 0;
    if (avgSessionLengthSeconds < SHORT_SESSION_SECONDS) {
      riskScore += SIGNAL_WEIGHTS.short_session;
    }
    if (gamesPerSession <= LOW_GAMES) {
      riskScore += SIGNAL_WEIGHTS.low_games_per_session;
    }
    if (notificationDismissals > DISMISSAL_THRESHOLD) {
      riskScore += SIGNAL_WEIGHTS.notification_dismissals;
    }
    if (socialInteractions === 0) {
      riskScore += SIGNAL_WEIGHTS.no_social_interactions;
    }

    riskScore = Math.min(riskScore, 100);
    const riskLevel = getRiskLevel(riskScore);

    // Upsert one row per (user, day). Columns/onConflict must match the
    // churn_signals table (migration 20260322700000): user_id + signal_date,
    // not player_id. A column mismatch previously failed every write with 500.
    const signalDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { error: insertErr } = await getSupabaseAdmin()
      .from('churn_signals')
      .upsert(
        {
          user_id: user.id,
          signal_date: signalDate,
          avg_session_length_seconds: Math.round(avgSessionLengthSeconds),
          games_per_session: gamesPerSession,
          social_interactions: Math.round(socialInteractions),
          notification_dismissals: Math.round(notificationDismissals),
          risk_score: riskScore,
          risk_level: riskLevel,
        },
        { onConflict: 'user_id,signal_date' }
      );

    if (insertErr) {
      console.error('[API] churn-signals POST error:', insertErr.message);
      return NextResponse.json({ error: 'Failed to store churn signal' }, { status: 500 });
    }

    return NextResponse.json({
      riskScore,
      riskLevel,
      breakdown: {
        shortSession: avgSessionLengthSeconds < SHORT_SESSION_SECONDS ? SIGNAL_WEIGHTS.short_session : 0,
        lowGamesPerSession: gamesPerSession <= LOW_GAMES ? SIGNAL_WEIGHTS.low_games_per_session : 0,
        notificationDismissals: notificationDismissals > DISMISSAL_THRESHOLD ? SIGNAL_WEIGHTS.notification_dismissals : 0,
        noSocialInteractions: socialInteractions === 0 ? SIGNAL_WEIGHTS.no_social_interactions : 0,
      },
    });
  } catch (error) {
    console.error('[API] churn-signals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
