/**
 * GET /api/daily/status
 *
 * Unified daily challenge status endpoint for all modes + streak.
 * Returns one source of truth for played state and streak across all devices.
 *
 * For authed users: server-authoritative, skeletons until resolved
 * For guests: localStorage-backed, immediate return
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRequestClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { computeCurrentStreak } from '@/lib/daily/weeklyChest';
import { freezeDateToBridge } from '@/lib/daily/chestFreezeBridge';
import { computeLongestConsecutiveStreak } from './longestStreakCalculator';

export interface DailyPlayedStatus {
  today: {
    wordHunt: boolean;
    wordWheel: boolean;
    wordTower: boolean;
    connections: boolean;
  };
  streak: {
    current: number;
    longest: number;
  };
  allCompletedDates: string[];
  freezeCount: number;
  freezeApplied?: {
    date: string;
    freezesRemaining: number;
  };
  loading: boolean;
  fromServer: boolean;
}

const DEFAULT_STATUS: DailyPlayedStatus = {
  today: { wordHunt: false, wordWheel: false, wordTower: false, connections: false },
  streak: { current: 0, longest: 0 },
  allCompletedDates: [],
  freezeCount: 0,
  loading: false,
  fromServer: false,
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const today = getDailyChallengeDate();
    const userId = request.nextUrl.searchParams.get('userId');
    const guestFingerprint = request.nextUrl.searchParams.get('fingerprint');

    if (!userId && !guestFingerprint) {
      return NextResponse.json({ ...DEFAULT_STATUS, loading: false }, { status: 401 });
    }

    // Authed user
    if (userId) {
      // Request-scoped client: the browser client (`@/lib/supabase`) has no
      // cookies on the server, so it saw every caller as anonymous and 401'd
      // every logged-in player — the results CTA then sat on its skeleton.
      const { supabase: requestClient, token } = await createRequestClient(request);
      const {
        data: { user },
        error: authError,
      } = await requestClient.auth.getUser(token ?? undefined);

      if (authError || !user || user.id !== userId) {
        return NextResponse.json({ ...DEFAULT_STATUS, loading: false }, { status: 401 });
      }

      // Reads go through the admin client, filtered by the VERIFIED id.
      // A user-scoped read of the attempt tables misses rows the player cannot
      // select, and longest would come back as 0.
      const supabase = createAdminClient() ?? requestClient;

      // Fetch all attempts across modes (NO is_catchup)
      const [huntRows, wheelRows, towerRows, connectionRows, freezeCount] = await Promise.all([
        supabase
          .from('daily_word_hunt_attempts')
          .select('puzzle_date')
          .eq('player_id', userId)
          .eq('is_catchup', false)
          .then(({ data }) => data?.map((r) => r.puzzle_date) ?? []),
        supabase
          .from('daily_word_wheel_attempts')
          .select('puzzle_date')
          .eq('player_id', userId)
          .eq('is_catchup', false)
          .then(({ data }) => data?.map((r) => r.puzzle_date) ?? []),
        supabase
          .from('daily_word_tower_attempts')
          .select('puzzle_date')
          .eq('player_id', userId)
          .then(({ data }) => data?.map((r) => r.puzzle_date) ?? []),
        supabase
          .from('connections_daily_scores')
          .select('puzzle_date')
          .eq('player_id', userId)
          .then(({ data }) => data?.map((r) => r.puzzle_date) ?? []),
        supabase
          .from('profiles')
          .select('streak_freeze_count')
          .eq('id', userId)
          .single()
          .then(({ data }) => data?.streak_freeze_count ?? 0),
      ]);

      const allDates = Array.from(new Set([...huntRows, ...wheelRows, ...connectionRows])).sort();

      // Apply freeze bridge: if today is played and yesterday is missing but day-before is played, bridge yesterday
      const freezeBridgeDate = freezeDateToBridge(allDates, today, typeof freezeCount === 'number' ? freezeCount : 0);
      const withBridge = freezeBridgeDate
        ? Array.from(new Set([...allDates, freezeBridgeDate])).sort()
        : allDates;

      // Track if freeze was just applied so we can toast it
      let freezeApplied: { date: string; freezesRemaining: number } | undefined = undefined;
      if (freezeBridgeDate && freezeCount > 0) {
        freezeApplied = { date: freezeBridgeDate, freezesRemaining: freezeCount - 1 };
      }

      // Longest streak comes from the attempt rows already fetched above.
      // `daily_puzzle_streaks` is not in prod (015 never landed) and its repo
      // shape has no `completed_dates` column, so that read 404'd and longest
      // stayed 0. Tower dates are included: they were already loaded, and a
      // tower-only history is still a daily history. Current streak keeps the
      // older hunt/wheel/connections set (allDates) — that split is pre-existing.
      const historyDates = Array.from(
        new Set([...huntRows, ...wheelRows, ...towerRows, ...connectionRows]),
      );
      const longestStreak = computeLongestConsecutiveStreak(historyDates);

      // Build the response
      const response: DailyPlayedStatus = {
        today: {
          wordHunt: huntRows.includes(today),
          wordWheel: wheelRows.includes(today),
          wordTower: towerRows.includes(today),
          connections: connectionRows.includes(today),
        },
        streak: {
          current: computeCurrentStreak(withBridge, today),
          longest: longestStreak,
        },
        allCompletedDates: withBridge,
        freezeCount: typeof freezeCount === 'number' ? freezeCount : 0,
        loading: false,
        fromServer: true,
      };

      // If freeze was applied, include that info for the toast
      if (freezeBridgeDate) {
        const remainingFreezes = (typeof freezeCount === 'number' ? freezeCount : 0) - 1;
        response.freezeApplied = {
          date: freezeBridgeDate,
          freezesRemaining: Math.max(0, remainingFreezes),
        };
      }

      return NextResponse.json<DailyPlayedStatus>(response);
    }

    // Guest user: NEVER call server, return default
    // Clients will backfill from localStorage immediately
    return NextResponse.json({ ...DEFAULT_STATUS, fromServer: false });
  } catch (error) {
    console.error('[daily/status] error:', error);
    return NextResponse.json({ ...DEFAULT_STATUS }, { status: 500 });
  }
}
