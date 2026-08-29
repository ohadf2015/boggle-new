'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import nextDynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import AutoHideHeader from '@/components/AutoHideHeader';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import SinglePlayerGame from './SinglePlayerGame';
import { getHighScore } from './highScoreManager';
import { recordGameResult } from '@/utils/playerStats';
import { useGameMusic, type GamePhase } from '@/hooks/useGameMusic';
import { useMusic } from '@/contexts/MusicContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useFeatureUnlockNotifications } from '@/hooks/useFeatureUnlockNotifications';
import { incrementTrainingGames } from '@/utils/playerProgressStorage';
import { markBotsGamePlayed } from '@/utils/onboardingStorage';
import { awardCreatorCoins } from '@/utils/creatorRewards';
import type { DifficultyLevel, Language, LetterGrid } from '@/shared/types/game';
import { getCurrentSeasonDynamic } from '@/lib/seasons';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { getOfflineStore } from '@/lib/offline';
import { enqueueScore } from '@/lib/offline/scoreQueue';
import { safeRandomUUID } from '@/lib/safeRandomUUID';
import { useAchievementQueue } from '@/components/achievements';
import { useSinglePlayerConfig } from './useSinglePlayerConfig';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import PracticeBadge from '@/components/practice/PracticeBadge';

// Off the LCP-critical path (phase 'playing' renders SinglePlayerGame only) —
// deferred so results/tutorial JS (framer-motion, ads, confetti) doesn't block first paint.
const SinglePlayerResults = nextDynamic(() => import('./SinglePlayerResults'), { ssr: false });
const PracticeResults = nextDynamic(() => import('./results/PracticeResults'), { ssr: false });
const PreGameTutorial = nextDynamic(() => import('./PreGameTutorial'), { ssr: false });

export type SinglePlayerMode = 'solo-bots' | 'practice' | 'challenge';
export type SinglePlayerPhase = 'pre-game' | 'playing' | 'results';

export interface BotOpponent {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  wordsFound: string[];
}

export interface SinglePlayerGameState {
  mode: SinglePlayerMode;
  difficulty: DifficultyLevel;
  language: Language;
  grid: LetterGrid | null;
  timerSeconds: number;
  bots: BotOpponent[];
  minWordLength: number; // Minimum word length (2 for EASY, 3 for others)
}

export interface PlayerWordData {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number;
  isValid: boolean;
  comboBonus?: number;
  fireRoundBonus?: number; // Extra points from 2x fire round multiplier
}

export interface SinglePlayerAchievement {
  key: string;
  icon: string;
}

export interface SinglePlayerResultsData {
  playerScore: number;
  playerWords: string[];
  playerWordData: PlayerWordData[]; // Word data with timing for insights
  gameDuration: number; // Game duration in seconds for pace calculation
  botScores: Array<{ name: string; score: number; words: string[] }>;
  grid: LetterGrid;
  allPossibleWords: string[];
  isNewHighScore: boolean;
  previousHighScore?: number | null; // For showing improvement
  isNewAllTimeBest?: boolean; // For extra celebration
  achievements?: SinglePlayerAchievement[]; // Achievements earned (not saved to profile)
  botWordsForValidation?: string[]; // Bot words to show in validation modal
  gameSessionId?: string; // Unique session ID for vote tracking
  language?: Language; // Game language
  maxCombo?: number; // Highest combo reached in this game
}

interface SinglePlayerViewProps {
  preset?: string;
  embedded?: boolean;
}

/**
 * SinglePlayerView - Main orchestrator for single player modes
 * Handles state transitions between lobby, playing, and results phases
 */
const SinglePlayerView: React.FC<SinglePlayerViewProps> = ({
  preset,
  embedded = false,
}) => {
  const { language: uiLanguage, t } = useLanguage();
  const searchParams = useSearchParams();
  const isPractice = usePracticeFlag();

  const {
    phase, setPhase,
    gameState, setGameState,
    returnTo, boardCode,
    handleTutorialComplete,
    handlePlayAgain,
    handleQuickRematch,
    handleBackToLobby,
  } = useSinglePlayerConfig({ searchParams, presetOverride: preset });

  const setIsInGame = useHideNavigation();
  const { user, isAuthenticated } = useAuth();
  const { online } = useNetworkState();
  const offlineFlag = useOfflineModeFlag();
  const { queueAchievement } = useAchievementQueue();
  const [resultsData, setResultsData] = useState<SinglePlayerResultsData | null>(null);
  const [sessionId] = useState(() => `sp_${safeRandomUUID()}`);

  // Show feature unlock notifications when user reaches milestones
  useFeatureUnlockNotifications();

  // Track the current isInGame value to prevent redundant updates
  const isInGameRef = useRef(false);
  const isMountedRef = useRef(true);

  // Hide bottom navigation during gameplay and pre-game tutorial (skip when
  // embedded inline on a landing page so the site nav stays visible).
  useEffect(() => {
    if (embedded) return;
    const shouldBeInGame = phase === 'pre-game' || phase === 'playing' || phase === 'results';
    if (isMountedRef.current && isInGameRef.current !== shouldBeInGame) {
      isInGameRef.current = shouldBeInGame;
      setIsInGame(shouldBeInGame);
    }
  }, [phase, setIsInGame, embedded]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (!embedded) setIsInGame(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded]);

  // Map SinglePlayerPhase to GamePhase for the music hook
  const musicPhase: GamePhase = (phase === 'playing' || phase === 'pre-game') ? 'waiting' : phase;

  useGameMusic({
    phase: musicPhase,
    enabled: phase !== 'playing',
  });

  // Pull-to-refresh - disabled during gameplay
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => { window.location.reload(); },
    threshold: 60,
    enabled: phase !== 'playing',
  });

  // Auto-redirect to daily challenge after game ends when returnTo=daily
  useEffect(() => {
    if (phase === 'results' && returnTo === 'daily' && resultsData) {
      const timer = setTimeout(() => {
        window.location.href = `/${uiLanguage}/daily`;
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, returnTo, resultsData, uiLanguage]);

  // Get current high score for challenge mode
  const currentHighScore = useMemo(() => {
    if (gameState.mode !== 'challenge') return null;
    return getHighScore(gameState.difficulty, gameState.timerSeconds);
  }, [gameState.mode, gameState.difficulty, gameState.timerSeconds]);

  const handleGameEnd = useCallback((results: SinglePlayerResultsData) => {
    incrementTrainingGames();

    // Flip returning-player flag so next /singleplayer?autoStart=bots entry
    // routes to Quick Play instead of replaying the FTUE bots flow.
    if (gameState.mode === 'solo-bots') {
      markBotsGamePlayed();
    }

    const longestWord = (results.playerWords || []).reduce(
      (longest, word) => word.length > (longest?.length || 0) ? word : longest,
      ''
    );

    const validWords = results.playerWordData?.filter(w => w.isValid) || [];
    const totalAttempts = results.playerWordData?.length || 0;
    const accuracy = totalAttempts > 0 ? Math.round((validWords.length / totalAttempts) * 100) : 0;
    const avgWordLength = validWords.length > 0
      ? validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length
      : 0;
    const totalComboBonus = validWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0);
    const totalFireRoundBonus = validWords.reduce((sum, w) => sum + (w.fireRoundBonus || 0), 0);

    const highScoreResult = recordGameResult({
      mode: gameState.mode,
      score: results.playerScore,
      wordCount: (results.playerWords || []).length,
      longestWord,
      difficulty: gameState.difficulty,
      durationSeconds: gameState.timerSeconds,
      accuracy,
      comboBonus: totalComboBonus,
      fireRoundBonus: totalFireRoundBonus,
      averageWordLength: avgWordLength,
      achievementCount: results.achievements?.length || 0,
    });

    results.isNewHighScore = highScoreResult.isNewHighScore;
    results.previousHighScore = highScoreResult.previousBest;
    results.isNewAllTimeBest = highScoreResult.isNewAllTimeBest;

    // Practice mode: skip all reward writes (XP, leaderboard, creator coins, achievements)
    if (isPractice) {
      setResultsData(results);
      setPhase('results');
      return;
    }

    // Sync stats + XP to Supabase for authenticated users.
    // Offline + flag on: enqueue for /api/scores/sync. Achievement/quest
    // toasts won't fire offline; the sync.adjusted toast reconciles on
    // reconnect. localStorage stats (recordGameResult above) already saved.
    if (isAuthenticated && user?.id) {
      const recordPayload = {
        score: results.playerScore,
        wordCount: (results.playerWords || []).length,
        words: (results.playerWords || []).map((w: { word?: string } | string) =>
          typeof w === 'string' ? w : (w.word ?? '')
        ).filter((w: string) => w),
        language: gameState.language,
        longestWord,
        timePlayed: results.gameDuration,
        achievementCount: results.achievements?.length || 0,
        mode: gameState.mode,
        maxCombo: results.maxCombo ?? 0,
        longWordsFound: (results.playerWords || []).filter(w => w.length >= 6).length,
      };

      if (offlineFlag && !online) {
        void (async () => {
          const store = await getOfflineStore();
          await enqueueScore(store, 'sp', recordPayload);
        })().catch(err => console.warn('[SP] offline enqueue failed', err));
      } else {
        fetch('/api/stats/record-game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recordPayload),
        })
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data.lifetimeAchievements)) {
              for (const achievement of data.lifetimeAchievements) {
                if (achievement?.key) queueAchievement(achievement);
              }
            }
            if (data.questUpdate?.completed) {
              import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
                showQuestCompletionToast({
                  questName: t(data.questUpdate.description),
                  xpReward: data.questUpdate.xpReward,
                  dedupKey: `weekly:${data.questUpdate.questType ?? data.questUpdate.description}`,
                  t,
                });
              });
            }
          })
          .catch(() => { /* non-critical — localStorage is the fallback */ });
      }
    }

    if (boardCode) {
      awardCreatorCoins('BOARD_PLAYED', { boardCode });
      fetch(`/api/ugc/boards/${boardCode}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: results.playerScore, words_found: (results.playerWords || []).length }),
      }).catch(() => { /* non-critical */ });
    }

    setResultsData(results);
    setPhase('results');
}, [gameState.mode, gameState.difficulty, gameState.timerSeconds, gameState.language, boardCode, setPhase, isAuthenticated, user?.id, queueAchievement, isPractice, online, offlineFlag, t]);

  // Subtle seasonal ambience behind the board during play — atmosphere only,
  // sits below the grid (relative children) and never touches tile readability.
  const seasonSkin = useMemo(() => getCurrentSeasonDynamic().gridSkinClass, []);

  // When embedded on a landing page, "back to lobby" should restart the same
  // round in-place instead of navigating away from the marketing page.
  const onBackToLobby = useCallback(() => {
    if (embedded) {
      handlePlayAgain();
    } else {
      handleBackToLobby();
    }
  }, [embedded, handlePlayAgain, handleBackToLobby]);

  return (
    <div
      className={`flex flex-col bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy relative ${phase === 'playing' ? `h-full overflow-hidden ${seasonSkin}` : 'min-h-full'}`}
      {...(embedded ? {} : pullToRefreshHandlers)}
    >
      {!embedded && phase === 'results' && (
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={60}
        />
      )}

      {!embedded && <AutoHideHeader />}

      {phase === 'pre-game' && (
        <PreGameTutorial onComplete={handleTutorialComplete} sessionId={sessionId} />
      )}

      <div className={`w-full px-2 sm:px-3 lg:px-4 landscape-content overflow-x-hidden ${phase === 'playing' ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
        {phase === 'playing' && isPractice && (
          <div className="absolute top-3 right-3 z-30 pointer-events-none">
            <PracticeBadge />
          </div>
        )}
        {phase === 'playing' && (
          <SinglePlayerGame
            settings={gameState}
            targetHighScore={currentHighScore?.score || null}
            onGameEnd={handleGameEnd}
            onQuit={onBackToLobby}
          />
        )}

        {phase === 'results' && resultsData && resultsData.playerWordData && (
          <>
            {gameState.mode === 'practice' ? (
              <PracticeResults
                // Stable fallback — a Date.now() key is recomputed on every
                // render, remounting the results view mid-animation. The results
                // phase already unmounts between games, so a constant is enough.
                key={resultsData.gameSessionId || 'results'}
                results={resultsData}
                onPlayAgain={handlePlayAgain}
                onBackToLobby={onBackToLobby}
              />
            ) : (
              <SinglePlayerResults
                // Stable fallback — a Date.now() key is recomputed on every
                // render, remounting the results view mid-animation. The results
                // phase already unmounts between games, so a constant is enough.
                key={resultsData.gameSessionId || 'results'}
                results={resultsData}
                mode={gameState.mode}
                onPlayAgain={handlePlayAgain}
                onQuickRematch={handleQuickRematch}
                onBackToLobby={onBackToLobby}
              />
            )}
            {returnTo === 'daily' && (
              <div className="fixed bottom-[calc(1rem+var(--admob-banner-height,0px))] left-1/2 -translate-x-1/2 z-50">
                <div className="bg-neo-orange text-neo-black px-4 py-2 rounded-full shadow-hard-sm border-2 border-neo-black text-sm font-medium animate-pulse">
                  {t('daily.trainingSuggestion.redirecting')}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function SinglePlayerViewWithErrorBoundary({ preset, embedded }: SinglePlayerViewProps) {
  return (
    <FeatureErrorBoundary featureName="Single Player" showHomeButton={true}>
      <SinglePlayerView preset={preset} embedded={embedded} />
    </FeatureErrorBoundary>
  );
}

export default SinglePlayerViewWithErrorBoundary;
