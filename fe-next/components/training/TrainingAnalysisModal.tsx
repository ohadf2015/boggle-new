'use client';

import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { m } from 'framer-motion';
import { Reveal } from '@/components/ui/Reveal';
import {
  X,
  Trophy,
  MoveUpRight,
  RotateCw,
  Compass,
  Target,
  CheckCircle2,
  Circle,
  ArrowRight,
  RotateCcw,
  Gamepad2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { getTrainingProgress, getSkillSummary } from '@/utils/trainingProgressStorage';

interface TrainingAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Navigate back to this mode after viewing analysis */
  returnTo?: 'multiplayer' | 'daily' | null;
}

interface SkillConfig {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  description: string;
  color: string;
}

const SKILL_CONFIGS: Record<string, SkillConfig> = {
  diagonal: {
    icon: MoveUpRight,
    label: 'Diagonal Movement',
    description: 'Swipe diagonally to find more words',
    color: 'purple',
  },
  directionChange: {
    icon: RotateCw,
    label: 'Direction Changes',
    description: 'Change direction mid-word for longer words',
    color: 'pink',
  },
  gridCoverage: {
    icon: Compass,
    label: 'Grid Exploration',
    description: 'Check corners and edges for hidden words',
    color: 'cyan',
  },
  longWords: {
    icon: Trophy,
    label: 'Long Words',
    description: 'Find 5+ letter words for bonus points',
    color: 'amber',
  },
};

/**
 * TrainingAnalysisModal - Post-game analysis after training/practice mode
 *
 * Shows:
 * - Skills mastered vs skills needing work
 * - Statistics (words found, longest word, etc.)
 * - Tips for improvement
 * - Navigation to multiplayer/daily if ready
 */
const TrainingAnalysisModal: React.FC<TrainingAnalysisModalProps> = ({
  isOpen,
  onClose,
  returnTo = null,
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isDarkMode = theme === 'dark';

  // Get analysis data
  const summary = useMemo(() => getSkillSummary(), []);
  const progress = useMemo(() => getTrainingProgress(), []);
  const hasPassed = progress.hasPassedTraining;

  // Trigger haptic on open
  useEffect(() => {
    if (isOpen) {
      triggerHaptic(hasPassed ? 'success' : 'light');
    }
  }, [isOpen, hasPassed]);

  const handleTryAgain = () => {
    triggerHaptic('selection');
    router.push(`/${language}/singleplayer?autoStart=practice`);
    onClose();
  };

  const handleGoToMode = (mode: 'multiplayer' | 'daily') => {
    triggerHaptic('selection');
    router.push(`/${language}/${mode}`);
    onClose();
  };

  const handleClose = () => {
    triggerHaptic('selection');
    onClose();
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const allSkills = Object.keys(SKILL_CONFIGS);
  const masteredCount = summary.mastered.length;
  const totalSkills = allSkills.length;
  const progressPercent = Math.round((masteredCount / totalSkills) * 100);

  return createPortal(
      <Reveal
        noSlide
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        onClick={handleClose}
      >
        <Reveal
          className={cn(
            'w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl relative',
            isDarkMode
              ? 'bg-neo-navy border border-slate-600'
              : 'bg-white border border-gray-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative background */}
          {hasPassed && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-linear-to-b from-green-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('common.close')}
            className={cn(
              'absolute top-4 right-4 rtl:right-auto rtl:left-4 rounded-full p-2 z-10 transition-colors',
              isDarkMode
                ? 'hover:bg-neo-navy-elevated text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            )}
          >
            <X size={18} />
          </button>

          {/* Header with celebration */}
          <Reveal
            noSlide
            className="flex justify-center mb-4"
          >
            {hasPassed ? (
              <m.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className={cn(
                  'p-4 rounded-2xl',
                  isDarkMode ? 'bg-green-900/50' : 'bg-green-100'
                )}
              >
                <Trophy className={cn(
                  'drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]',
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                )} size={48} />
              </m.div>
            ) : (
              <div className={cn(
                'p-4 rounded-2xl',
                isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'
              )}>
                <Target className={cn(
                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
                )} size={48} />
              </div>
            )}
          </Reveal>

          {/* Title */}
          <Reveal
            className="text-center mb-6"
          >
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              hasPassed
                ? (isDarkMode
                  ? 'text-transparent bg-clip-text bg-linear-to-r from-green-300 to-emerald-400'
                  : 'text-transparent bg-clip-text bg-linear-to-r from-green-500 to-emerald-600')
                : (isDarkMode
                  ? 'text-transparent bg-clip-text bg-linear-to-r from-purple-300 to-pink-400'
                  : 'text-transparent bg-clip-text bg-linear-to-r from-purple-500 to-pink-600')
            )}>
              {hasPassed
                ? (t('training.analysis.titleComplete'))
                : (t('training.analysis.titleProgress'))}
            </h2>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {hasPassed
                ? (t('training.analysis.subtitleComplete'))
                : (t('training.analysis.subtitleProgress'))}
            </p>
          </Reveal>

          {/* Progress bar */}
          <Reveal
            noSlide
            className="mb-6"
          >
            <div className="flex justify-between mb-1">
              <span className={cn('text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
                {t('training.analysis.progress')}
              </span>
              <span className={cn('text-sm font-bold', isDarkMode ? 'text-gray-200' : 'text-gray-800')}>
                {masteredCount}/{totalSkills}
              </span>
            </div>
            <div className={cn(
              'h-3 rounded-full overflow-hidden',
              isDarkMode ? 'bg-neo-navy-elevated' : 'bg-gray-200'
            )}>
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className={cn(
                  'h-full rounded-full',
                  hasPassed
                    ? 'bg-linear-to-r from-green-400 to-emerald-500'
                    : 'bg-linear-to-r from-purple-400 to-pink-500'
                )}
              />
            </div>
          </Reveal>

          {/* Skills grid */}
          <Reveal
            noSlide
            className="grid grid-cols-2 gap-3 mb-6"
          >
            {allSkills.map((skill) => {
              const config = SKILL_CONFIGS[skill];
              const isMastered = summary.mastered.includes(skill);
              const Icon = config.icon;

              return (
                <Reveal
                  key={skill}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all',
                    isMastered
                      ? (isDarkMode
                        ? 'bg-green-900/20 border-green-500/30'
                        : 'bg-green-50 border-green-200')
                      : (isDarkMode
                        ? 'bg-neo-navy-elevated/50 border-slate-600'
                        : 'bg-gray-50 border-gray-200')
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className={cn(
                        'shrink-0',
                        isMastered
                          ? (isDarkMode ? 'text-green-400' : 'text-green-600')
                          : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                      )}
                      size={18}
                    />
                    {isMastered ? (
                      <CheckCircle2 className={cn(
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      )} size={16} />
                    ) : (
                      <Circle className={cn(
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      )} size={16} />
                    )}
                  </div>
                  <p className={cn(
                    'text-sm font-medium',
                    isMastered
                      ? (isDarkMode ? 'text-green-300' : 'text-green-700')
                      : (isDarkMode ? 'text-gray-300' : 'text-gray-600')
                  )}>
                    {t(`training.analysis.skills.${skill}`) || config.label}
                  </p>
                </Reveal>
              );
            })}
          </Reveal>

          {/* Stats */}
          <Reveal
            noSlide
            className={cn(
              'p-4 rounded-xl mb-6',
              isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-gray-50'
            )}
          >
            <p className={cn(
              'text-sm font-medium mb-3',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {t('training.analysis.stats')}
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className={cn(
                  'text-2xl font-bold',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  {summary.stats.wordsFound}
                </p>
                <p className={cn(
                  'text-xs',
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                )}>
                  {t('training.analysis.wordsFound')}
                </p>
              </div>
              <div>
                <p className={cn(
                  'text-2xl font-bold',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  {summary.stats.longestWord}
                </p>
                <p className={cn(
                  'text-xs',
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                )}>
                  {t('training.analysis.longestWord')}
                </p>
              </div>
              <div>
                <p className={cn(
                  'text-2xl font-bold',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  {summary.stats.directionChanges}
                </p>
                <p className={cn(
                  'text-xs',
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                )}>
                  {t('training.analysis.dirChanges')}
                </p>
              </div>
            </div>
          </Reveal>

          {/* Tips for improvement (if not passed) */}
          {!hasPassed && summary.needsWork.length > 0 && (
            <Reveal
              noSlide
              className={cn(
                'p-4 rounded-xl mb-6 border',
                isDarkMode
                  ? 'bg-purple-900/20 border-purple-500/30'
                  : 'bg-purple-50 border-purple-200'
              )}
            >
              <p className={cn(
                'text-sm font-medium mb-2',
                isDarkMode ? 'text-purple-300' : 'text-purple-700'
              )}>
                <Sparkles className="inline w-4 h-4 me-1" />
                {t('training.analysis.tips')}
              </p>
              <ul className="space-y-1">
                {summary.needsWork.slice(0, 2).map((skill) => (
                  <li
                    key={skill}
                    className={cn(
                      'text-sm',
                      isDarkMode ? 'text-purple-200' : 'text-purple-600'
                    )}
                  >
                    • {t(`training.analysis.tip.${skill}`) || SKILL_CONFIGS[skill]?.description}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {/* Action Buttons */}
          <Reveal
            className="space-y-3"
          >
            {hasPassed ? (
              <>
                {/* Ready for more - show mode options */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleGoToMode('multiplayer')}
                    className={cn(
                      'h-12 font-semibold rounded-xl transition-all flex items-center justify-center gap-2',
                      'bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600',
                      'text-white shadow-lg hover:shadow-xl'
                    )}
                  >
                    <Gamepad2 size={18} />
                    {t('training.analysis.multiplayer')}
                  </Button>
                  <Button
                    onClick={() => handleGoToMode('daily')}
                    className={cn(
                      'h-12 font-semibold rounded-xl transition-all flex items-center justify-center gap-2',
                      'bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
                      'text-white shadow-lg hover:shadow-xl'
                    )}
                  >
                    <Calendar size={18} />
                    {t('training.analysis.daily')}
                  </Button>
                </div>

                {/* Also offer practice again */}
                <Button
                  onClick={handleTryAgain}
                  variant="ghost"
                  className={cn(
                    'w-full h-10 text-sm font-medium rounded-xl transition-all',
                    isDarkMode
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-neo-navy-elevated'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <RotateCcw className="me-2" size={16} />
                  {t('training.analysis.practiceMore')}
                </Button>
              </>
            ) : (
              <>
                {/* Not passed yet - encourage practice */}
                <Button
                  onClick={handleTryAgain}
                  className={cn(
                    'w-full h-12 text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2',
                    'bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
                    'text-white shadow-lg hover:shadow-xl'
                  )}
                >
                  <RotateCcw size={20} />
                  {t('training.analysis.tryAgain')}
                  <ArrowRight size={18} className="rtl:rotate-180" />
                </Button>

                {/* Allow skip if they really want to */}
                {returnTo && (
                  <Button
                    onClick={() => handleGoToMode(returnTo)}
                    variant="ghost"
                    className={cn(
                      'w-full h-10 text-sm font-medium rounded-xl transition-all',
                      isDarkMode
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-neo-navy-elevated'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {t('training.analysis.skipAnyway') || `Go to ${returnTo} anyway`}
                  </Button>
                )}
              </>
            )}
          </Reveal>
        </Reveal>
      </Reveal>,
    document.body
  );
};

export default TrainingAnalysisModal;
