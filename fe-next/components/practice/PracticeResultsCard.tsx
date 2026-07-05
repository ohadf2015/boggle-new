'use client';

import { memo, useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mascot } from '@/components/ui/Mascot';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { Trophy, Star, RotateCcw, ArrowLeft } from 'lucide-react';

export interface PracticeResultsCardProps {
  /** Number of correct answers */
  correct: number;
  /** Total number of questions */
  total: number;
  /** XP earned in this session (optional) */
  xpEarned?: number;
  /** Custom mastery message (optional, overrides auto-generated) */
  masteryMessage?: string;
  /** Callback when user clicks Try Again */
  onRestart: () => void;
  /** Callback when user clicks Back */
  onBack: () => void;
  /** Custom className */
  className?: string;
  /** Total session time in seconds (optional) */
  timeSpent?: number;
  /** Best streak achieved (optional) */
  maxStreak?: number;
  /** Hints consumed during session (optional) */
  hintsUsed?: number;
}

/**
 * PracticeResultsCard - Polished celebration results display
 *
 * Features:
 * - Animated trophy and score entrance
 * - XP earned callout with star icon
 * - Contextual mastery messages based on score
 * - Lexi mascot with mood based on performance
 * - Staggered entrance animations
 * - Try Again and Back action buttons
 */
export const PracticeResultsCard = memo<PracticeResultsCardProps>(({
  correct,
  total,
  xpEarned,
  masteryMessage,
  onRestart,
  onBack,
  className,
  timeSpent,
  maxStreak,
  hintsUsed,
}) => {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  const percentage = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  }, [correct, total]);

  // Determine encouragement message based on score
  const encouragementMessage = useMemo(() => {
    if (masteryMessage) return masteryMessage;

    if (percentage === 100) {
      return t('education.practice.encouragement100');
    } else if (percentage >= 80) {
      return t('education.practice.encouragement80');
    } else if (percentage >= 50) {
      return t('education.practice.encouragement50');
    } else {
      return t('education.practice.encouragement0');
    }
  }, [percentage, masteryMessage, t]);

  // Determine mascot variant based on score
  const mascotVariant = useMemo(() => {
    if (percentage === 100) return 'celebration';
    if (percentage >= 80) return 'trophy';
    if (percentage >= 50) return 'happy';
    if (percentage >= 30) return 'thinking';
    return 'oops';
  }, [percentage]);

  return (
    <Card
      data-testid="practice-results-card"
      className={cn(
        'border-neo-thick border-neo-black shadow-hard-lg',
        'bg-linear-to-br from-neo-navy to-neo-navy/80',
        'overflow-hidden max-w-md mx-auto',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top celebration gradient */}
      <div className="h-2 bg-linear-to-r from-neo-pink via-neo-cyan to-neo-yellow" />

      <CardContent className="p-8 text-center">
        {/* Mascot */}
        <AdaptiveMotion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-4"
        >
          <Mascot variant={mascotVariant} size="lg" animated clipBorder="none" />
        </AdaptiveMotion.div>

        {/* Animated trophy */}
        <AdaptiveMotion.div
          data-testid="results-trophy"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center"
        >
          <div
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center',
              percentage >= 80
                ? 'bg-neo-yellow/20 border-neo border-neo-yellow'
                : percentage >= 50
                  ? 'bg-neo-cyan/20 border-neo border-neo-cyan'
                  : 'bg-neo-white/10 border-neo border-neo-white/30'
            )}
          >
            <Trophy
              className={cn(
                'w-10 h-10',
                percentage >= 80
                  ? 'text-neo-yellow'
                  : percentage >= 50
                    ? 'text-neo-cyan'
                    : 'text-neo-white'
              )}
            />
          </div>
        </AdaptiveMotion.div>

        {/* Score display */}
        <AdaptiveMotion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4"
        >
          <p
            className={cn(
              'text-6xl font-neo-display',
              percentage >= 80
                ? 'text-neo-yellow'
                : percentage >= 50
                  ? 'text-neo-cyan'
                  : 'text-neo-white'
            )}
          >
            {percentage}%
          </p>
          <p className="text-neo-white font-neo-body mt-1">
            {correct} / {total}{' '}
            {t('education.practice.correctCount')}
          </p>
        </AdaptiveMotion.div>

        {/* XP earned */}
        {xpEarned && xpEarned > 0 && (
          <AdaptiveMotion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            className={cn(
              'mt-4 inline-flex items-center gap-2 px-4 py-2',
              'bg-neo-yellow/20 rounded-neo border-neo border-neo-yellow'
            )}
          >
            <Star className="w-5 h-5 text-neo-yellow" />
            <span className="font-neo-display text-neo-yellow">+{xpEarned} XP</span>
          </AdaptiveMotion.div>
        )}

        {/* Encouragement message */}
        <AdaptiveMotion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 text-neo-white font-neo-body"
        >
          {encouragementMessage}
        </AdaptiveMotion.p>

        {/* Extended stats grid */}
        {(timeSpent || (maxStreak && maxStreak > 1) || (hintsUsed !== undefined && hintsUsed > 0)) && (
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-4 grid grid-cols-2 gap-3"
          >
            {timeSpent !== undefined && timeSpent > 0 && (
              <div className="p-3 bg-neo-navy/50 border-neo border-neo-black rounded-neo">
                <p className="text-xs text-neo-white font-neo-body">{t('education.practice.time')}</p>
                <p className="text-lg text-neo-cyan font-neo-display">
                  {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
            {maxStreak !== undefined && maxStreak > 1 && (
              <div className="p-3 bg-neo-navy/50 border-neo border-neo-black rounded-neo">
                <p className="text-xs text-neo-white font-neo-body">{t('education.practice.maxStreak')}</p>
                <p className="text-lg text-neo-yellow font-neo-display">{maxStreak}x</p>
              </div>
            )}
            {hintsUsed !== undefined && hintsUsed > 0 && (
              <div className="p-3 bg-neo-navy/50 border-neo border-neo-black rounded-neo">
                <p className="text-xs text-neo-white font-neo-body">{t('education.practice.hintsUsed')}</p>
                <p className="text-lg text-neo-purple font-neo-display">{hintsUsed}</p>
              </div>
            )}
          </AdaptiveMotion.div>
        )}

        {/* Action buttons */}
        <AdaptiveMotion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            onClick={onRestart}
            size="lg"
            className={cn(
              'font-neo-display',
              'bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black',
              'shadow-hard hover:shadow-hard-lg',
              'border-neo border-neo-black',
              'flex items-center gap-2'
            )}
          >
            <RotateCcw className="w-5 h-5" />
            {t('education.practice.tryAgain')}
          </Button>
          <Button
            onClick={onBack}
            size="lg"
            variant="outline"
            className={cn(
              'font-neo-display',
              'bg-transparent hover:bg-neo-white/10',
              'text-neo-white border-neo border-neo-white/30',
              'flex items-center gap-2'
            )}
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
            {t('education.practice.back')}
          </Button>
        </AdaptiveMotion.div>
      </CardContent>
    </Card>
  );
});

PracticeResultsCard.displayName = 'PracticeResultsCard';

export default PracticeResultsCard;
