/**
 * GET /api/brain/memory-insights — honest week-over-week Memory Hunt insights.
 *
 * Reads real rows from drill_sessions (words found) and brain_score_history
 * (working-memory domain score), buckets them into this-week vs last-week, and
 * returns the deltas. No fabrication: the UI turns these numbers into sentences.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';
import { computeMemoryInsights, type WeekWindow } from '@/shared/utils/memoryInsights';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function windowFromSessions(rows: { words_found: number | null }[]): WeekWindow {
  const sessions = rows.length;
  if (sessions === 0) return { sessions: 0, avgWordsFound: 0 };
  const total = rows.reduce((sum, r) => sum + (r.words_found ?? 0), 0);
  return { sessions, avgWordsFound: total / sessions };
}

function avgScore(rows: { working_memory: number | null }[]): number {
  const vals = rows.map(r => r.working_memory ?? 0).filter(v => v > 0);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    const thisWeekStart = new Date(now - WEEK_MS);
    const lastWeekStart = new Date(now - 2 * WEEK_MS);

    const [sessionsRes, historyRes] = await Promise.all([
      supabase
        .from('drill_sessions')
        .select('words_found, created_at')
        .eq('user_id', user.id)
        .eq('drill_type', 'memory-hunt')
        .gte('created_at', lastWeekStart.toISOString()),
      supabase
        .from('brain_score_history')
        .select('working_memory, period_start')
        .eq('user_id', user.id)
        .eq('period_type', 'daily')
        .gte('period_start', lastWeekStart.toISOString().slice(0, 10)),
    ]);

    const sessions = sessionsRes.data ?? [];
    const history = historyRes.data ?? [];

    const thisWeekSessions = sessions.filter(r => new Date(r.created_at) >= thisWeekStart);
    const lastWeekSessions = sessions.filter(r => new Date(r.created_at) < thisWeekStart);

    const thisWeekHistory = history.filter(r => new Date(r.period_start) >= thisWeekStart);
    const lastWeekHistory = history.filter(r => new Date(r.period_start) < thisWeekStart);

    const insights = computeMemoryInsights({
      thisWeek: windowFromSessions(thisWeekSessions),
      lastWeek: windowFromSessions(lastWeekSessions),
      memoryScore: {
        thisWeek: avgScore(thisWeekHistory),
        lastWeek: avgScore(lastWeekHistory),
      },
    });

    return NextResponse.json(insights);
  } catch (error) {
    const err = error as Error;
    captureApiError(err, '/api/brain/memory-insights', { method: 'GET', statusCode: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
