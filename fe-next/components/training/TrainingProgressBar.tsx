'use client';

import React, { useMemo, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check, MoveUpRight, RotateCw, Target, Trophy, Sparkles, ChevronDown } from 'lucide-react';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

/**
 * Training skill definition
 * These are the 5 clear goals visible to the player
 */
interface TrainingSkill {
  id: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  labelKey: string;
  fallbackLabel: string;
  color: string;
  bgColor: string;
}

const TRAINING_SKILLS: TrainingSkill[] = [
  {
    id: 'firstWord',
    icon: Sparkles,
    labelKey: 'training.progress.firstWord',
    fallbackLabel: 'Find First Word',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  {
    id: 'diagonal',
    icon: MoveUpRight,
    labelKey: 'training.progress.diagonal',
    fallbackLabel: 'Swipe Diagonally',
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'directionChange',
    icon: RotateCw,
    labelKey: 'training.progress.directionChange',
    fallbackLabel: 'Change Direction',
    color: 'text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  {
    id: 'targetScore',
    icon: Target,
    labelKey: 'training.progress.targetScore',
    fallbackLabel: 'Score 15 Points',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  {
    id: 'fiveWords',
    icon: Trophy,
    labelKey: 'training.progress.fiveWords',
    fallbackLabel: 'Find 5 Words',
    color: 'text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
];

interface TrainingProgressBarProps {
  /** Skills that have been completed */
  completedSkills: Set<string>;
  /** Current score */
  score: number;
  /** Number of valid words found */
  wordsFound: number;
  /** Whether to show compact mode (mobile) */
  compact?: boolean;
  /** Whether to show expanded skill list (tap to expand on mobile) */
  expanded?: boolean;
  /** Callback when user taps to expand/collapse */
  onToggleExpand?: () => void;
  /** Skill that was just unlocked (for celebration animation) */
  justUnlocked?: string | null;
  /** Callback to clear the justUnlocked state */
  onUnlockAnimationComplete?: () => void;
  /** Whether training is complete (all skills unlocked) */
  isComplete?: boolean;
}

/**
 * SkillCheckpoint - Individual skill indicator with checkmark
 */
const SkillCheckpoint = memo<{
  skill: TrainingSkill;
  isCompleted: boolean;
  isJustUnlocked: boolean;
  t: (key: string) => string | undefined;
}>(({ skill, isCompleted, isJustUnlocked, t }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const Icon = skill.icon;

  return (
    <m.div
      initial={isJustUnlocked ? { scale: 0.8, opacity: 0 } : false}
      animate={isJustUnlocked ? { scale: [0.8, 1.2, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
      transition={isJustUnlocked ? { type: 'spring', stiffness: 400, damping: 22 } : undefined}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border-2 transition-all duration-300',
        isCompleted
          ? 'border-neo-lime bg-neo-lime/10 dark:bg-neo-lime/20'
          : isDarkMode
            ? 'border-slate-600 bg-neo-navy-elevated/50'
            : 'border-gray-200 bg-gray-50'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'shrink-0 p-1.5 rounded-md',
        isCompleted ? 'bg-neo-lime/20' : skill.bgColor
      )}>
        {isCompleted ? (
          <m.div
            initial={isJustUnlocked ? { rotate: -180, scale: 0 } : false}
            animate={isJustUnlocked ? { rotate: 0, scale: 1 } : undefined}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 22 }}
          >
            <Check className="w-4 h-4 text-neo-lime" />
          </m.div>
        ) : (
          <Icon className={cn('w-4 h-4', skill.color)} />
        )}
      </div>

      {/* Label */}
      <span className={cn(
        'text-xs font-medium flex-1',
        isCompleted
          ? 'text-neo-lime dark:text-neo-lime'
          : isDarkMode ? 'text-gray-300' : 'text-gray-600'
      )}>
        {t(skill.labelKey) || skill.fallbackLabel}
      </span>

      {/* Checkmark indicator */}
      {isCompleted && (
        <m.div
          initial={isJustUnlocked ? { scale: 0 } : false}
          animate={isJustUnlocked ? { scale: [0, 1.3, 1] } : undefined}
          transition={{ delay: 0.3 }}
        >
          <Check className="w-4 h-4 text-neo-lime" />
        </m.div>
      )}
    </m.div>
  );
});

SkillCheckpoint.displayName = 'SkillCheckpoint';

/**
 * TrainingProgressBar - Visual progress indicator for training mode
 *
 * Shows 5 clear skills with checkpoints:
 * 1. Find First Word (instant success)
 * 2. Swipe Diagonally
 * 3. Change Direction Mid-Word
 * 4. Score 15 Points (target score)
 * 5. Find 5 Words Total
 */
const TrainingProgressBar: React.FC<TrainingProgressBarProps> = ({
  completedSkills,
  score,
  wordsFound,
  compact = false,
  expanded = false,
  onToggleExpand,
  justUnlocked = null,
  onUnlockAnimationComplete,
  isComplete = false,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  // Calculate progress percentage
  const completedCount = completedSkills.size;
  const totalSkills = TRAINING_SKILLS.length;
  const progressPercent = Math.round((completedCount / totalSkills) * 100);

  // Determine progress bar color based on completion
  const progressVariant = useMemo(() => {
    if (progressPercent >= 100) return 'success';
    if (progressPercent >= 60) return 'cyan';
    if (progressPercent >= 20) return 'warning';
    return 'default';
  }, [progressPercent]);

  // Get status message
  const statusMessage = useMemo(() => {
    if (isComplete) return t('training.progress.complete');
    if (progressPercent >= 80) return t('training.progress.almostThere');
    if (progressPercent >= 40) return t('training.progress.keepGoing');
    return t('training.progress.getStarted');
  }, [progressPercent, isComplete, t]);

  // Clear justUnlocked after animation
  React.useEffect(() => {
    if (justUnlocked && onUnlockAnimationComplete) {
      const timer = setTimeout(() => {
        onUnlockAnimationComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [justUnlocked, onUnlockAnimationComplete]);

  // Compact mode for mobile - shows prominent clickable bar
  // min-h-[44px] ensures touch target meets accessibility requirements
  if (compact && !expanded) {
    return (
      <m.button
        onClick={onToggleExpand}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center gap-3 px-4 py-3 min-h-[52px] w-full max-w-[320px] rounded-xl border-2 shadow-hard-sm transition-all',
          isComplete
            ? 'bg-neo-lime border-neo-lime text-neo-black'
            : isDarkMode
              ? 'bg-neo-navy-elevated border-slate-500 text-white'
              : 'bg-white border-neo-black text-neo-black'
        )}
      >
        {isComplete ? (
          <>
            <Trophy className="w-5 h-5" />
            <span className="text-base font-bold">{t('training.progress.ready')}</span>
          </>
        ) : (
          <>
            <span className="text-base font-bold min-w-[32px]">{completedCount}/{totalSkills}</span>
            <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden">
              <m.div
                className={cn(
                  'h-full rounded-full',
                  progressVariant === 'success' ? 'bg-neo-lime' :
                  progressVariant === 'cyan' ? 'bg-neo-cyan' :
                  progressVariant === 'warning' ? 'bg-neo-yellow' : 'bg-neo-orange'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {/* Show tap hint with chevron to indicate expandability */}
            <div className="flex items-center gap-1">
              <span className={cn(
                'text-xs font-medium whitespace-nowrap',
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              )}>
                {t('training.progress.tapForDetails')}
              </span>
              <ChevronDown className={cn(
                'w-4 h-4 shrink-0',
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              )} />
            </div>
          </>
        )}
      </m.button>
    );
  }

  // Make the expanded container clickable to collapse in compact mode
  const containerProps = compact && expanded && onToggleExpand ? {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand();
    },
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggleExpand();
      }
    },
  } : {};

  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      {...containerProps}
      className={cn(
        'rounded-xl border-2 overflow-hidden shadow-hard-sm',
        isDarkMode
          ? 'bg-neo-navy-light/90 border-slate-600'
          : 'bg-white/95 border-neo-black',
        compact ? 'p-3' : 'p-4',
        compact && onToggleExpand && 'cursor-pointer'
      )}
    >
      {/* Header with progress bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            'font-bold text-sm uppercase tracking-wide',
            isDarkMode ? 'text-gray-300' : 'text-neo-black'
          )}>
            {t('training.progress.title')}
          </h3>
          {compact && onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={cn(
                'text-xs px-3 py-2 min-h-[36px] rounded border',
                isDarkMode ? 'border-slate-500 text-gray-400 hover:bg-neo-navy-elevated' : 'border-gray-300 text-gray-500 hover:bg-gray-100'
              )}
            >
              {t('common.collapse')}
            </button>
          )}
        </div>
        <div className={cn(
          'text-sm font-bold',
          isComplete ? 'text-neo-lime' : isDarkMode ? 'text-white' : 'text-neo-black'
        )}>
          {completedCount}/{totalSkills}
        </div>
      </div>

      {/* Main progress bar */}
      <div className="mb-3">
        <Progress
          value={progressPercent}
          variant={progressVariant}
          size="default"
          className="mb-1"
        />
        <div className="flex justify-between items-center">
          <span className={cn(
            'text-xs',
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          )}>
            {statusMessage}
          </span>
          <span className={cn(
            'text-xs font-bold',
            isComplete ? 'text-neo-lime' : isDarkMode ? 'text-gray-300' : 'text-gray-600'
          )}>
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Skill checkpoints grid */}
      <div className={cn(
        'grid gap-2',
        compact ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      )}>
        {TRAINING_SKILLS.map((skill) => (
          <SkillCheckpoint
            key={skill.id}
            skill={skill}
            isCompleted={completedSkills.has(skill.id)}
            isJustUnlocked={justUnlocked === skill.id}
            t={t}
          />
        ))}
      </div>

      {/* Celebration when complete */}
      <AnimatePresence>
        {isComplete && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t-2 border-neo-lime/30"
          >
            <div className="flex items-center justify-center gap-2 text-neo-lime">
              <m.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                <Trophy className="w-5 h-5" />
              </m.div>
              <span className="font-bold text-sm">
                {t('training.progress.readyForMultiplayer')}
              </span>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};

export default memo(TrainingProgressBar);

// Export skill IDs for use in tracking
export const TRAINING_SKILL_IDS = TRAINING_SKILLS.map(s => s.id);
export type TrainingSkillId = typeof TRAINING_SKILL_IDS[number];
