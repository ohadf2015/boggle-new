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
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
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
      // Local JWT verify on this read path (no Auth round-trip per hub load).
      const user = await getAuthedUser(request);
      if (!user || user.id !== userId) {
        return NextResponse.json({ ...DEFAULT_STATUS, loading: false }, { status: 401 });
      }

      // Reads go through the admin client, filtered by the VERIFIED id.
      // A user-scoped read of the attempt tables misses rows the player cannot
      // select, and longest would come back as 0.
      const supabase = createAdminClient() ?? (await createRequestClient(request)).supabase;

      // A failed read must not answer "nothing played, streak 0": the client
      // would offer a replay and drop the streak. Throw → 500 → client keeps what it has.
      const dates = ({ data, error }: { data: { puzzle_date: string }[] | null; error: unknown }) => {
        if (error) throw error;
        return data?.map((r) => r.puzzle_date) ?? [];
      };

      // Fetch all attempts across modes (NO is_catchup)
      const [huntRows, wheelRows, towerRows, connectionRows, freezeCount] = await Promise.all([
        supabase
          .from('daily_word_hunt_attempts')
          .select('puzzle_date')
          .eq('player_id', userId)
          .eq('is_catchup', false)
          .then(dates),
        supabase
          .from('daily_word_wheel_attempts')
          .select('puzzle_date')
          .eq('player_id', userId)
          .eq('is_catchup', false)
          .then(dates),
        supabase
          .from('daily_word_tower_attempts')
          .select('puzzle_date')
          .eq('player_id', userId)
          .then(dates),
        supabase
          .from('connections_daily_scores')
          .select('puzzle_date')
          .eq('player_id', userId)
          .then(dates),
        supabase
          .from('profiles')
          .select('streak_freeze_count')
          .eq('id', userId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) throw error;
            const count = (data as { streak_freeze_count?: unknown } | null)?.streak_freeze_count;
            return typeof count === 'number' ? count : 0;
          }),
      ]);

      const allDates = Array.from(new Set([...huntRows, ...wheelRows, ...connectionRows])).sort();

      // Apply freeze bridge: if today is played and yesterday is missing but day-before is played, bridge yesterday
      const freezeBridgeDate = freezeDateToBridge(allDates, today, freezeCount);
      const withBridge = freezeBridgeDate
        ? Array.from(new Set([...allDates, freezeBridgeDate])).sort()
        : allDates;

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
        freezeCount,
        loading: false,
        fromServer: true,
      };

      // Returned on every GET while the bridge holds (nothing here consumes the
      // freeze); the client shows the toast once per bridged date.
      if (freezeBridgeDate) {
        response.freezeApplied = {
          date: freezeBridgeDate,
          freezesRemaining: Math.max(0, freezeCount - 1),
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
