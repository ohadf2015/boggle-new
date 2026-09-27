'use client';

import { useEffect, useState } from 'react';
import { Zap, Brain, Target, Shuffle, BookOpen, TrendingUp, X, Star, Coins, Trophy, Sparkles, Feather, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { pickProgressionSound } from '@/lib/drills/progressionSound';
import type { CognitiveDomain } from '@/shared/types/cognitive';
import type { DrillImprovement } from '@/shared/utils/drillImprovement';
import type { BrainCheckAnalysis } from '@/shared/utils/brainCheck';
import BrainCheckVerdict from './BrainCheckVerdict';

interface DrillProgressionOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Called when overlay should close */
  onClose: () => void;
  /** The domain that was trained (drives icon + colour only) */
  targetDomain: CognitiveDomain;
  /** XP awarded for this drill (from server) */
  xpAwarded?: number;
  /** Gold awarded for this drill */
  goldAwarded?: number;
  /** Level change from the adaptive staircase (up = promoted, down = eased) */
  levelUp?: { newLevel: number; previousLevel: number };
  /** "You got better" signals — surfaces the single most flattering true one. */
  improvement?: DrillImprovement;
  /** Brain Check (fixed-protocol measurement) result, when this run was a check. */
  brainCheck?: { status: 'recorded' | 'rejected'; analysis: BrainCheckAnalysis | null };
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

const DOMAIN_CONFIG: Record<CognitiveDomain, { icon: typeof Zap; bgColor: string }> = {
  processingSpeed: { icon: Zap, bgColor: 'bg-neo-lime' },
  workingMemory: { icon: Brain, bgColor: 'bg-purple-400' },
  attention: { icon: Target, bgColor: 'bg-neo-orange' },
  flexibility: { icon: Shuffle, bgColor: 'bg-neo-cyan' },
  vocabulary: { icon: BookOpen, bgColor: 'bg-lime-400' },
};

/**
 * Post-drill reward card: level change, the one true "you got better" badge,
 * XP/gold — and, for a Brain Check, the honest trend verdict. It deliberately
 * shows no 0-100 "domain score": that number was never a measurement.
 */
export default function DrillProgressionOverlay({
  isOpen,
  onClose,
  targetDomain,
  xpAwarded,
  goldAwarded,
  levelUp,
  improvement,
  brainCheck,
}: DrillProgressionOverlayProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { playLevelUpModalSound, playAchievementSound } = useSoundEffects();
  const isDarkMode = theme === 'dark';
  const improvementBadge = pickImprovementBadge(improvement);
  const ImprovementIcon = improvementBadge?.Icon;
  const [showDelta, setShowDelta] = useState(false);
  const [showOverall, setShowOverall] = useState(false);
  const promoted = !!levelUp && levelUp.newLevel > levelUp.previousLevel;
  const eased = !!levelUp && levelUp.newLevel < levelUp.previousLevel;

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
      setShowDelta(false);
      setShowOverall(false);

      const deltaTimer = setTimeout(() => setShowDelta(true), 1200);
      const overallTimer = setTimeout(() => setShowOverall(true), 1800);

      return () => {
        clearTimeout(deltaTimer);
        clearTimeout(overallTimer);
      };
    }
    return undefined;
  }, [isOpen]);

  // Auto-close after animation — but never on a Brain Check result, which is
  // meant to be read.
  useEffect(() => {
    if (isOpen && !brainCheck) {
      const closeTimer = setTimeout(onClose, 4500);
      return () => clearTimeout(closeTimer);
    }
    return undefined;
  }, [isOpen, onClose, brainCheck]);

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
            {promoted && levelUp && (
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

            {eased && (
              <div
                className="mb-4 flex items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-cyan px-3 py-2 shadow-hard-sm"
                role="status"
              >
                <Feather className="h-4 w-4 text-neo-black" />
                <span className="font-neo-display text-xs font-black uppercase tracking-widest text-neo-black">
                  {t('brain.drills.levelEased')}
                </span>
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
                {t(brainCheck ? 'brain.check.title' : 'brain.drills.brainTraining')}
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

            {brainCheck && (
              <div
                data-testid="brain-check-result"
                className={cn(
                  'mb-4 rounded-neo border-3 border-neo-black p-3',
                  isDarkMode ? 'bg-neo-navy text-neo-white' : 'bg-neo-cream text-neo-black'
                )}
              >
                {brainCheck.status === 'rejected' || !brainCheck.analysis ? (
                  <p className="text-sm font-bold">{t('brain.check.rejected')}</p>
                ) : (
                  <BrainCheckVerdict analysis={brainCheck.analysis} />
                )}
                <p className="mt-2 flex items-start gap-1.5 text-xs opacity-80">
                  <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {t('brain.check.fixedConditions')}
                </p>
              </div>
            )}

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
