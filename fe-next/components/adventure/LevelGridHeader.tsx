'use client';

import { memo, useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface LevelGridHeaderProps {
  world: { id: number; name: string; colorPrimary: string; mechanic: string | null };
  worldStars: number;
  maxWorldStars: number;
  completedLevels: number;
  totalLevels: number;
  glowColor: string;
  worldColors: { text: string; bg: string };
}

/**
 * LevelGridHeader — Dramatic world banner with integrated progress and mastery ring
 */
const LevelGridHeader = memo(function LevelGridHeader({
  world,
  worldStars,
  maxWorldStars,
  completedLevels,
  totalLevels,
  glowColor,
}: LevelGridHeaderProps) {
  const { t } = useLanguage();

  const worldName = t(`adventure.worlds.${world.name}`) || world.name;
  const masteryPercent = useMemo(
    () => (totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0),
    [completedLevels, totalLevels]
  );
  const starFillPercent = useMemo(
    () => (maxWorldStars > 0 ? Math.round((worldStars / maxWorldStars) * 100) : 0),
    [worldStars, maxWorldStars]
  );

  // SVG circle math for mastery ring
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (masteryPercent / 100) * ringCircumference;

  const isPerfect = masteryPercent === 100;

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center mb-6"
    >
      {/* Main banner card */}
      <div className={cn(
        'relative w-full max-w-md overflow-hidden',
        'rounded-neo-lg border-3 border-neo-black shadow-hard-lg',
        'bg-neo-navy-light',
      )}>
        {/* World-colored gradient banner at top */}
        <div
          className="h-2 relative"
          style={{
            background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
          }}
        />

        {/* Content row: shield + title + mastery ring */}
        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
          {/* Shield Emblem — larger, more detailed */}
          <div data-testid="shield-emblem" className="relative shrink-0">
            <svg viewBox="0 0 52 58" width="52" height="58" className="drop-shadow-[2px_2px_0px_black]">
              <path
                d="M26 2 L48 14 L48 36 Q48 50 26 56 Q4 50 4 36 L4 14 Z"
                fill="#1a1a2e"
                stroke="black"
                strokeWidth="3.5"
              />
              <path
                d="M26 6 L44 16 L44 35 Q44 47 26 52 Q8 47 8 35 L8 16 Z"
                fill="none"
                stroke={glowColor}
                strokeWidth="2"
                opacity={0.7}
              />
              {/* Inner glow fill */}
              <path
                d="M26 10 L40 18 L40 34 Q40 44 26 48 Q12 44 12 34 L12 18 Z"
                fill={glowColor}
                opacity={0.08}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center font-neo-display font-black text-neo-white text-2xl"
              style={{ textShadow: `2px 2px 0px rgba(0,0,0,0.8), 0 0 8px ${glowColor}` }}
            >
              {world.id}
            </span>
          </div>

          {/* Title + stats */}
          <div className="flex-1 min-w-0">
            <h2
              className="font-neo-display font-black text-neo-white leading-tight text-xl sm:text-2xl uppercase tracking-tight line-clamp-2"
              style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.9)' }}
            >
              {worldName}
            </h2>
            <div dir="ltr" className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-neo-yellow fill-neo-yellow" />
                <span className="font-mono font-bold text-neo-yellow text-xs tabular-nums">
                  {worldStars}/{maxWorldStars}
                </span>
              </div>
              <span className="text-neo-white text-xs">·</span>
              <span className="font-mono text-neo-white text-xs tabular-nums">
                {completedLevels}/{totalLevels} {t('adventure.lvl')}
              </span>
              {isPerfect && (
                <Sparkles className="w-3.5 h-3.5 text-neo-yellow" />
              )}
            </div>
          </div>

          {/* Mastery Ring — cleaner */}
          <div data-testid="mastery-ring" className="relative shrink-0 w-16 h-16">
            <svg viewBox="0 0 64 64" width="64" height="64" className="transform -rotate-90">
              {/* Track */}
              <circle
                cx="32" cy="32" r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
              />
              {/* Fill */}
              <circle
                cx="32" cy="32" r={ringRadius}
                fill="none"
                stroke={glowColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-700"
                style={masteryPercent > 0 ? { filter: `drop-shadow(0 0 3px ${glowColor})` } : undefined}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-neo-display font-black text-neo-white text-sm">
              {masteryPercent}%
            </span>
          </div>
        </div>

        {/* Star progress bar — full-width at bottom */}
        <div className="px-4 pb-3 sm:px-5 sm:pb-4">
          <div
            data-testid="star-progress-bar"
            className={cn(
              'h-2.5 rounded-full overflow-hidden',
              'bg-neo-black/40 border border-neo-black/30'
            )}
          >
            <div
              data-testid="star-progress-fill"
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${starFillPercent}%`,
                background: `linear-gradient(90deg, ${glowColor}, ${glowColor.replace(/[\d.]+\)$/, '0.6)')})`,
                boxShadow: starFillPercent > 0 ? `0 0 8px ${glowColor}` : 'none',
              }}
            />
          </div>
        </div>

        {/* Subtle ambient glow at bottom */}
        <div
          className="absolute bottom-0 inset-x-0 h-16 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${glowColor.replace(/[\d.]+\)$/, '0.04)')}, transparent)` }}
        />
      </div>

      {/* Ornamental Divider */}
      <div data-testid="ornamental-divider" className="flex items-center w-full max-w-md gap-2 mt-4">
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${glowColor.replace(/[\d.]+\)$/, '0.2)')}, transparent)` }} />
        <svg viewBox="0 0 16 16" width="10" height="10" className="shrink-0">
          <rect
            x="3" y="3" width="10" height="10"
            transform="rotate(45 8 8)"
            fill={glowColor}
            stroke="black"
            strokeWidth="1.5"
          />
        </svg>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${glowColor.replace(/[\d.]+\)$/, '0.2)')}, transparent)` }} />
      </div>
    </AdaptiveMotion.div>
  );
});

export default LevelGridHeader;
