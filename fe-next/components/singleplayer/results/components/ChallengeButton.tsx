'use client';

import React, { useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Target, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createChallenge, getChallengeUrl, generateGridSeed } from '@/utils/challenges';
import { getGuestSessionId } from '@/utils/guestManager';
import { neoSuccessToast, neoErrorToast } from '@/components/NeoToast';
import { cn } from '@/lib/utils';
import type { LetterGrid, Language } from '@/shared/types/game';

interface ChallengeButtonProps {
  /** Grid from the completed game */
  grid: LetterGrid;
  /** Player's score to beat */
  score: number;
  /** Words found by player */
  words: string[];
  /** Game language */
  gameLanguage: Language;
  /** Game duration in seconds */
  gameDuration: number;
  /** Button variant */
  variant?: 'default' | 'compact';
  /** Whether player won (shows enhanced prompt) */
  isWinner?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ChallengeButton - Creates "Beat My Score" challenge links
 *
 * After a single-player game, players can challenge friends to beat their score
 * on the exact same board.
 */
const ChallengeButton: React.FC<ChallengeButtonProps> = ({
  grid,
  score,
  words,
  gameLanguage,
  gameDuration,
  variant = 'default',
  isWinner = false,
  className,
}) => {
  const { t } = useLanguage();
  const { user, profile, isAuthenticated } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);

  // Find the longest word for challenge metadata
  const longestWord = React.useMemo(
    () => words.reduce(
      (longest, word) => word.length > longest.length ? word : longest,
      '',
    ),
    [words],
  );

  const handleCreateChallenge = useCallback(async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      const challengeData = {
        creator: {
          username: profile?.username || t('common.guest'),
          avatarEmoji: profile?.avatar_emoji || '😊',
          avatarColor: profile?.avatar_color || '#4F46E5',
          playerId: isAuthenticated ? user?.id : undefined,
          guestFingerprint: !isAuthenticated ? (getGuestSessionId() ?? undefined) : undefined,
        },
        gameConfig: {
          gridSeed: generateGridSeed(grid),
          language: gameLanguage,
          // Default to medium difficulty for challenges
          difficulty: 'MEDIUM' as const,
          durationSeconds: gameDuration,
          // Default to 3-letter minimum for challenges
          minWordLength: 3,
        },
        performance: {
          score,
          wordCount: words.length,
          longestWord: longestWord || undefined,
          longestWordLength: longestWord?.length || 0,
        },
      };

      const challenge = await createChallenge(challengeData);

      if (challenge) {
        const url = getChallengeUrl(challenge.challengeCode, 'results-share');
        await navigator.clipboard.writeText(url);
        setChallengeUrl(url);
        neoSuccessToast(t('daily.linkCopied'));

        // Reset after 5 seconds to allow creating another challenge
        setTimeout(() => setChallengeUrl(null), 5000);
      } else {
        neoErrorToast(t('daily.createChallengeFailed'));
      }
    } catch (error) {
      console.error('Error creating challenge:', error);
      neoErrorToast(t('daily.createChallengeFailed'));
    } finally {
      setIsCreating(false);
    }
  }, [
    isCreating,
    grid,
    score,
    words,
    longestWord,
    gameLanguage,
    gameDuration,
    profile,
    user,
    isAuthenticated,
    t,
  ]);

  const isCompact = variant === 'compact';

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 26 }}
      className={cn('flex flex-col gap-2', className)}
    >
      {/* Winner callout - draws attention to share action */}
      <AnimatePresence>
        {isWinner && !challengeUrl && !isCreating && (
          <m.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2',
              'bg-linear-to-r from-neo-yellow/20 to-neo-orange/20',
              'border-2 border-neo-yellow/40 rounded-neo'
            )}
          >
            <m.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <Sparkles className="w-4 h-4 text-neo-yellow" />
            </m.div>
            <span className="text-sm font-bold text-neo-yellow">
              {t('challenge.winnerPrompt')}
            </span>
          </m.div>
        )}
      </AnimatePresence>

      <Button
        onClick={handleCreateChallenge}
        disabled={isCreating}
        className={cn(
          'w-full flex items-center justify-center gap-2',
          'font-bold uppercase tracking-wide rounded-neo',
          'border-3 border-neo-black shadow-hard',
          'hover:shadow-hard-lg hover:-translate-y-0.5',
          'active:shadow-hard-pressed active:translate-y-0',
          'transition-all duration-150',
          'disabled:opacity-70 disabled:cursor-not-allowed',
          challengeUrl
            ? 'bg-neo-lime text-neo-black'
            : isWinner
            ? 'bg-neo-yellow text-neo-black'
            : 'bg-neo-cyan text-neo-black',
          isCompact ? 'p-3 text-sm' : 'p-4 text-base'
        )}
      >
        {isCreating ? (
          <>
            <Loader2 className={cn('animate-spin', isCompact ? 'w-4 h-4' : 'w-5 h-5')} />
            <span>{t('common.creating')}</span>
          </>
        ) : challengeUrl ? (
          <>
            <Check className={cn(isCompact ? 'w-4 h-4' : 'w-5 h-5')} />
            <span>{t('daily.linkCopied')}</span>
          </>
        ) : (
          <>
            <Target className={cn(isCompact ? 'w-4 h-4' : 'w-5 h-5')} />
            <span>{t('challenge.challengeFriend')}</span>
          </>
        )}
      </Button>

      {/* Subtitle hint */}
      {!isCompact && !challengeUrl && !isCreating && (
        <p className="text-center text-xs text-white font-medium">
          {t('challenge.shareHint')}
        </p>
      )}
    </m.div>
  );
};

export default ChallengeButton;
