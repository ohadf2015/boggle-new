import { memo, useMemo, useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { Sparkles, Star } from 'lucide-react';
import PrestigeModal from './engagement/PrestigeModal';

import {
  getXpProgress,
  getLevelFromXp,
  getXpForLevel,
  PRESTIGE_CONFIG,
  type PrestigeReward,
} from '@/backend/modules/xpManager';

/**
 * Per-tier visual recipe — gradient + star fill + glint count.
 * Tier feel layered: bronze flat → silver shine → gold sparkle →
 * diamond ice → cosmic nebula. Each step adds one more mini-glint.
 */
interface PrestigeTierVisual {
  gradient: string;     // outer chip background
  starFill: string;     // star body color (neo-cream / neo-yellow on dark gradients)
  starStroke: string;   // outline stroke
  glintColor: string;   // shine dot color
  extraGlints: number;  // 0..4 mini-shine dots scattered behind
}

const PRESTIGE_VISUALS: Record<number, PrestigeTierVisual> = {
  1: { gradient: 'from-amber-600 to-orange-500',     starFill: '#FFE9B0', starStroke: '#3a1a00', glintColor: '#FFF6D8', extraGlints: 0 }, // Bronze
  2: { gradient: 'from-zinc-300 to-slate-100',       starFill: '#FFFFFF', starStroke: '#1a1a2e', glintColor: '#FFFFFF', extraGlints: 1 }, // Silver
  3: { gradient: 'from-yellow-500 to-amber-300',     starFill: '#FFFBE0', starStroke: '#3a2a00', glintColor: '#FFFFFF', extraGlints: 2 }, // Gold
  4: { gradient: 'from-cyan-300 via-sky-200 to-cyan-100', starFill: '#FFFFFF', starStroke: '#0a3a55', glintColor: '#FFFFFF', extraGlints: 3 }, // Diamond
  5: { gradient: 'from-fuchsia-600 via-violet-500 to-purple-700', starFill: '#FFE6FF', starStroke: '#FFFFFF', glintColor: '#FFFFFF', extraGlints: 4 }, // Cosmic
};

/**
 * Pre-computed glint positions (top%, start%) for tiers 2..5.
 * Uses CSS `start` so RTL flips automatically.
 */
const GLINT_POSITIONS: Array<{ top: string; start: string; size: number }> = [
  { top: '10%', start: '78%', size: 2 },
  { top: '70%', start: '8%',  size: 2 },
  { top: '20%', start: '20%', size: 1 },
  { top: '60%', start: '88%', size: 1 },
];

/**
 * XpProgressBar Props
 */
interface XpProgressBarProps {
  totalXp?: number;
  compact?: boolean;
  showNumbers?: boolean;
  className?: string;
  // Prestige props
  prestigeLevel?: number;
  prestigeMultiplier?: number;
  showPrestige?: boolean;
  nextPrestigeRewards?: PrestigeReward[];
  onPrestigeSuccess?: () => void;
}

/**
 * Neo-Brutalist XP Progress Bar Component
 * Shows level progress with animated fill bar and prestige indicator
 */
const XpProgressBar = memo<XpProgressBarProps>(({
  totalXp = 0,
  compact = false,
  showNumbers = true,
  className,
  prestigeLevel = 0,
  prestigeMultiplier = 1.0,
  showPrestige = true,
  nextPrestigeRewards = [],
  onPrestigeSuccess,
}) => {
  const { t, language } = useLanguage();
  const progress = useMemo(() => getXpProgress(totalXp), [totalXp]);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);

  const openPrestigeModal = useCallback(() => {
    setShowPrestigeModal(true);
  }, []);

  const prestigeDisplay = prestigeLevel > 0 && prestigeLevel <= 5
    ? { ...PRESTIGE_CONFIG.DISPLAY[prestigeLevel], visual: PRESTIGE_VISUALS[prestigeLevel] }
    : null;

  const canPrestige = progress.isMaxLevel && prestigeLevel < 5;

  return (
    <div className={cn('w-full', className)}>
      {/* Level indicator and XP numbers */}
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-baseline gap-1.5',
                'font-neo-display font-black uppercase',
                'tracking-tight leading-none',
                'text-neo-black dark:text-neo-white',
                'drop-shadow-[1px_1px_0_rgba(0,0,0,0.25)] dark:drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]'
              )}
            >
              <span className="text-[13px] opacity-80">{t('xp.level')}</span>
              <span className="text-base tabular-nums">{progress.currentLevel}</span>
            </span>
            {/* Prestige Tier Chip — neo-brutalist hard-shadow pill */}
            {showPrestige && prestigeDisplay && (
              <button
                type="button"
                onClick={openPrestigeModal}
                data-testid="prestige-tier-chip"
                data-prestige-level={prestigeLevel}
                className={cn(
                  'group relative inline-flex items-center gap-1.5',
                  'px-2 py-0.5 rounded-md',
                  'border-2 border-neo-black',
                  'shadow-hard-sm hover:shadow-hard hover:-translate-y-px',
                  'active:translate-y-0 active:shadow-hard-pressed',
                  'transition-all duration-150 cursor-pointer overflow-hidden',
                  'bg-linear-to-b',
                  prestigeDisplay.visual.gradient
                )}
                title={`${prestigeDisplay.name} - Click for details`}
                aria-label={`${prestigeDisplay.name} - View prestige details`}
              >
                {/* Inner top highlight — cheap depth */}
                <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/40 to-transparent" />

                {/* Background glints (tier 2+) — RTL-safe via start- */}
                {Array.from({ length: prestigeDisplay.visual.extraGlints }).map((_, i) => {
                  const g = GLINT_POSITIONS[i];
                  return (
                    <span
                      key={i}
                      aria-hidden
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        top: g.top,
                        insetInlineStart: g.start,
                        width: `${g.size}px`,
                        height: `${g.size}px`,
                        background: prestigeDisplay.visual.glintColor,
                        opacity: 0.85,
                      }}
                    />
                  );
                })}

                {/* Star + shine glint */}
                <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
                  <Star
                    className="h-3.5 w-3.5 drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                    strokeWidth={2.25}
                    fill={prestigeDisplay.visual.starFill}
                    color={prestigeDisplay.visual.starStroke}
                  />
                  {/* Star surface glint */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute h-[3px] w-[3px] rounded-full"
                    style={{
                      top: '22%',
                      insetInlineStart: '28%',
                      background: prestigeDisplay.visual.glintColor,
                      opacity: 0.95,
                    }}
                  />
                </span>

                {/* Tier numeral */}
                <span
                  className={cn(
                    'relative font-black tabular-nums leading-none',
                    'text-[11px] tracking-tight',
                    'drop-shadow-[0_1px_0_rgba(0,0,0,0.45)]',
                    prestigeLevel === 2 ? 'text-neo-black' : 'text-white'
                  )}
                >
                  {prestigeLevel}
                </span>
              </button>
            )}
            {/* XP Multiplier — neo-brutalist solid lime pill */}
            {showPrestige && prestigeMultiplier > 1 && (
              <span
                data-testid="xp-multiplier-chip"
                className={cn(
                  'relative inline-flex items-center px-2 py-0.5 rounded-md',
                  'text-[11px] font-black tabular-nums tracking-tight leading-none',
                  'border-2 border-neo-black',
                  'bg-linear-to-b from-neo-lime to-neo-lime-dark',
                  'text-neo-black',
                  'shadow-hard-sm overflow-hidden'
                )}
              >
                <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/40 to-transparent" />
                <span className="relative">
                  {t('xp.xpBonus', { percent: Math.round((prestigeMultiplier - 1) * 100) })}
                </span>
              </span>
            )}
          </div>
          {showNumbers && !progress.isMaxLevel && (
            <span className="text-xs font-bold text-neo-black/75 dark:text-gray-300">
              {progress.xpInCurrentLevel.toLocaleString()} / {progress.xpNeededForNextLevel.toLocaleString()} XP
            </span>
          )}
          {progress.isMaxLevel && (
            <button
              type="button"
              onClick={showPrestige ? openPrestigeModal : undefined}
              className={cn(
                'text-xs font-bold flex items-center gap-1',
                canPrestige
                  ? 'text-neo-lime animate-pulse cursor-pointer hover:underline'
                  : 'text-neo-pink'
              )}
            >
              {canPrestige && <Sparkles className="w-3 h-3" />}
              {canPrestige
                ? (t('xp.canPrestige'))
                : (t('xp.maxLevel'))}
            </button>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div
        className={cn(
          'relative w-full rounded-neo overflow-hidden',
          'bg-neo-black/10 dark:bg-neo-white/10',
          'border-2 border-neo-black',
          compact ? 'h-2' : 'h-3'
        )}
      >
        {/* Animated fill */}
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${progress.progressPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            'absolute inset-y-0 left-0',
            'bg-linear-to-r from-neo-cyan via-neo-pink to-neo-pink',
            'shadow-xs'
          )}
        />

        {/* Shimmer effect */}
        <m.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
          className="absolute inset-y-0 w-1/4 bg-linear-to-r from-transparent via-white/30 to-transparent"
        />
      </div>

      {/* Compact mode shows level inline */}
      {compact && (
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-neo-black/75 dark:text-gray-300">
              {t('xp.compactLevel')} {progress.currentLevel}
            </span>
            {showPrestige && prestigeDisplay && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 px-1 rounded-sm',
                  'border border-neo-black',
                  'bg-linear-to-b',
                  prestigeDisplay.visual.gradient
                )}
              >
                <Star
                  className="h-2.5 w-2.5"
                  strokeWidth={2.5}
                  fill={prestigeDisplay.visual.starFill}
                  color={prestigeDisplay.visual.starStroke}
                />
                <span
                  className={cn(
                    'text-[9px] font-black tabular-nums leading-none',
                    prestigeLevel === 2 ? 'text-neo-black' : 'text-white'
                  )}
                >
                  {prestigeLevel}
                </span>
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-neo-black/75 dark:text-gray-300">
            {progress.progressPercent}%
          </span>
        </div>
      )}

      {/* Prestige Modal */}
      {showPrestige && (
        <PrestigeModal
          isOpen={showPrestigeModal}
          onClose={() => setShowPrestigeModal(false)}
          currentLevel={progress.currentLevel}
          currentPrestige={prestigeLevel}
          prestigeMultiplier={prestigeMultiplier}
          nextRewards={nextPrestigeRewards}
          canPrestige={canPrestige}
          maxPrestige={5}
          t={t}
          language={language}
          onPrestigeSuccess={onPrestigeSuccess}
        />
      )}
    </div>
  );
});

XpProgressBar.displayName = 'XpProgressBar';

export default XpProgressBar;
export { getLevelFromXp, getXpForLevel };
