'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, Trophy, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DailyWordHuntSurvival from '@/components/daily/DailyWordHuntSurvival';
import type { SurvivalGameResult } from '@/components/daily/survival';
import type { LetterGrid, Language } from '@/types';
import { buildPuzzleShareUrl, type LeaderboardEntry } from '@/utils/customPuzzle';
import { NeoLoader } from '@/components/ui/NeoLoader';

interface CustomPuzzleData {
  id: string;
  puzzleCode: string;
  creatorDisplayName: string;
  language: Language;
  targetWord: string;
  grid: LetterGrid;
  creatorSolved: boolean;
  creatorAttemptsUsed: number;
  creatorEfficiencyScore: number;
  totalPlays: number;
}

interface CustomPuzzleGameProps {
  puzzleCode: string;
}

type Phase = 'loading' | 'intro' | 'playing' | 'results';

const CustomPuzzleGame: React.FC<CustomPuzzleGameProps> = ({ puzzleCode }) => {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [puzzle, setPuzzle] = useState<CustomPuzzleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [beatCreator, setBeatCreator] = useState(false);

  // Get display name
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Player';

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
          setError(data.error || 'Failed to load puzzle');
          setPhase('loading');
          return;
        }

        setPuzzle(data.puzzle);
        setPhase('intro');
      } catch (err) {
        console.error('Error fetching puzzle:', err);
        setError('Failed to load puzzle');
      }
    }

    fetchPuzzle();
  }, [puzzleCode]);

  // Handle game completion
  const handleGameComplete = useCallback(async (result: SurvivalGameResult) => {
    setGameResult(result);
    setPhase('results');

    if (!puzzle) return;

    // Submit attempt to server
    try {
      const submitResponse = await fetch(`/api/custom-puzzle/${puzzleCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          guestFingerprint: user ? null : fingerprint,
          solved: result.solved,
          attemptsUsed: result.attemptsUsed,
          wordsDiscovered: result.wordsDiscovered.length,
          lifeRemaining: result.lifeRemaining,
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
  }, [puzzle, puzzleCode, displayName, user, fingerprint]);

  // Handle quit
  const handleQuit = useCallback(() => {
    // Return to home or daily challenge
    window.location.href = `/${language}/daily`;
  }, [language]);

  // Share puzzle
  const handleShare = useCallback(async () => {
    const shareUrl = buildPuzzleShareUrl(puzzleCode, language);
    const shareText = t('customPuzzle.shareText') ||
      `Can you beat my score on this custom word puzzle? ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('customPuzzle.title') || 'Custom Puzzle',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        await navigator.clipboard.writeText(shareUrl);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  }, [puzzleCode, language, t]);

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
        {error ? (
          <div className="text-center p-8">
            <h2 className="text-xl font-bold text-red-500 mb-4">{error}</h2>
            <Link href={`/${language}/daily`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back') || 'Back'}
              </Button>
            </Link>
          </div>
        ) : (
          <NeoLoader text={t('customPuzzle.loading') || 'Loading puzzle...'} />
        )}
      </div>
    );
  }

  // Intro screen
  if (phase === 'intro' && puzzle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-6 h-6 text-neo-lime" />
            <h1 className="text-2xl font-bold">{t('customPuzzle.title') || 'Custom Puzzle'}</h1>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {t('customPuzzle.createdBy')?.replace('{name}', puzzle.creatorDisplayName) ||
              `Created by ${puzzle.creatorDisplayName}`}
          </p>

          <div className="bg-neo-lime/20 border-2 border-neo-lime rounded-neo p-4 mb-6">
            <p className="text-sm font-medium">
              {t('customPuzzle.creatorScore') || 'Creator\'s Score'}:{' '}
              <span className="font-bold text-neo-navy dark:text-neo-cream">
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
            {t('customPuzzle.play') || 'Play Challenge'}
          </Button>

          <Link href={`/${language}/daily`} className="block mt-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back') || 'Back'}
            </Button>
          </Link>
        </motion.div>
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white dark:bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard p-6"
          >
            {/* Result Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">
                {gameResult.solved
                  ? (t('customPuzzle.solved') || 'You solved it!')
                  : (t('customPuzzle.failed') || 'Better luck next time!')}
              </h2>

              {beatCreator && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 bg-neo-lime text-neo-black px-4 py-2 rounded-neo font-bold"
                >
                  <Trophy className="w-5 h-5" />
                  {t('customPuzzle.beatCreator') || 'You beat the creator!'}
                </motion.div>
              )}
            </div>

            {/* Score Comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-neo-pink/20 border-2 border-neo-pink rounded-neo p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{t('customPuzzle.yourScore') || 'Your Score'}</p>
                <p className="text-2xl font-bold">{Math.round(gameResult.efficiencyScore)}</p>
              </div>
              <div className="bg-neo-lime/20 border-2 border-neo-lime rounded-neo p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{t('customPuzzle.creatorScore') || 'Creator'}</p>
                <p className="text-2xl font-bold">{Math.round(puzzle.creatorEfficiencyScore)}</p>
              </div>
            </div>

            {/* Leaderboard Preview */}
            {leaderboard.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-neo-lime" />
                  {t('customPuzzle.leaderboard') || 'Leaderboard'}
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
                <Share2 className="w-4 h-4 mr-2" />
                {t('customPuzzle.share') || 'Share Challenge'}
              </Button>

              <Link href={`/${language}/daily`} className="block">
                <Button variant="outline" className="w-full">
                  {t('customPuzzle.playDaily') || 'Play Daily Challenge'}
                </Button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return null;
};

export default CustomPuzzleGame;
