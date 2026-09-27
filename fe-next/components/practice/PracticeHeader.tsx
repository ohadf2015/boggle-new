'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ArrowLeft } from 'lucide-react';
import XpProgressBar from '@/components/education/XpProgressBar';
import StreakBonusIndicator from '@/components/education/StreakBonusIndicator';
import { Mascot } from '@/components/ui/Mascot';
import type { PracticeType } from '@/hooks/usePracticeSession';

export interface PracticeHeaderProps {
  /** Lesson name to display */
  lessonName: string;
  /** Current practice mode */
  mode: PracticeType;
  /** Total XP for progress display */
  totalXp: number;
  /** Current streak in days */
  currentStreak: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Back button callback */
  onBack: () => void;
  /** Recent XP gain for animation */
  recentXpGain?: number;
  /** Show small mascot (default: false) */
  showMascot?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * PracticeHeader - Unified sticky header for all practice modes
 *
 * Features:
 * - Back button with lesson name and mode label
 * - XP progress bar (compact)
 * - Streak indicator (if active)
 * - Progress bar for current session
 * - Optional mascot display
 * - RTL support
 */
export const PracticeHeader = memo<PracticeHeaderProps>(({
  lessonName,
  mode,
  totalXp,
  currentStreak,
  progress,
  onBack,
  recentXpGain,
  showMascot = false,
  className,
}) => {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  const getModeLabel = (type: PracticeType): string => {
    const labels: Record<PracticeType, string> = {
      flashcard: t('education.practice.flashcards'),
      solo_board: t('education.practice.soloBoard'),
      word_list: t('education.practice.wordList'),
      warmup: t('education.practice.warmup'),
      matching: t('education.practice.matching'),
      spelling: t('education.practice.spelling'),
      blitz: t('education.practice.blitz'),
      vocab_focus: t('education.vocabFocus.title'),
    };
    return labels[type];
  };

  // Choose mascot variant based on mode
  const getMascotVariant = (type: PracticeType) => {
    switch (type) {
      case 'flashcard':
        return 'thinking';
      case 'solo_board':
      case 'warmup':
        return 'gaming';
      case 'word_list':
        return 'happy';
      case 'matching':
        return 'thinking';
      case 'spelling':
        return 'thinking';
      case 'blitz':
        return 'gaming';
      default:
        return 'happy';
    }
  };

  return (
    <header
      data-testid="practice-header"
      className={cn(
        'sticky top-0 z-50',
        'bg-neo-navy/95',
        'border-b-neo border-neo-black/30',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className="max-w-2xl mx-auto px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
      >
        {/* Top row: Back button, title, XP/streak */}
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label={t('common.back')}
            className="text-neo-white hover:text-neo-white hover:bg-neo-white/10 p-2"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
          </Button>

          {/* Title and mode */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-neo-display text-neo-white truncate">
              {lessonName}
            </h1>
            <p className="text-xs text-neo-white font-neo-body">
              {getModeLabel(mode)}
            </p>
          </div>

          {/* Optional mascot */}
          {showMascot && (
            <div className="hidden sm:block">
              <Mascot variant={getMascotVariant(mode)} size="xs" animated clipBorder="none" />
            </div>
          )}

          {/* XP and streak */}
          <div className="flex items-center gap-3">
            {/* Compact XP display */}
            <div className="w-24 sm:w-32">
              <XpProgressBar
                totalXp={totalXp}
                recentXpGain={recentXpGain}
                showLevel={false}
                showNextLevel={false}
                size="sm"
              />
            </div>

            {/* Streak indicator */}
            {currentStreak > 0 && (
              <StreakBonusIndicator
                currentStreak={currentStreak}
                variant="inline"
                size="sm"
                showBonus={false}
              />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div
            data-testid="practice-progress-bar"
            className="h-1.5 bg-neo-black/30 rounded-full overflow-hidden"
          >
            <AdaptiveMotion.div
              className="h-full bg-neo-cyan"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </header>
  );
});

PracticeHeader.displayName = 'PracticeHeader';

export default PracticeHeader;
