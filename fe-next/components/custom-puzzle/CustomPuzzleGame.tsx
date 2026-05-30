'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { ArrowLeft, Share2, Trophy, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import Link from 'next/link';
import DailyWordHuntSurvival from '@/components/daily/DailyWordHuntSurvival';
import type { SurvivalGameResult } from '@/components/daily/survival';
import { buildPuzzleShareUrl, type LeaderboardEntry } from '@/utils/customPuzzle';
import { PageLoader } from '@/components/ui/PageLoader';
import {
  useCustomPuzzlePhase,
  useCustomPuzzlePuzzle,
  useCustomPuzzleError,
  useCustomPuzzleGameResult,
  useCustomPuzzleLeaderboard,
  useCustomPuzzlePlayerRank,
  useCustomPuzzleBeatCreator,
  useCustomPuzzleActions,
  useCustomPuzzleStore,
} from '@/hooks/customPuzzleState';

interface CustomPuzzleGameProps {
  puzzleCode: string;
}

const CustomPuzzleGame: React.FC<CustomPuzzleGameProps> = ({ puzzleCode }) => {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();

  // Zustand store selectors - components only re-render when subscribed state changes
  const phase = useCustomPuzzlePhase();
  const puzzle = useCustomPuzzlePuzzle();
  const error = useCustomPuzzleError();
  const gameResult = useCustomPuzzleGameResult();
  const leaderboard = useCustomPuzzleLeaderboard();
  const playerRank = useCustomPuzzlePlayerRank();
  const beatCreator = useCustomPuzzleBeatCreator();
  const {
    setPhase,
    setPuzzle,
    setError,
    setGameResult,
    setLeaderboard,
    setPlayerRank,
    setBeatCreator,
  } = useCustomPuzzleActions();
  // Select resetAll directly from store for stable ref (useCustomPuzzleActions returns a new object each render)
  const resetAll = useCustomPuzzleStore((s) => s.resetAll);

  // Local state for fingerprint (not game state)
  const [fingerprint, setFingerprint] = React.useState<string | null>(null);

  // Get display name — memoized to prevent handleGameComplete recreation on auth context re-renders
  const displayName = useMemo(
    () => profile?.display_name || user?.email?.split('@')[0] || 'Player',
    [profile?.display_name, user?.email]
  );

  // Reset store when puzzle code changes or on mount
  useEffect(() => {
    resetAll();
    return () => {
      // Cleanup on unmount
      resetAll();
    };
  }, [puzzleCode, resetAll]);

  // Get fingerprint for guest users
  useEffect(() => {
    if (!user) {
      getGuestFingerprint().then(setFingerprint);
    }
  }, [user]);

  // Fetch puzzle data
  useEffect(() => {
    async function fetchPuzzle() {
      try {
        const response = await fetch(`/api/custom-puzzle/${puzzleCode}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || t('common.errorOccurred'));
          setPhase('loading');
          return;
        }

        setPuzzle(data.puzzle);
        setPhase('intro');
      } catch (err) {
        console.error('Error fetching puzzle:', err);
        setError(t('common.errorOccurred'));
      }
    }

    fetchPuzzle();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t changes on language load, causing unnecessary refetch
  }, [puzzleCode, setError, setPhase, setPuzzle]);

  // Handle game completion
  const handleGameComplete = useCallback(async (result: SurvivalGameResult) => {
    // Defensive validation - ensure result has required fields
    if (!result || typeof result !== 'object') {
      console.error('[CustomPuzzle] Invalid game result received');
      return;
    }

    setGameResult(result);
    setPhase('results');

    if (!puzzle) return;

    // Submit attempt to server
    try {
      // Safely get wordsDiscovered count with fallback
      const wordsDiscoveredCount = Array.isArray(result.wordsDiscovered)
        ? result.wordsDiscovered.length
        : 0;

      const submitResponse = await fetch(`/api/custom-puzzle/${puzzleCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          guestFingerprint: user ? null : fingerprint,
          solved: result.solved ?? false,
          attemptsUsed: result.attemptsUsed ?? 0,
          wordsDiscovered: wordsDiscoveredCount,
          lifeRemaining: result.lifeRemaining ?? 0,
        }),
      });

      const submitData = await submitResponse.json();
      if (submitData.success) {
        setBeatCreator(submitData.beatCreator);
      }
    } catch (err) {
      console.error('Error submitting attempt:', err);
    }

    // Fetch leaderboard
    try {
      const leaderboardResponse = await fetch(`/api/custom-puzzle/${puzzleCode}/leaderboard`);
      const leaderboardData = await leaderboardResponse.json();

      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.leaderboard);

        // Find player's rank
        const playerEntry = leaderboardData.leaderboard.find(
          (entry: LeaderboardEntry) => entry.displayName === displayName && !entry.isCreator
        );
        if (playerEntry) {
          setPlayerRank(playerEntry.rank);
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  }, [puzzle, puzzleCode, displayName, user, fingerprint, setGameResult, setPhase, setBeatCreator, setLeaderboard, setPlayerRank]);

  // Handle quit
  const handleQuit = useCallback(() => {
    // Return to custom puzzle browser
    window.location.href = `/${language}/custom`;
  }, [language]);

  // Share puzzle
  const handleShare = useCallback(async () => {
    const shareUrl = buildPuzzleShareUrl(puzzleCode, language);
    const shareText = t('customPuzzle.shareText') ||
      `Can you beat my score on this custom word puzzle? ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('customPuzzle.title'),
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed — clipboard fallback
        try { await navigator.clipboard.writeText(shareUrl); } catch { /* not focused */ }
      }
    } else {
      try { await navigator.clipboard.writeText(shareUrl); } catch { /* not focused */ }
    }
  }, [puzzleCode, language, t]);

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
        {error ? (
          <div className="text-center p-8">
            <h2 className="text-xl font-bold text-red-500 mb-4">{error}</h2>
            <Link href={`/${language}/custom`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 me-2 rtl:scale-x-[-1]" />
                {t('common.back')}
              </Button>
            </Link>
          </div>
        ) : (
          <PageLoader text={t('customPuzzle.loading')} />
        )}
      </div>
    );
  }

  // Intro screen
  if (phase === 'intro' && puzzle) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-6 h-6 text-neo-lime" />
            <h1 className="text-2xl font-bold">{t('customPuzzle.title')}</h1>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {t('customPuzzle.createdBy')?.replace('{name}', puzzle.creatorDisplayName) ||
              `Created by ${puzzle.creatorDisplayName}`}
          </p>

          <div className="bg-neo-lime/20 border-2 border-neo-lime rounded-neo p-4 mb-6">
            <p className="text-sm font-medium">
              {t('customPuzzle.creatorScore')}:{' '}
              <span className="font-bold text-neo-navy dark:text-neo-white">
                {puzzle.creatorEfficiencyScore} pts
              </span>
            </p>
            {puzzle.creatorSolved && (
              <p className="text-xs text-gray-500 mt-1">
                {t('customPuzzle.solvedIn')?.replace('{attempts}', String(puzzle.creatorAttemptsUsed)) ||
                  `Solved in ${puzzle.creatorAttemptsUsed} attempts`}
              </p>
            )}
          </div>

          <p className="text-sm text-gray-500 mb-6">
            {t('customPuzzle.challengeDescription') ||
              'Find the hidden word before time runs out. Can you beat the creator?'}
          </p>

          <Button
            onClick={() => setPhase('playing')}
            className="w-full bg-neo-green hover:bg-neo-green/90 text-white font-bold py-3"
          >
            {t('customPuzzle.play')}
          </Button>

          <Link href={`/${language}/custom`} className="block mt-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 me-2 rtl:scale-x-[-1]" />
              {t('common.back')}
            </Button>
          </Link>
        </AdaptiveMotion.div>
      </div>
    );
  }

  // Playing phase
  if (phase === 'playing' && puzzle) {
    return (
      <DailyWordHuntSurvival
        grid={puzzle.grid}
        puzzleNumber={0}
        language={puzzle.language}
        targetWord={puzzle.targetWord}
        onComplete={handleGameComplete}
        onQuit={handleQuit}
      />
    );
  }

  // Results phase
  if (phase === 'results' && puzzle && gameResult) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
        <AdaptiveAnimatePresence mode="wait">
          <AdaptiveMotion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white dark:bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard p-6"
          >
            {/* Mascot - Celebration or encouragement based on result */}
            <div className="flex justify-center mb-4">
              <InteractiveMascot
                variant={gameResult.solved ? 'holding_trophy' : 'encouraging'}
                size="lg"
                animated
                enableHover
                enableClick
              />
            </div>

            {/* Result Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">
                {gameResult.solved
                  ? (t('customPuzzle.solved'))
                  : (t('customPuzzle.failed'))}
              </h2>

              {beatCreator && (
                <AdaptiveMotion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 bg-neo-lime text-neo-black px-4 py-2 rounded-neo font-bold"
                >
                  <Trophy className="w-5 h-5" />
                  {t('customPuzzle.beatCreator')}
                </AdaptiveMotion.div>
              )}
            </div>

            {/* Score Comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-neo-pink/20 border-2 border-neo-pink rounded-neo p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{t('customPuzzle.yourScore')}</p>
                <p className="text-2xl font-bold">{Math.round(gameResult.efficiencyScore)}</p>
              </div>
              <div className="bg-neo-lime/20 border-2 border-neo-lime rounded-neo p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{t('customPuzzle.creatorScore')}</p>
                <p className="text-2xl font-bold">{Math.round(puzzle.creatorEfficiencyScore)}</p>
              </div>
            </div>

            {/* Leaderboard Preview */}
            {leaderboard.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-neo-lime" />
                  {t('customPuzzle.leaderboard')}
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {leaderboard.slice(0, 5).map((entry) => (
                    <div
                      key={`${entry.displayName}-${entry.rank}`}
                      className={`flex items-center justify-between p-2 rounded-neo text-sm ${
                        entry.isCreator
                          ? 'bg-neo-lime/20 border border-neo-lime'
                          : entry.displayName === displayName
                            ? 'bg-neo-pink/20 border border-neo-pink'
                            : 'bg-gray-100 dark:bg-neo-navy'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold w-6">#{entry.rank}</span>
                        <span>{entry.displayName}</span>
                        {entry.isCreator && <Crown className="w-4 h-4 text-neo-lime" />}
                      </div>
                      <span className="font-bold">{Math.round(entry.efficiencyScore)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleShare}
                className="w-full bg-neo-pink hover:bg-neo-pink/90 text-white"
              >
                <Share2 className="w-4 h-4 me-2" />
                {t('customPuzzle.share')}
              </Button>

              <Link href={`/${language}/daily`} className="block">
                <Button variant="outline" className="w-full">
                  {t('customPuzzle.playDaily')}
                </Button>
              </Link>
            </div>
          </AdaptiveMotion.div>
        </AdaptiveAnimatePresence>
      </div>
    );
  }

  return null;
};

export default CustomPuzzleGame;
