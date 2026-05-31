/**
 * API Route: /api/admin/game-logs
 * Admin endpoint for fetching paginated game logs from game_results table
 * GET: Fetch game logs with filters and pagination
 * Only accessible to admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { mapAnalyticsEventToGame, isNudgePhantomRow, type AnalyticsEventRow } from '@/lib/admin/gameLog/analyticsEventMapper';
import { CANONICAL_MODE_BUCKETS, unbucketedModes } from '@/lib/admin/gameLog/modeBuckets';
import { groupGames, type GameGroup } from '@/lib/admin/gameLog/groupGames';
import type { GameProfile } from '@/components/admin/today-games/types';

type ProfileEmbed = unknown;

interface GameResultRow {
  id: string;
  player_id: string | null;
  game_code: string | null;
  score: number | null;
  word_count: number | null;
  longest_word: string | null;
  placement: number | null;
  is_ranked: boolean | null;
  language: string | null;
  time_played: number | null;
  created_at: string;
  game_mode: string | null;
  profiles: ProfileEmbed;
}

interface WordFoundEntry {
  word?: string;
  timestamp?: number;
}

interface GameSessionRow {
  id: string;
  guest_session_id: string | null;
  mode: string | null;
  language: string | null;
  score: number | null;
  words_found: WordFoundEntry[] | null;
  room_code: string | null;
  final_rank: number | null;
  duration_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  completed: boolean | null;
  difficulty: string | null;
  device_type: string | null;
  browser: string | null;
  country: string | null;
  referrer_source: string | null;
  is_first_game: boolean | null;
  player_count: number | null;
  tokens_earned: number | null;
  tokens_spent: number | null;
  clues_used: number | null;
  life_gained: number | null;
}

interface GuestSessionRow {
  session_id: string;
  device_type: string | null;
  browser: string | null;
  country: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  first_visit_at: string;
  last_visit_at: string;
  user_id: string | null;
  linked_at: string | null;
}

interface WordHuntAttemptRow {
  id: string;
  player_id: string | null;
  guest_fingerprint: string | null;
  language: string | null;
  puzzle_number: number | null;
  solved: boolean | null;
  attempts_used: number | null;
  target_word: string | null;
  words_discovered: WordFoundEntry[] | null;
  efficiency_score: number | null;
  completed_at: string | null;
  created_at: string;
  profiles: ProfileEmbed;
}

interface DailyPuzzleAttemptRow {
  id: string;
  player_id: string | null;
  guest_fingerprint: string | null;
  puzzle_number: number | null;
  language: string | null;
  score: number | null;
  word_count: number | null;
  time_seconds: number | null;
  longest_word: string | null;
  completed_at: string;
  profiles: ProfileEmbed;
}

interface DrillSessionRow {
  id: string;
  user_id: string | null;
  drill_type: string | null;
  level: number | null;
  score: number | null;
  duration_seconds: number | null;
  words_found: number | null;
  domain_score_earned: number | null;
  created_at: string;
  profiles: ProfileEmbed;
}

interface BlastResultRow {
  id: string;
  user_id: string | null;
  score: number | null;
  tiles_cleared: number | null;
  total_tiles: number | null;
  clear_percentage: number | null;
  words_found: number | null;
  best_word: string | null;
  max_combo: number | null;
  stars: number | null;
  difficulty: string | null;
  language: string | null;
  created_at: string | null;
  profiles: ProfileEmbed;
}

interface WordWheelAttemptRow {
  id: string;
  player_id: string | null;
  guest_fingerprint: string | null;
  language: string;
  puzzle_number: number;
  score: number;
  word_count: number;
  time_seconds: number;
  longest_word: string | null;
  completed_at: string;
  created_at: string;
  display_name: string | null;
  profiles: ProfileEmbed;
}

interface PracticeSessionRow {
  id: string;
  student_id: string;
  classroom_id: string | null;
  lesson_id: string;
  practice_type: string;
  score: number;
  total_score: number;
  words_attempted: number;
  words_correct: number;
  cards_correct: number;
  cards_reviewed: number;
  accuracy: number | null;
  max_combo: number | null;
  time_spent_seconds: number;
  duration_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  profiles: ProfileEmbed;
}

/**
 * GET - Fetch game logs with filters and pagination
 * Includes both authenticated player games (from game_results) and guest games (from game_sessions)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const language = searchParams.get('language');
    const isRanked = searchParams.get('isRanked');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const ALLOWED_SORT_COLUMNS = ['created_at', 'score', 'word_count', 'placement', 'game_mode', 'language'];
    const sortBy = ALLOWED_SORT_COLUMNS.includes(searchParams.get('sortBy') ?? '') ? searchParams.get('sortBy')! : 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    // includeGuests=false also hides fully-anonymous games (user_id NULL). Default: include everyone.
    const includeGuests = searchParams.get('includeGuests') !== 'false';
    // gameType narrows which source(s) we query. When omitted, every source is fetched and merged client-side.
    const ALLOWED_GAME_TYPES = [
      'multiplayer', 'word_hunt', 'daily_challenge', 'drill',
      'blast', 'word_wheel', 'practice',
    ] as const;
    type GameTypeParam = typeof ALLOWED_GAME_TYPES[number];
    const rawGameType = searchParams.get('gameType') ?? 'all';
    const gameType: GameTypeParam | 'all' = (ALLOWED_GAME_TYPES as readonly string[]).includes(rawGameType)
      ? (rawGameType as GameTypeParam)
      : 'all';
    const wants = (t: GameTypeParam) => gameType === 'all' || gameType === t;

    // Calculate offset
    const offset = (page - 1) * pageSize;

    const ascending = sortOrder === 'asc';

    // Source selection. 'analytics' (default) reads the comprehensive analytics_events
    // game_completed stream — the ONLY source that captures non-registered players with
    // mode + attribution + device. 'tables' keeps the legacy per-product-table merge.
    const source = searchParams.get('source') === 'tables' ? 'tables' : 'analytics';

    if (source === 'analytics') {
      return await fetchFromAnalyticsEvents({
        supabase, page, pageSize, offset, ascending, language, gameType, startDate, endDate,
      });
    }

    // Build query for game results with player profiles (authenticated users)
    let authGames: Array<Record<string, unknown>> = [];
    let authCount = 0;
    if (wants('multiplayer')) {
      let authQuery = supabase
        .from('game_results')
        .select(`
          id,
          player_id,
          game_code,
          score,
          word_count,
          longest_word,
          placement,
          is_ranked,
          language,
          time_played,
          created_at,
          game_mode,
          profiles:player_id (
            username,
            display_name,
            avatar_emoji,
            avatar_color
          )
        `, { count: 'exact' });

      if (language && language !== 'all') {
        authQuery = authQuery.eq('language', language);
      }
      if (isRanked !== null && isRanked !== 'all') {
        authQuery = authQuery.eq('is_ranked', isRanked === 'true');
      }
      if (startDate) {
        authQuery = authQuery.gte('created_at', startDate);
      }
      if (endDate) {
        authQuery = authQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      authQuery = authQuery.order(sortBy, { ascending });

      const { data: authData, error: authError, count: aCount } = await authQuery;
      if (authError) {
        console.error('[admin/game-logs] Auth query error:', authError);
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
      authCount = aCount || 0;
      authGames = ((authData as unknown as GameResultRow[]) || []).map((game) => ({
        ...game,
        is_guest: false,
        // Prefer the real recorded game mode (classic/word-hunt/blast/wheel-rush/…).
        // Fall back to ranked/casual only when game_mode is absent on legacy rows.
        mode: game.game_mode || (game.is_ranked ? 'ranked' : 'casual'),
        game_mode: game.game_mode ?? null,
        is_multiplayer: true,
        source: 'game_results',
      }));
    }

    // Fetch guest games from game_sessions if includeGuests is true
    let guestGames: Array<Record<string, unknown>> = [];
    let guestCount = 0;

    if (includeGuests && wants('multiplayer')) {
      let guestQuery = supabase
        .from('game_sessions')
        .select(`
          id,
          guest_session_id,
          mode,
          language,
          score,
          words_found,
          room_code,
          final_rank,
          duration_seconds,
          started_at,
          completed_at,
          completed,
          difficulty,
          device_type,
          browser,
          country,
          referrer_source,
          is_first_game,
          player_count,
          tokens_earned,
          tokens_spent,
          clues_used,
          life_gained
        `, { count: 'exact' })
        .is('user_id', null)
        .eq('completed', true);

      // Apply filters to guest query
      if (language && language !== 'all') {
        guestQuery = guestQuery.eq('language', language);
      }

      // Guest games are never ranked
      if (isRanked === 'true') {
        // If filtering for ranked only, don't include guests
        guestGames = [];
        guestCount = 0;
      } else {
        if (startDate) {
          guestQuery = guestQuery.gte('started_at', startDate);
        }

        if (endDate) {
          guestQuery = guestQuery.lte('started_at', `${endDate}T23:59:59.999Z`);
        }

        guestQuery = guestQuery.order('started_at', { ascending });

        const { data: guestData, error: guestError, count: gCount } = await guestQuery;

        if (guestError) {
          console.error('[admin/game-logs] Guest query error:', guestError);
          // Don't fail the whole request if guest query fails
        } else {
          guestCount = gCount || 0;
          const guestSessionRows = ((guestData as unknown as GameSessionRow[]) || []);

          // Pull acquisition metadata (utm + referrer) for these guest sessions in one query
          const sessionIds = guestSessionRows
            .map((g) => g.guest_session_id)
            .filter((id): id is string => Boolean(id));
          const guestMetaBySessionId: Record<string, GuestSessionRow> = {};
          if (sessionIds.length > 0) {
            const { data: guestMetaData } = await supabase
              .from('guest_sessions')
              .select('session_id, device_type, browser, country, utm_source, utm_medium, utm_campaign, referrer, first_visit_at, last_visit_at, user_id, linked_at')
              .in('session_id', sessionIds);
            ((guestMetaData as unknown as GuestSessionRow[]) || []).forEach((row) => {
              guestMetaBySessionId[row.session_id] = row;
            });
          }

          // Transform guest games to match the expected format
          guestGames = guestSessionRows.map((session) => {
            const meta = session.guest_session_id ? guestMetaBySessionId[session.guest_session_id] : undefined;
            return {
              id: session.id,
              player_id: null,
              guest_session_id: session.guest_session_id,
              game_code: session.room_code || 'solo',
              score: session.score || 0,
              word_count: Array.isArray(session.words_found) ? session.words_found.length : 0,
              longest_word: Array.isArray(session.words_found) && session.words_found.length > 0
                ? session.words_found.reduce<string>((longest, w) =>
                    (w.word?.length || 0) > (longest.length || 0) ? (w.word ?? longest) : longest, ''
                  )
                : null,
              placement: session.final_rank,
              is_ranked: false,
              is_guest: true,
              mode: session.mode,
              language: session.language,
              time_played: session.duration_seconds || 0,
              created_at: session.started_at,
              completed_at: session.completed_at,
              profiles: null,
              difficulty: session.difficulty,
              device_type: session.device_type ?? meta?.device_type ?? null,
              browser: session.browser ?? meta?.browser ?? null,
              country: session.country ?? meta?.country ?? null,
              referrer_source: session.referrer_source ?? meta?.referrer ?? null,
              utm_source: meta?.utm_source ?? null,
              utm_medium: meta?.utm_medium ?? null,
              utm_campaign: meta?.utm_campaign ?? null,
              is_first_game: session.is_first_game ?? false,
              player_count: session.player_count ?? null,
              tokens_earned: session.tokens_earned ?? 0,
              tokens_spent: session.tokens_spent ?? 0,
              clues_used: session.clues_used ?? 0,
              life_gained: session.life_gained ?? 0,
              guest_first_visit_at: meta?.first_visit_at ?? null,
              guest_last_visit_at: meta?.last_visit_at ?? null,
            };
          });
        }
      }
    }

    // Fetch Daily Word games from daily_word_hunt_attempts (Wordle-like game)
    let wordHuntGames: Array<Record<string, unknown>> = [];
    let wordHuntCount = 0;

    if (wants('word_hunt')) try {
      let wordHuntQuery = supabase
        .from('daily_word_hunt_attempts')
        .select(`
          id,
          player_id,
          guest_fingerprint,
          language,
          puzzle_number,
          solved,
          attempts_used,
          target_word,
          words_discovered,
          efficiency_score,
          completed_at,
          created_at,
          profiles:player_id (
            username,
            display_name,
            avatar_emoji,
            avatar_color
          )
        `, { count: 'exact' });

      // Apply filters
      if (language && language !== 'all') {
        wordHuntQuery = wordHuntQuery.eq('language', language);
      }

      // Word Hunt games are never ranked
      if (isRanked === 'true') {
        wordHuntGames = [];
        wordHuntCount = 0;
      } else {
        if (startDate) {
          wordHuntQuery = wordHuntQuery.gte('created_at', startDate);
        }

        if (endDate) {
          wordHuntQuery = wordHuntQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
        }

        wordHuntQuery = wordHuntQuery.order('created_at', { ascending });

        const { data: wordHuntData, error: wordHuntError, count: whCount } = await wordHuntQuery;

        if (wordHuntError) {
          console.error('[admin/game-logs] Word Hunt query error:', wordHuntError);
        } else {
          wordHuntCount = whCount || 0;
          wordHuntGames = ((wordHuntData as unknown as WordHuntAttemptRow[]) || []).map((attempt) => {
            // Derive duration from word discovery timestamps
            let timePlayed = 0;
            if (Array.isArray(attempt.words_discovered) && attempt.words_discovered.length > 1) {
              const timestamps = attempt.words_discovered
                .map((w) => w.timestamp)
                .filter((t): t is number => typeof t === 'number');
              if (timestamps.length > 1) {
                timePlayed = Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 1000);
              }
            }

            return {
              id: attempt.id,
              player_id: attempt.player_id,
              guest_session_id: attempt.guest_fingerprint,
              game_code: `daily_word_${attempt.puzzle_number}`,
              score: attempt.efficiency_score || 0,
              word_count: Array.isArray(attempt.words_discovered) ? attempt.words_discovered.length : 0,
              longest_word: attempt.target_word || null,
              placement: null,
              is_ranked: false,
              is_guest: !attempt.player_id,
              mode: 'daily_word',
              solved: attempt.solved,
              attempts_used: attempt.attempts_used,
              language: attempt.language,
              time_played: timePlayed,
              created_at: attempt.created_at,
              profiles: attempt.profiles || null,
            };
          });
        }
      }
    } catch (error) {
      console.error('[admin/game-logs] Word Hunt fetch error:', error);
    }

    // Fetch Daily Challenge games from daily_puzzle_attempts (Word Hunt daily puzzles)
    let dailyChallengeGames: Array<Record<string, unknown>> = [];
    let dailyChallengeCount = 0;

    if (wants('daily_challenge')) try {
      let dailyQuery = supabase
        .from('daily_puzzle_attempts')
        .select(`
          id,
          player_id,
          guest_fingerprint,
          puzzle_number,
          language,
          score,
          word_count,
          time_seconds,
          longest_word,
          completed_at,
          profiles:player_id (
            username,
            display_name,
            avatar_emoji,
            avatar_color
          )
        `, { count: 'exact' });

      // Daily Challenge games are never ranked
      if (isRanked === 'true') {
        dailyChallengeGames = [];
        dailyChallengeCount = 0;
      } else {
        if (startDate) {
          dailyQuery = dailyQuery.gte('completed_at', startDate);
        }

        if (endDate) {
          dailyQuery = dailyQuery.lte('completed_at', `${endDate}T23:59:59.999Z`);
        }

        dailyQuery = dailyQuery.order('completed_at', { ascending });

        const { data: dailyData, error: dailyError, count: dcCount } = await dailyQuery;

        if (dailyError) {
          console.error('[admin/game-logs] Daily Challenge query error:', dailyError);
        } else {
          dailyChallengeCount = dcCount || 0;
          dailyChallengeGames = ((dailyData as unknown as DailyPuzzleAttemptRow[]) || []).map((attempt) => ({
            id: attempt.id,
            player_id: attempt.player_id,
            guest_session_id: attempt.guest_fingerprint,
            game_code: `daily_puzzle_${attempt.puzzle_number}`,
            score: attempt.score || 0,
            word_count: attempt.word_count || 0,
            longest_word: attempt.longest_word || null,
            placement: null,
            is_ranked: false,
            is_guest: !attempt.player_id,
            mode: 'daily_challenge',
            language: attempt.language || 'en',
            time_played: attempt.time_seconds || 0,
            created_at: attempt.completed_at,
            profiles: attempt.profiles || null,
          }));
        }
      }
    } catch (error) {
      console.error('[admin/game-logs] Daily Challenge fetch error:', error);
    }

    // Fetch Brain Training Drill sessions from drill_sessions
    let drillGames: Array<Record<string, unknown>> = [];
    let drillCount = 0;

    if (wants('drill')) try {
      let drillQuery = supabase
        .from('drill_sessions')
        .select(`
          id,
          user_id,
          drill_type,
          level,
          score,
          duration_seconds,
          words_found,
          domain_score_earned,
          created_at,
          profiles:user_id (
            username,
            display_name,
            avatar_emoji,
            avatar_color
          )
        `, { count: 'exact' });

      // Drills are never ranked
      if (isRanked === 'true') {
        drillGames = [];
        drillCount = 0;
      } else {
        if (startDate) {
          drillQuery = drillQuery.gte('created_at', startDate);
        }

        if (endDate) {
          drillQuery = drillQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
        }

        drillQuery = drillQuery.order('created_at', { ascending });

        const { data: drillData, error: drillError, count: dCount } = await drillQuery;

        if (drillError) {
          console.error('[admin/game-logs] Drill sessions query error:', drillError);
        } else {
          drillCount = dCount || 0;
          drillGames = ((drillData as unknown as DrillSessionRow[]) || []).map((session) => ({
            id: session.id,
            player_id: session.user_id,
            guest_session_id: null,
            game_code: `drill_${session.drill_type}_L${session.level}`,
            score: session.score || 0,
            word_count: session.words_found || 0,
            longest_word: null,
            placement: null,
            is_ranked: false,
            is_guest: false,
            mode: 'drill',
            drill_type: session.drill_type,
            drill_level: session.level,
            language: 'en',
            time_played: session.duration_seconds || 0,
            created_at: session.created_at,
            profiles: session.profiles || null,
          }));
        }
      }
    } catch (error) {
      console.error('[admin/game-logs] Drill sessions fetch error:', error);
    }

    // Fetch Blast results (Blast V2 — authenticated only)
    let blastGames: Array<Record<string, unknown>> = [];
    let blastCount = 0;

    if (wants('blast') && isRanked !== 'true') try {
      let blastQuery = supabase
        .from('blast_results')
        .select(`
          id,
          user_id,
          score,
          tiles_cleared,
          total_tiles,
          clear_percentage,
          words_found,
          best_word,
          max_combo,
          stars,
          difficulty,
          language,
          created_at,
          profiles:user_id (
            username,
            display_name,
            avatar_emoji,
            avatar_color
          )
        `, { count: 'exact' });

      if (language && language !== 'all') {
        blastQuery = blastQuery.eq('language', language);
      }
      if (startDate) {
        blastQuery = blastQuery.gte('created_at', startDate);
      }
      if (endDate) {
        blastQuery = blastQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      blastQuery = blastQuery.order('created_at', { ascending });

      const { data: blastData, error: blastError, count: bCount } = await blastQuery;

      if (blastError) {
        console.error('[admin/game-logs] Blast query error:', blastError);
      } else {
        blastCount = bCount || 0;
        blastGames = ((blastData as unknown as BlastResultRow[]) || []).map((b) => ({
          id: b.id,
          player_id: b.user_id,
          guest_session_id: null,
          game_code: `blast_${b.difficulty ?? 'normal'}`,
          score: b.score || 0,
          word_count: b.words_found || 0,
          longest_word: b.best_word || null,
          placement: null,
          is_ranked: false,
          is_guest: !b.user_id,
          mode: 'blast',
          difficulty: b.difficulty,
          language: b.language || 'en',
          time_played: 0,
          created_at: b.created_at || new Date().toISOString(),
          profiles: b.profiles || null,
        }));
      }
    } catch (error) {
      console.error('[admin/game-logs] Blast fetch error:', error);
    }

    // Fetch Word Wheel daily attempts
    let wordWheelGames: Array<Record<string, unknown>> = [];
    let wordWheelCount = 0;

    if (wants('word_wheel') && isRanked !== 'true') try {
      let wheelQuery = supabase
        .from('daily_word_wheel_attempts')
        .select(`
          id,
          player_id,
          guest_fingerprint,
          language,
          puzzle_number,
          score,
          word_count,
          time_seconds,
          longest_word,
          completed_at,
          created_at,
          display_name,
          profiles:player_id (
            username,
            display_name,
            avatar_emoji,
            avatar_color
          )
        `, { count: 'exact' });

      if (language && language !== 'all') {
        wheelQuery = wheelQuery.eq('language', language);
      }
      if (startDate) {
        wheelQuery = wheelQuery.gte('created_at', startDate);
      }
      if (endDate) {
        wheelQuery = wheelQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      wheelQuery = wheelQuery.order('created_at', { ascending });

      const { data: wheelData, error: wheelError, count: wCount } = await wheelQuery;

      if (wheelError) {
        console.error('[admin/game-logs] Word Wheel query error:', wheelError);
      } else {
        wordWheelCount = wCount || 0;
        wordWheelGames = ((wheelData as unknown as WordWheelAttemptRow[]) || []).map((w) => ({
          id: w.id,
          player_id: w.player_id,
          guest_session_id: w.guest_fingerprint,
          game_code: `word_wheel_${w.puzzle_number}`,
          score: w.score || 0,
          word_count: w.word_count || 0,
          longest_word: w.longest_word || null,
          placement: null,
          is_ranked: false,
          is_guest: !w.player_id,
          mode: 'word_wheel',
          language: w.language,
          time_played: w.time_seconds || 0,
          created_at: w.created_at,
          completed_at: w.completed_at,
          profiles: w.profiles || (w.display_name ? { display_name: w.display_name } : null),
        }));
      }
    } catch (error) {
      console.error('[admin/game-logs] Word Wheel fetch error:', error);
    }

    // Fetch Classroom Practice sessions
    let practiceGames: Array<Record<string, unknown>> = [];
    let practiceCount = 0;

    if (wants('practice') && isRanked !== 'true') try {
      let practiceQuery = supabase
        .from('practice_sessions')
        .select(`
          id,
          student_id,
          classroom_id,
          lesson_id,
          practice_type,
          score,
          total_score,
          words_attempted,
          words_correct,
          cards_correct,
          cards_reviewed,
          accuracy,
          max_combo,
          time_spent_seconds,
          duration_seconds,
          started_at,
          completed_at,
          profiles:student_id (
            username,
            display_name,
            avatar_emoji,
            avatar_color
          )
        `, { count: 'exact' });

      if (startDate) {
        practiceQuery = practiceQuery.gte('started_at', startDate);
      }
      if (endDate) {
        practiceQuery = practiceQuery.lte('started_at', `${endDate}T23:59:59.999Z`);
      }
      practiceQuery = practiceQuery.order('started_at', { ascending });

      const { data: practiceData, error: practiceError, count: pCount } = await practiceQuery;

      if (practiceError) {
        console.error('[admin/game-logs] Practice query error:', practiceError);
      } else {
        practiceCount = pCount || 0;
        practiceGames = ((practiceData as unknown as PracticeSessionRow[]) || []).map((p) => ({
          id: p.id,
          player_id: p.student_id,
          guest_session_id: null,
          game_code: `practice_${p.practice_type}`,
          score: p.total_score || p.score || 0,
          word_count: p.words_correct || 0,
          longest_word: null,
          placement: null,
          is_ranked: false,
          is_guest: false,
          mode: 'practice',
          drill_type: p.practice_type,
          language: 'en',
          time_played: p.duration_seconds || p.time_spent_seconds || 0,
          created_at: p.started_at,
          completed_at: p.completed_at,
          profiles: p.profiles || null,
        }));
      }
    } catch (error) {
      console.error('[admin/game-logs] Practice fetch error:', error);
    }

    // Combine and sort all games
    const allGames = [
      ...authGames, ...guestGames, ...wordHuntGames, ...dailyChallengeGames, ...drillGames,
      ...blastGames, ...wordWheelGames, ...practiceGames,
    ].sort((a, b) => {
      const dateA = new Date(String((a as { created_at?: unknown }).created_at ?? '')).getTime();
      const dateB = new Date(String((b as { created_at?: unknown }).created_at ?? '')).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });

    // Calculate total count
    const totalCount = authCount + guestCount + wordHuntCount + dailyChallengeCount + drillCount
      + blastCount + wordWheelCount + practiceCount;

    // Apply pagination to combined results
    const paginatedGames = allGames.slice(offset, offset + pageSize);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      games: paginatedGames,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      breakdown: {
        authenticatedGames: authCount,
        guestGames: guestCount,
        wordHuntGames: wordHuntCount,
        dailyChallengeGames: dailyChallengeCount,
        drillGames: drillCount,
        blastGames: blastCount,
        wordWheelGames: wordWheelCount,
        practiceGames: practiceCount,
      },
    });
  } catch (error) {
    console.error('[admin/game-logs] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

// PostgREST filter builder surface we use — avoids leaking Supabase's huge generic types.
interface PgFilter {
  gte(col: string, val: string): PgFilter;
  lte(col: string, val: string): PgFilter;
  eq(col: string, val: unknown): PgFilter;
  ilike(col: string, val: string): PgFilter;
  in(col: string, vals: readonly string[]): PgFilter;
  or(filters: string): PgFilter;
}

/** Map the UI gameType filter to an analytics_events metadata filter. */
function applyGameTypeFilter(q: PgFilter, gameType: string): PgFilter {
  switch (gameType) {
    // Match the MP stat bucket exactly: flagged MP OR the flagless gameMode='multiplayer' rows.
    case 'multiplayer': return q.or('metadata->>isMultiplayer.eq.true,metadata->>gameMode.eq.multiplayer');
    case 'word_hunt': return q.eq('metadata->>gameMode', 'word-hunt');
    case 'blast': return q.eq('metadata->>gameMode', 'blast');
    case 'word_wheel': return q.eq('metadata->>gameMode', 'wheel-rush');
    case 'daily_challenge': return q.ilike('metadata->>gameMode', '%daily%');
    case 'drill': return q.ilike('metadata->>gameMode', '%drill%');
    case 'practice': return q.ilike('metadata->>gameMode', '%practice%');
    default: return q;
  }
}

/** Max analytics rows pulled into memory for grouping (date-windowed view ≈ a few k). */
const MAX_ANALYTICS_ROWS = 12000;
const FETCH_BATCH = 1000;

/**
 * Comprehensive game log built from analytics_events, GROUPED into one row per game.
 *
 * Why grouped + multi-event: a single game emits one row PER PLAYER PER lifecycle
 * event. The founder wants to investigate a game as a unit (all players, host
 * acquisition, status), so we fetch the date-windowed rows for
 * game_started/game_completed/game_abandoned, map + group them in memory
 * (`groupGames`), then paginate over GROUPS. Host acquisition (`utm_source`,
 * role='host') lives on game_started, and abandonment = started-without-terminal —
 * neither is visible in a completed-only query, which is why we broaden the event
 * set here. At ~15k total rows, in-memory grouping is fine; a Postgres RPC with
 * JSON-path GROUP BY is the 100x scale path (not built).
 */
async function fetchFromAnalyticsEvents(opts: {
  supabase: SupabaseAdmin;
  page: number;
  pageSize: number;
  offset: number;
  ascending: boolean;
  language: string | null;
  gameType: string;
  startDate: string | null;
  endDate: string | null;
}): Promise<NextResponse> {
  // `language` is intentionally omitted — analytics_events has no per-game language.
  const { supabase, page, pageSize, offset, ascending, gameType, startDate, endDate } = opts;

  const applyCommon = (q: PgFilter): PgFilter => {
    // Lifecycle events that define a play. game_started carries host attribution;
    // game_abandoned carries error/quit reasons; game_completed is the terminal.
    let out = q.in('event_type', ['game_started', 'game_completed', 'game_abandoned']);
    if (startDate) out = out.gte('created_at', startDate);
    if (endDate) out = out.lte('created_at', `${endDate}T23:59:59.999Z`);
    out = applyGameTypeFilter(out, gameType);
    return out;
  };

  // Pull the windowed rows in batches (Supabase caps a single response at 1000).
  const rows: AnalyticsEventRow[] = [];
  let truncated = false;
  for (let start = 0; start < MAX_ANALYTICS_ROWS; start += FETCH_BATCH) {
    const builder = supabase
      .from('analytics_events')
      .select('id, event_type, player_id, session_id, country_code, utm_source, utm_medium, utm_campaign, referrer, created_at, metadata');
    applyCommon(builder as unknown as PgFilter);
    const { data, error } = await builder
      .order('created_at', { ascending: false })
      .range(start, start + FETCH_BATCH - 1);
    if (error) {
      console.error('[admin/game-logs] analytics query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const batch = (data as unknown as AnalyticsEventRow[]) || [];
    rows.push(...batch);
    if (batch.length < FETCH_BATCH) break;
    if (start + FETCH_BATCH >= MAX_ANALYTICS_ROWS) truncated = true;
  }
  if (truncated) {
    console.warn(`[admin/game-logs] analytics fetch hit ${MAX_ANALYTICS_ROWS}-row cap; narrow the date range for complete coverage.`);
  }

  // Batch-join profiles for any rows that resolve to a registered player.
  const playerIds = Array.from(
    new Set(
      rows
        .map((r) => r.player_id ?? (typeof r.metadata?.userId === 'string' ? (r.metadata.userId as string) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const profileById: Record<string, GameProfile> = {};
  for (let i = 0; i < playerIds.length; i += FETCH_BATCH) {
    const slice = playerIds.slice(i, i + FETCH_BATCH);
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji, avatar_color, avatar_config')
      .in('id', slice);
    ((profs as unknown as Array<GameProfile & { id: string }>) || []).forEach((p) => {
      profileById[p.id] = p;
    });
  }

  // Drop MP signup-nudge phantom `game_completed` rows (no score/wordCount/MP
  // flag) — they would otherwise render as phantom solo 0/0 games and corrupt
  // the game-log word/score counts. Covers historical data already in the table.
  const games = rows
    .filter((r) => !isNudgePhantomRow(r))
    .map((r) => {
      const pid = r.player_id ?? (typeof r.metadata?.userId === 'string' ? (r.metadata.userId as string) : null);
      return mapAnalyticsEventToGame(r, pid ? profileById[pid] ?? null : null);
    });

  // Collapse per-player/per-event rows into one group per game.
  let groups: GameGroup[] = groupGames(games);
  if (ascending) groups = [...groups].reverse(); // groupGames sorts createdAt desc

  const totalCount = groups.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageGroups = groups.slice(offset, offset + pageSize);

  // Per-type counts at the GROUP level (the "correct" stats the founder wants).
  const bucketCounts = CANONICAL_MODE_BUCKETS.map((b) => {
    const count = b.multiplayer
      ? groups.filter((g) => g.isMultiplayer).length
      : groups.filter((g) => !g.isMultiplayer && g.typeBucket === b.key).length;
    return { key: b.key, labelKey: b.labelKey, label: b.label, count };
  });
  const mpBucket = bucketCounts.find((b) => b.key === 'multiplayer');

  // Gap guard: surface raw modes that have no type bucket so new modes can't rot silently.
  const unbucketed = unbucketedModes(games.map((g) => g.mode));

  return NextResponse.json({
    success: true,
    source: 'analytics',
    grouped: true,
    gameGroups: pageGroups,
    unbucketedModes: unbucketed,
    truncated,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    modeBreakdown: bucketCounts,
    breakdown: {
      authenticatedGames: mpBucket?.count ?? 0,
      guestGames: 0,
      wordHuntGames: bucketCounts.find((b) => b.key === 'wordHunt')?.count ?? 0,
      dailyChallengeGames: 0,
      drillGames: 0,
      blastGames: bucketCounts.find((b) => b.key === 'blast')?.count ?? 0,
      wordWheelGames: bucketCounts.find((b) => b.key === 'wordWheel')?.count ?? 0,
      practiceGames: 0,
    },
  });
}
