/**
 * Streak Sync API
 *
 * GET  — Fetch server-side streak data for authenticated user
 * POST — Record a win and sync streak to server
 *
 * Bridges the client-side useWinStreak hook to the player_engagement table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { captureApiError } from '@/utils/sentry';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * GET /api/streak — Fetch current streak data from server
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = checkApiRateLimit(request, 'streak-get', {
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createServiceClient(config.url, config.key);
    const { data: engagement } = await supabase
      .from('player_engagement')
      .select('current_streak, longest_streak, last_login_date, streak_freezes_available, streak_protected_until')
      .eq('player_id', user.id)
      .single();

    if (!engagement) {
      return NextResponse.json({
        currentStreak: 0,
        bestStreak: 0,
        lastWinDate: null,
        freezesAvailable: 1,
      });
    }

    // Check if streak is still active (same logic as client but canonical)
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreak = engagement.current_streak;
    const lastLogin = engagement.last_login_date;

    // If last login was before yesterday and no protection, streak is broken
    if (lastLogin && lastLogin !== today && lastLogin !== yesterdayStr) {
      const isProtected = engagement.streak_protected_until &&
        new Date(engagement.streak_protected_until) >= new Date(today);
      if (!isProtected) {
        currentStreak = 0;
      }
    }

    return NextResponse.json({
      currentStreak,
      bestStreak: engagement.longest_streak || 0,
      lastWinDate: engagement.last_login_date,
      freezesAvailable: engagement.streak_freezes_available || 0,
    });
  } catch (error) {
    captureApiError(error as Error, 'streak-get');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/streak — Record a win and sync streak
 *
 * Body: { action: 'recordWin' | 'merge', localData?: { currentStreak, bestStreak, totalWins, lastWinDate } }
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = checkApiRateLimit(request, 'streak-post', {
      maxRequests: 20,
      windowMs: 60_000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const { action, localData } = body;

    const supabase = createServiceClient(config.url, config.key);
    const today = new Date().toISOString().split('T')[0];

    if (action === 'recordWin') {
      // Fetch current engagement
      const { data: engagement } = await supabase
        .from('player_engagement')
        .select('current_streak, longest_streak, last_login_date, streak_freezes_available, total_sessions')
        .eq('player_id', user.id)
        .single();

      if (!engagement) {
        // Create new engagement record
        const { error: insertError } = await supabase.from('player_engagement').insert({
          player_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_login_date: today,
          last_played_at: new Date().toISOString(),
        });
        if (insertError) {
          console.error('Error creating engagement record:', insertError);
          return NextResponse.json({ error: 'Failed to create streak' }, { status: 500 });
        }
        return NextResponse.json({
          currentStreak: 1,
          bestStreak: 1,
          alreadyWonToday: false,
        });
      }

      // Already won today
      if (engagement.last_login_date === today) {
        return NextResponse.json({
          currentStreak: engagement.current_streak,
          bestStreak: engagement.longest_streak,
          alreadyWonToday: true,
        });
      }

      // Calculate new streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak: number;
      if (engagement.last_login_date === yesterdayStr) {
        newStreak = engagement.current_streak + 1;
      } else if (
        engagement.streak_freezes_available > 0 &&
        engagement.last_login_date
      ) {
        // Auto-use freeze if gap is small
        newStreak = engagement.current_streak + 1;
        const { error: freezeError } = await supabase.from('player_engagement')
          .update({ streak_freezes_available: engagement.streak_freezes_available - 1 })
          .eq('player_id', user.id);
        if (freezeError) {
          console.error('Error decrementing streak freeze:', freezeError);
        }
      } else {
        newStreak = 1;
      }

      const bestStreak = Math.max(newStreak, engagement.longest_streak || 0);

      const { error: updateError } = await supabase.from('player_engagement').update({
        current_streak: newStreak,
        longest_streak: bestStreak,
        last_login_date: today,
        last_played_at: new Date().toISOString(),
      }).eq('player_id', user.id);

      if (updateError) {
        console.error('Error updating streak:', updateError);
        return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 });
      }

      return NextResponse.json({
        currentStreak: newStreak,
        bestStreak,
        alreadyWonToday: false,
      });
    }

    if (action === 'merge' && localData) {
      // Merge localStorage data on login — take the max of each field
      const { data: engagement } = await supabase
        .from('player_engagement')
        .select('current_streak, longest_streak, last_login_date, streak_freezes_available')
        .eq('player_id', user.id)
        .single();

      const serverStreak = engagement?.current_streak || 0;
      const serverBest = engagement?.longest_streak || 0;

      const mergedStreak = Math.max(serverStreak, localData.currentStreak || 0);
      const mergedBest = Math.max(serverBest, localData.bestStreak || 0);

      if (!engagement) {
        const { error: mergeInsertError } = await supabase.from('player_engagement').insert({
          player_id: user.id,
          current_streak: mergedStreak,
          longest_streak: mergedBest,
          last_login_date: localData.lastWinDate?.split('T')[0] || today,
          last_played_at: new Date().toISOString(),
        });
        if (mergeInsertError) {
          console.error('Error inserting merged engagement:', mergeInsertError);
          return NextResponse.json({ error: 'Failed to merge streak' }, { status: 500 });
        }
      } else {
        const { error: mergeUpdateError } = await supabase.from('player_engagement').update({
          current_streak: mergedStreak,
          longest_streak: mergedBest,
          last_played_at: new Date().toISOString(),
        }).eq('player_id', user.id);
        if (mergeUpdateError) {
          console.error('Error updating merged engagement:', mergeUpdateError);
          return NextResponse.json({ error: 'Failed to merge streak' }, { status: 500 });
        }
      }

      return NextResponse.json({
        currentStreak: mergedStreak,
        bestStreak: mergedBest,
        lastWinDate: engagement?.last_login_date || localData.lastWinDate,
        freezesAvailable: engagement?.streak_freezes_available || 0,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    captureApiError(error as Error, 'streak-post');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
