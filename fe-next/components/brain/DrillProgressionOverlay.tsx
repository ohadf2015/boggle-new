'use client';

import { useEffect, useState } from 'react';
import { Zap, Brain, Target, Shuffle, BookOpen, TrendingUp, X, Star, Coins, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { pickProgressionSound } from '@/lib/drills/progressionSound';
import type { CognitiveDomain, BrainTier } from '@/shared/types/cognitive';
import type { DrillImprovement } from '@/shared/utils/drillImprovement';

interface DrillProgressionOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Called when overlay should close */
  onClose: () => void;
  /** The domain that was trained */
  targetDomain: CognitiveDomain;
  /** New domain score after drill */
  newDomainScore: number;
  /** Previous domain score */
  previousDomainScore?: number;
  /** Score change delta */
  scoreDelta: number;
  /** New overall brain score */
  overallScore: number;
  /** Current tier */
  tier: BrainTier;
  /** XP awarded for this drill (from server) */
  xpAwarded?: number;
  /** Gold awarded for this drill */
  goldAwarded?: number;
  /** Level promotion info if drill bumped player to a new level */
  levelUp?: { newLevel: number; previousLevel: number };
  /** "You got better" signals — surfaces the single most flattering true one. */
  improvement?: DrillImprovement;
}

/**
 * Picks the single most flattering TRUE improvement signal to celebrate.
 * Priority: personal best > above your average > better than last time >
 * first attempt. Returns null when there's nothing genuine to show.
 */
function pickImprovementBadge(improvement: DrillImprovement | undefined) {
  if (!improvement) return null;
  if (improvement.isPersonalBest) {
    return { key: 'brain.drills.newPersonalBest', Icon: Trophy, bg: 'bg-neo-yellow' } as const;
  }
  if (improvement.totalPlays > 0 && improvement.averageScore > 0 && improvement.currentScore > improvement.averageScore) {
    return { key: 'brain.drills.aboveAverage', Icon: TrendingUp, bg: 'bg-neo-green' } as const;
  }
  if (improvement.improvedVsLast) {
    return { key: 'brain.drills.betterThanLast', Icon: TrendingUp, bg: 'bg-neo-green' } as const;
  }
  if (improvement.totalPlays === 0) {
    return { key: 'brain.drills.firstAttempt', Icon: Sparkles, bg: 'bg-neo-cyan' } as const;
  }
  return null;
}

const DOMAIN_CONFIG: Record<CognitiveDomain, {
  icon: typeof Zap;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  processingSpeed: {
    icon: Zap,
    color: 'text-neo-lime',
    bgColor: 'bg-neo-lime',
    borderColor: 'border-yellow-600',
  },
  workingMemory: {
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400',
    borderColor: 'border-purple-600',
  },
  attention: {
    icon: Target,
    color: 'text-neo-orange',
    bgColor: 'bg-neo-orange',
    borderColor: 'border-orange-600',
  },
  flexibility: {
    icon: Shuffle,
    color: 'text-neo-cyan',
    bgColor: 'bg-neo-cyan',
    borderColor: 'border-cyan-600',
  },
  vocabulary: {
    icon: BookOpen,
    color: 'text-lime-400',
    bgColor: 'bg-lime-400',
    borderColor: 'border-lime-600',
  },
};

/**
 * Animated counter component for score display
 * Animates from startValue to endValue for satisfying progression feedback
 */
function AnimatedScore({
  value,
  startValue = 0,
  duration = 1500
}: {
  value: number;
  startValue?: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(startValue);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const from = startValue;
    const to = value;
    const delta = to - from;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (delta * easeOut)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [value, startValue, duration]);

  return <span>{displayValue}</span>;
}

/**
 * Drill Progression Overlay Component
 *
 * Shows animated brain score progression after completing a drill.
 * Highlights the specific domain that was trained.
 */
export default function DrillProgressionOverlay({
  isOpen,
  onClose,
  targetDomain,
  newDomainScore,
  previousDomainScore = 0,
  scoreDelta,
  overallScore,
  tier,
  xpAwarded,
  goldAwarded,
  levelUp,
  improvement,
}: DrillProgressionOverlayProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { playLevelUpModalSound, playAchievementSound } = useSoundEffects();
  const isDarkMode = theme === 'dark';
  const improvementBadge = pickImprovementBadge(improvement);
  const ImprovementIcon = improvementBadge?.Icon;
  const [showScore, setShowScore] = useState(false);
  const [showDelta, setShowDelta] = useState(false);
  const [showOverall, setShowOverall] = useState(false);

  const domainConfig = DOMAIN_CONFIG[targetDomain];
  const Icon = domainConfig.icon;

  // Celebration audio + haptic on open — reserved for genuine milestones so it
  // doesn't double up on the in-drill complete sound (see pickProgressionSound).
  useEffect(() => {
    if (!isOpen) return;
    const kind = pickProgressionSound({ levelUp, improvement });
    if (kind === 'levelUp') playLevelUpModalSound();
    else if (kind === 'personalBest') playAchievementSound();
  }, [isOpen, levelUp, improvement, playLevelUpModalSound, playAchievementSound]);

  // Animate sequence
  useEffect(() => {
    if (isOpen) {
      setShowScore(false);
      setShowDelta(false);
      setShowOverall(false);

      const scoreTimer = setTimeout(() => setShowScore(true), 500);
      const deltaTimer = setTimeout(() => setShowDelta(true), 1200);
      const overallTimer = setTimeout(() => setShowOverall(true), 1800);

      return () => {
        clearTimeout(scoreTimer);
        clearTimeout(deltaTimer);
        clearTimeout(overallTimer);
      };
    }
    return undefined;
  }, [isOpen]);

  // Auto-close after animation
  useEffect(() => {
    if (isOpen) {
      const closeTimer = setTimeout(onClose, 4500);
      return () => clearTimeout(closeTimer);
    }
    return undefined;
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in-0 duration-300"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {/* Backdrop */}
          <div
            className={cn(
              'absolute inset-0',
              isDarkMode ? 'bg-neo-navy' : 'bg-neo-black',
              'animate-in fade-in-0 duration-300'
            )}
            style={{ opacity: 0.8 }}
            onClick={onClose}
          />

          {/* Content Card */}
          <div
            className={cn(
              'relative w-full max-w-sm rounded-neo border-4 border-neo-black shadow-hard-lg p-6',
              isDarkMode ? 'bg-neo-navy-light' : 'bg-white',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
            )}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className={cn(
                'absolute top-3 right-3 p-1.5 rounded-neo border-2 border-neo-black',
                'transition-all hover:scale-105',
                isDarkMode ? 'bg-neo-navy-elevated text-neo-white' : 'bg-gray-100 text-neo-black'
              )}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Level-up celebration banner — shows above header when drill promoted player to new level */}
            {levelUp && levelUp.newLevel > levelUp.previousLevel && (
              <div
                className="mb-4 flex items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-2 shadow-hard-sm animate-in fade-in-0 zoom-in-95 duration-300"
                role="status"
                aria-label={`Level up to ${levelUp.newLevel}`}
                style={{ animationDelay: '0.4s' }}
              >
                <Star className="h-4 w-4 text-neo-black" fill="currentColor" />
                <span className="font-neo-display text-xs font-black uppercase tracking-widest text-neo-black">
                  {t('brain.drills.levelUp', { level: levelUp.newLevel })}
                </span>
                <Star className="h-4 w-4 text-neo-black" fill="currentColor" />
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-6">
              <p
                className={cn(
                  'text-sm font-bold uppercase tracking-wide mb-2',
                  'animate-in fade-in-0 duration-300',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
                )}
              >
                {t('brain.drills.brainTraining')}
              </p>
              <h2
                className={cn(
                  'text-xl font-black uppercase',
                  'animate-in fade-in-0 duration-300',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}
                style={{ animationDelay: '0.1s' }}
              >
                {t(`brain.domains.${targetDomain}`)}
              </h2>
            </div>

            {/* Domain Icon with Animation */}
            <div
              className="flex justify-center mb-6 animate-in zoom-in-50 duration-300"
              style={{ animationDelay: '0.2s' }}
            >
              <div
                className={cn(
                  'w-20 h-20 rounded-neo border-4 border-neo-black flex items-center justify-center',
                  domainConfig.bgColor
                )}
              >
                <Icon className="w-10 h-10 text-neo-black" />
              </div>
            </div>

            {/* Score Display */}
            <>
              {showScore && (
                <div
                  className="text-center mb-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn(
                      'text-5xl font-black',
                      isDarkMode ? 'text-neo-white' : 'text-neo-black'
                    )}>
                      <AnimatedScore value={newDomainScore} startValue={previousDomainScore} />
                    </span>
                    <span className={cn(
                      'text-xl font-bold',
                      isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
                    )}>
                      /100
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className={cn(
                    'h-3 mt-3 rounded-full border-2 border-neo-black overflow-hidden',
                    isDarkMode ? 'bg-neo-navy-elevated' : 'bg-gray-200'
                  )}>
                    <div
                      className={cn('h-full', domainConfig.bgColor)}
                      style={{ width: `${newDomainScore}%` }}
                    />
                  </div>
                </div>
              )}
            </>

            {/* Improvement badge — the single most flattering true "you got better" signal */}
            <>
              {showDelta && improvementBadge && ImprovementIcon && (
                <div
                  className="flex justify-center mb-4 animate-in fade-in-0 zoom-in-95 duration-300"
                  data-testid="drill-improvement-badge"
                  style={{ animationDelay: '0s' }}
                >
                  <div className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-neo border-3 border-neo-black',
                    improvementBadge.bg
                  )}>
                    <ImprovementIcon className="w-5 h-5 text-neo-black" />
                    <span className="text-sm font-black uppercase tracking-wide text-neo-black">
                      {t(improvementBadge.key)}
                    </span>
                  </div>
                </div>
              )}
            </>

            {/* Delta Display - Only show positive gains with upward arrow */}
            <>
              {showDelta && scoreDelta > 0 && (
                <div
                  className="flex justify-center mb-4 animate-in fade-in-0 zoom-in-95 duration-300"
                  style={{ animationDelay: '0s' }}
                >
                  <div className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-neo border-3 border-neo-black',
                    'bg-neo-green'
                  )}>
                    <TrendingUp className="w-5 h-5 text-neo-black" />
                    <span className="text-lg font-black text-neo-black">
                      +{scoreDelta}
                    </span>
                  </div>
                </div>
              )}
            </>

            {/* Overall Score */}
            <>
              {showOverall && (
                <div
                  className={cn(
                    'text-center pt-4 mt-4 border-t-2',
                    'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
                    isDarkMode ? 'border-slate-700' : 'border-gray-200'
                  )}
                >
                  <p className={cn(
                    'text-xs font-bold uppercase tracking-wide mb-1',
                    isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
                  )}>
                    {t('brain.overallScore')}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn(
                      'text-2xl font-black',
                      isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
                    )}>
                      {overallScore}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-neo border-2 border-neo-black text-xs font-bold uppercase',
                      isDarkMode ? 'bg-neo-navy-elevated text-neo-white' : 'bg-gray-100 text-neo-black'
                    )}>
                      {t(`brain.tiers.${tier}`)}
                    </span>
                  </div>
                </div>
              )}
            </>

            {/* XP + Gold rewards */}
            <>
              {showOverall && (xpAwarded !== undefined || goldAwarded !== undefined) && (
                <div
                  className="flex justify-center gap-3 mt-3 animate-in fade-in-0 duration-300"
                  style={{ animationDelay: '0.3s' }}
                >
                  {(xpAwarded ?? 0) > 0 && (
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-neo-black',
                      'bg-neo-cyan text-neo-black font-bold text-sm'
                    )}>
                      <Star className="w-4 h-4" />
                      {t('brain.drills.xpEarned', { xp: xpAwarded ?? 0 })}
                    </div>
                  )}
                  {(goldAwarded ?? 0) > 0 && (
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-neo-black',
                      'bg-neo-yellow text-neo-black font-bold text-sm'
                    )}>
                      <Coins className="w-4 h-4" />
                      {t('brain.drills.goldEarned', { gold: goldAwarded ?? 0 })}
                    </div>
                  )}
                </div>
              )}
            </>

            {/* Tap to close hint */}
            <p
              className={cn(
                'text-center text-xs mt-4 animate-in fade-in-0 duration-300',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}
              style={{ animationDelay: '2s', opacity: 0.5 }}
            >
              {t('common.tapToClose')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
