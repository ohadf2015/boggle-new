'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Target, ArrowLeft, AlertCircle, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SinglePlayerGame from '@/components/singleplayer/SinglePlayerGame';
import ChallengeResults from './ChallengeResults';
import { getChallenge, parseGridSeed, recordChallengeAttempt, type ScoreChallenge } from '@/utils/challenges';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/ThemeContext';
import { getGuestSessionId } from '@/utils/guestManager';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';
import type { SinglePlayerGameState, SinglePlayerResultsData, BotOpponent } from '@/components/singleplayer/SinglePlayerView';
import type { LetterGrid, Language, DifficultyLevel } from '@/shared/types/game';

type ChallengePhase = 'loading' | 'intro' | 'playing' | 'results' | 'error';

interface ChallengeViewProps {
  challengeCode: string;
}

/**
 * ChallengeView - "Beat My Score" challenge mode
 * Players compete on the exact same board as the challenge creator
 */
const ChallengeView: React.FC<ChallengeViewProps> = ({ challengeCode }) => {
  const { language, t } = useLanguage();
  const { user, profile, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === 'dark';

  const [phase, setPhase] = useState<ChallengePhase>('loading');
  const [challenge, setChallenge] = useState<ScoreChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultsData, setResultsData] = useState<SinglePlayerResultsData | null>(null);
  const [attemptResult, setAttemptResult] = useState<{ beatCreator: boolean; scoreDifference: number } | null>(null);

  // Load challenge data
  useEffect(() => {
    async function loadChallenge() {
      const data = await getChallenge(challengeCode);
      if (!data) {
        setError(t('challengeView.notFoundOrExpired'));
        setPhase('error');
        return;
      }

      // Check if expired
      if (new Date(data.expiresAt) < new Date()) {
        setError(t('challengeView.expired'));
        setPhase('error');
        return;
      }

      setChallenge(data);
      setPhase('intro');
    }

    loadChallenge();
  }, [challengeCode, t]);

  // Parse grid from seed
  const grid = useMemo((): LetterGrid | null => {
    if (!challenge) return null;
    return parseGridSeed(challenge.gridSeed);
  }, [challenge]);

  // Game settings derived from challenge
  const gameSettings = useMemo((): SinglePlayerGameState | null => {
    if (!challenge || !grid) return null;
    return {
      mode: 'challenge' as const,
      difficulty: challenge.difficulty as DifficultyLevel,
      language: challenge.language as Language,
      grid,
      timerSeconds: challenge.durationSeconds,
      bots: [] as BotOpponent[],
      minWordLength: challenge.minWordLength,
    };
  }, [challenge, grid]);

  // Handle game start
  const handleStartGame = useCallback(() => {
    setPhase('playing');
  }, []);

  // Handle game end
  const handleGameEnd = useCallback(async (results: SinglePlayerResultsData) => {
    if (!challenge) return;

    setResultsData(results);

    // Record the attempt
    const username = profile?.username || 'Guest';
    const attempt = await recordChallengeAttempt({
      challengeId: challenge.id,
      username,
      avatarEmoji: profile?.avatar_emoji,
      avatarColor: profile?.avatar_color,
      playerId: isAuthenticated ? user?.id : undefined,
      guestFingerprint: !isAuthenticated ? (getGuestSessionId() ?? undefined) : undefined,
      score: results.playerScore,
      wordCount: results.playerWords.length,
      longestWord: results.playerWords.reduce(
        (longest, word) => word.length > longest.length ? word : longest,
        ''
      ),
      longestWordLength: Math.max(...results.playerWords.map(w => w.length), 0),
      maxCombo: results.playerWordData.reduce((max, w) => Math.max(max, (w.comboBonus || 0) > 0 ? 2 : 1), 1),
    });

    if (attempt) {
      setAttemptResult({
        beatCreator: attempt.beatCreator,
        scoreDifference: attempt.scoreDifference,
      });
    }

    setPhase('results');
  }, [challenge, user, profile, isAuthenticated]);

  // Handle quit
  const handleQuit = useCallback(() => {
    router.push(`/${language}`);
  }, [router, language]);

  // Handle play again
  const handlePlayAgain = useCallback(() => {
    setResultsData(null);
    setAttemptResult(null);
    setPhase('intro');
  }, []);

  // Render loading state
  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('challengeView.loading')} />
      </div>
    );
  }

  // Render error state
  if (phase === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy p-4">
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            'max-w-md w-full p-6 rounded-neo border-4 border-neo-black shadow-hard-lg text-center',
            isDark ? 'bg-neo-navy-light' : 'bg-white'
          )}
        >
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className={cn(
            'text-xl font-black uppercase mb-2',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {t('challengeView.oops')}
          </h2>
          <p className={cn('mb-6', isDark ? 'text-gray-300' : 'text-gray-600')}>
            {error}
          </p>
          <Button
            onClick={() => router.push(`/${language}`)}
            className="w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo shadow-hard-md hover:shadow-hard-lg hover:-translate-y-1 transition-all font-bold"
          >
            {t('challengeView.backToHome')}
          </Button>
        </m.div>
      </div>
    );
  }

  // Render intro screen (challenge details)
  if (phase === 'intro' && challenge) {
    const winRate = challenge.totalAttempts > 0
      ? Math.round((challenge.totalBeaten / challenge.totalAttempts) * 100)
      : 0;

    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy p-4">
        <m.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-6"
        >
          {/* Back button */}
          <button type="button"
            onClick={handleQuit}
            className={cn(
              'flex items-center gap-2 text-sm font-bold hover:underline',
              isDark ? 'text-gray-300' : 'text-gray-600'
            )}
          >
            <ArrowLeft size={16} className="rtl:rotate-180" />
            {t('challengeView.back')}
          </button>

          {/* Challenge Card */}
          <m.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={cn(
              'p-6 rounded-neo border-4 border-neo-black shadow-hard-xl',
              isDark ? 'bg-neo-navy' : 'bg-white'
            )}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neo-lime border-3 border-neo-black shadow-hard-md mb-3"
              >
                <Target className="w-8 h-8 text-neo-black" />
              </m.div>
              <h1 className={cn(
                'text-2xl font-black uppercase tracking-wide',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                {t('challengeView.title')}
              </h1>
              <p className={cn('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
                {t('challengeView.beatScore')}
              </p>
            </div>

            {/* Creator Info */}
            <div className={cn(
              'flex items-center gap-3 p-4 rounded-neo border-2 mb-4',
              isDark ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'
            )}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-neo-black"
                style={{ backgroundColor: challenge.creatorAvatarColor }}
              >
                {challenge.creatorAvatarEmoji}
              </div>
              <div className="flex-1">
                <p className={cn(
                  'font-bold text-lg',
                  isDark ? 'text-white' : 'text-gray-900'
                )}>
                  {challenge.creatorUsername}
                </p>
                <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {t('challengeView.createdChallenge')}
                </p>
              </div>
            </div>

            {/* Score to Beat */}
            <div className={cn(
              'text-center p-6 rounded-neo border-3 mb-4',
              'bg-linear-to-br from-neo-lime/20 to-orange-500/20 border-neo-lime'
            )}>
              <p className={cn(
                'text-sm font-bold uppercase tracking-wide mb-2',
                isDark ? 'text-yellow-300' : 'text-yellow-700'
              )}>
                {t('challengeView.scoreToBeat')}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-8 h-8 text-yellow-500" />
                <span className={cn(
                  'text-5xl font-black',
                  isDark ? 'text-yellow-400' : 'text-yellow-600'
                )}>
                  {challenge.creatorScore}
                </span>
              </div>
              <p className={cn(
                'text-sm mt-2',
                isDark ? 'text-gray-300' : 'text-gray-600'
              )}>
                {challenge.creatorWordCount} {t('challengeView.words')}
                {challenge.creatorLongestWord && (
                  <>
                    <span className="mx-2">|</span>
                    <span>
                      {t('challengeView.longest')}
                      <strong>{challenge.creatorLongestWord}</strong>
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className={cn(
                'text-center p-3 rounded-neo border-2',
                isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'
              )}>
                <p className={cn('text-2xl font-black', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
                  {challenge.totalAttempts}
                </p>
                <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {t('challengeView.attempts')}
                </p>
              </div>
              <div className={cn(
                'text-center p-3 rounded-neo border-2',
                isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'
              )}>
                <p className={cn('text-2xl font-black', isDark ? 'text-green-400' : 'text-green-600')}>
                  {challenge.totalBeaten}
                </p>
                <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {t('challengeView.beaten')}
                </p>
              </div>
              <div className={cn(
                'text-center p-3 rounded-neo border-2',
                isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'
              )}>
                <p className={cn('text-2xl font-black', isDark ? 'text-purple-400' : 'text-purple-600')}>
                  {winRate}%
                </p>
                <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {t('challengeView.winRate')}
                </p>
              </div>
            </div>

            {/* Game Info */}
            <div className={cn(
              'flex items-center justify-center gap-4 text-xs mb-6',
              isDark ? 'text-gray-400' : 'text-gray-500'
            )}>
              <span>{challenge.difficulty}</span>
              <span>|</span>
              <span>{challenge.durationSeconds}s</span>
              <span>|</span>
              <span>{challenge.language.toUpperCase()}</span>
            </div>

            {/* Start Button */}
            <m.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartGame}
              className={cn(
                'w-full flex items-center justify-center gap-3 p-4',
                'font-black text-xl uppercase tracking-wide rounded-neo',
                'border-4 border-neo-black shadow-hard-lg',
                'hover:shadow-hard-xl transition-all',
                'bg-neo-lime text-neo-black'
              )}
            >
              <Zap className="w-6 h-6" />
              {t('challengeView.startChallenge')}
            </m.button>
          </m.div>
        </m.div>
      </div>
    );
  }

  // Render game
  if (phase === 'playing' && gameSettings) {
    return (
      <SinglePlayerGame
        settings={gameSettings}
        targetHighScore={challenge?.creatorScore || null}
        onGameEnd={handleGameEnd}
        onQuit={handleQuit}
      />
    );
  }

  // Render results
  if (phase === 'results' && resultsData && challenge) {
    return (
      <ChallengeResults
        results={resultsData}
        challenge={challenge}
        attemptResult={attemptResult}
        onPlayAgain={handlePlayAgain}
        onBackToHome={handleQuit}
      />
    );
  }

  return null;
};

export default ChallengeView;
