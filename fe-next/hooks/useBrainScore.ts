'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type {
  BrainScore,
  BrainScoreWithDomains,
  CognitiveDomains,
  DrillProgress,
  TrendDirection,
  GameCognitiveScore,
} from '@/shared/types/cognitive';
import { getTierFromScore, calculateTierProgress } from '@/utils/cognitiveScoring';
import logger from '@/utils/logger';

// Internal state including hasFetched for tracking
interface UseBrainScoreInternalState {
  brainScore: BrainScoreWithDomains | null;
  drillProgress: DrillProgress[];
  recentGameScores: GameCognitiveScore[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean; // Internal: Track if we've done initial fetch
}

// Public state exposed by the hook (excludes internal tracking fields)
interface UseBrainScoreState {
  brainScore: BrainScoreWithDomains | null;
  drillProgress: DrillProgress[];
  recentGameScores: GameCognitiveScore[];
  isLoading: boolean;
  error: string | null;
}

interface UseBrainScoreActions {
  refresh: () => Promise<void>;
  initializeBrainScore: () => Promise<void>;
}

export type UseBrainScoreReturn = UseBrainScoreState & UseBrainScoreActions;

/**
 * Calculate trend for a domain based on recent game scores
 */
function calculateDomainTrend(
  recentScores: number[],
  currentAverage: number,
  threshold: number = 5
): TrendDirection {
  if (recentScores.length < 3) return 'stable';

  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const diff = recentAvg - currentAverage;

  if (diff > threshold) return 'improving';
  if (diff < -threshold) return 'declining';
  return 'stable';
}

/**
 * Transform raw brain score data to BrainScoreWithDomains format
 */
function transformToBrainScoreWithDomains(
  rawScore: BrainScore,
  recentGameScores: GameCognitiveScore[]
): BrainScoreWithDomains {
  // Get recent scores for each domain (last 5 games)
  const recentSpeed = recentGameScores.slice(0, 5).map(s => s.processingSpeed);
  const recentMemory = recentGameScores.slice(0, 5).map(s => s.workingMemory);
  const recentAttention = recentGameScores.slice(0, 5).map(s => s.attention);
  const recentFlexibility = recentGameScores.slice(0, 5).map(s => s.flexibility);
  const recentVocabulary = recentGameScores.slice(0, 5).map(s => s.vocabulary);

  const domains: CognitiveDomains = {
    processingSpeed: {
      score: rawScore.processingSpeed,
      trend: calculateDomainTrend(recentSpeed, rawScore.processingSpeed),
    },
    workingMemory: {
      score: rawScore.workingMemory,
      trend: calculateDomainTrend(recentMemory, rawScore.workingMemory),
    },
    attention: {
      score: rawScore.attention,
      trend: calculateDomainTrend(recentAttention, rawScore.attention),
    },
    flexibility: {
      score: rawScore.flexibility,
      trend: calculateDomainTrend(recentFlexibility, rawScore.flexibility),
    },
    vocabulary: {
      score: rawScore.vocabulary,
      trend: calculateDomainTrend(recentVocabulary, rawScore.vocabulary),
    },
  };

  const {
    processingSpeed,
    workingMemory,
    attention,
    flexibility,
    vocabulary,
    ...rest
  } = rawScore;

  return {
    ...rest,
    domains,
  };
}

/**
 * Hook for accessing and managing brain training scores
 *
 * Provides:
 * - Overall brain score with tier info
 * - Individual domain scores with trends
 * - Drill progress for each drill type
 * - Recent game cognitive scores for trend calculation
 */
export function useBrainScore(): UseBrainScoreReturn {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  const [state, setState] = useState<UseBrainScoreInternalState>({
    brainScore: null,
    drillProgress: [],
    recentGameScores: [],
    isLoading: true,
    error: null,
    hasFetched: false,
  });

  const isMounted = useRef(true);
  const isFetching = useRef(false); // Prevent concurrent fetches
  const hasFetchedRef = useRef(false); // Track if initial fetch is done (use ref to avoid stale closure)
  const lastUserId = useRef<string | null>(null); // Track user ID to detect changes

  // Fetch brain score data from Supabase
  const fetchBrainScore = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !user) {
      hasFetchedRef.current = true;
      setState(prev => ({
        ...prev,
        brainScore: null,
        drillProgress: [],
        recentGameScores: [],
        isLoading: false,
        error: null,
        hasFetched: true,
      }));
      lastUserId.current = null;
      return;
    }

    // Prevent concurrent fetches
    if (isFetching.current && !forceRefresh) {
      return;
    }

    // Skip if already fetched for this user (unless force refresh)
    const userChanged = lastUserId.current !== user.id;
    if (hasFetchedRef.current && !userChanged && !forceRefresh) {
      return;
    }

    try {
      isFetching.current = true;
      lastUserId.current = user.id;

      // Only show loading if we don't have data yet (first load)
      // This prevents flickering on subsequent fetches
      if (!hasFetchedRef.current) {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      // Fetch brain score, drill progress, and recent game scores in parallel
      const [brainScoreResult, drillProgressResult, recentScoresResult] = await Promise.all([
        supabase
          .from('brain_scores')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('drill_progress')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('game_cognitive_scores')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (!isMounted.current) return;

      // Transform recent game scores (used for both brain score calculation and state)
      const recentGameScores: GameCognitiveScore[] = (recentScoresResult.data ?? []).map(row => ({
        id: row.id,
        userId: row.user_id,
        gameSessionId: row.game_session_id,
        processingSpeed: row.processing_speed,
        workingMemory: row.working_memory,
        attention: row.attention,
        flexibility: row.flexibility,
        vocabulary: row.vocabulary,
        wordsPerMinute: row.words_per_minute,
        avgWordLength: row.avg_word_length,
        maxCombo: row.max_combo,
        uniqueWordLengths: row.unique_word_lengths,
        rareWordCount: row.rare_word_count,
        legendaryWordCount: row.legendary_word_count,
        hintsUsed: row.hints_used,
        gridSize: row.grid_size,
        gameDurationSeconds: row.game_duration_seconds,
        createdAt: row.created_at,
      }));

      // Handle brain score - might not exist yet
      let brainScore: BrainScoreWithDomains | null = null;
      if (brainScoreResult.data) {
        const rawScore: BrainScore = {
          id: brainScoreResult.data.id,
          userId: brainScoreResult.data.user_id,
          overallScore: brainScoreResult.data.overall_score,
          processingSpeed: brainScoreResult.data.processing_speed,
          workingMemory: brainScoreResult.data.working_memory,
          attention: brainScoreResult.data.attention,
          flexibility: brainScoreResult.data.flexibility,
          vocabulary: brainScoreResult.data.vocabulary,
          tier: brainScoreResult.data.tier,
          tierProgress: brainScoreResult.data.tier_progress,
          gamesAnalyzed: brainScoreResult.data.games_analyzed,
          drillsCompleted: brainScoreResult.data.drills_completed,
          currentStreak: brainScoreResult.data.current_streak,
          longestStreak: brainScoreResult.data.longest_streak,
          lastActivityAt: brainScoreResult.data.last_activity_at,
          createdAt: brainScoreResult.data.created_at,
          updatedAt: brainScoreResult.data.updated_at,
        };

        brainScore = transformToBrainScoreWithDomains(rawScore, recentGameScores);
      }

      // Transform drill progress
      const drillProgress: DrillProgress[] = (drillProgressResult.data ?? []).map(row => ({
        id: row.id,
        userId: row.user_id,
        drillType: row.drill_type,
        level: row.level,
        highScore: row.high_score,
        totalPlays: row.total_plays,
        totalScore: row.total_score,
        avgScore: row.avg_score,
        lastPlayedAt: row.last_played_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      hasFetchedRef.current = true;
      setState({
        brainScore,
        drillProgress,
        recentGameScores,
        isLoading: false,
        error: null,
        hasFetched: true,
      });
    } catch (err) {
      logger.error('Error fetching brain score:', err);
      hasFetchedRef.current = true;
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load brain score data',
          hasFetched: true,
        }));
      }
    } finally {
      isFetching.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, supabase]);

  // Initialize brain score for new users
  const initializeBrainScore = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('brain_scores')
        .upsert({
          user_id: user.id,
          overall_score: 0,
          processing_speed: 0,
          working_memory: 0,
          attention: 0,
          flexibility: 0,
          vocabulary: 0,
          tier: 'novice',
          tier_progress: 0,
          games_analyzed: 0,
          drills_completed: 0,
          current_streak: 0,
          longest_streak: 0,
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true,
        });

      if (error) {
        logger.error('Error initializing brain score:', error);
      } else {
        // Refresh to get the new data
        await fetchBrainScore();
      }
    } catch (err) {
      logger.error('Error initializing brain score:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, fetchBrainScore]);

  // Refresh function - forces a fresh fetch
  const refresh = useCallback(async () => {
    await fetchBrainScore(true);
  }, [fetchBrainScore]);

  // Fetch on mount and when auth changes
  // Wait for auth to finish loading to prevent multiple fetches during auth initialization
  useEffect(() => {
    isMounted.current = true;

    // Don't fetch while auth is still loading - this prevents flickering
    if (authLoading) {
      return;
    }

    fetchBrainScore();

    return () => {
      isMounted.current = false;
    };
  }, [fetchBrainScore, authLoading]);

  // Destructure to exclude hasFetched from return value
  const { hasFetched: _, ...publicState } = state;

  return {
    ...publicState,
    refresh,
    initializeBrainScore,
  };
}

export default useBrainScore;
