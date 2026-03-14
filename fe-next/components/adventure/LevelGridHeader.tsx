'use client';

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
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
 * LevelGridHeader — RPG-style header with shield emblem, mastery ring, star progress bar
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
  const ringRadius = 22;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (masteryPercent / 100) * ringCircumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center mb-5"
    >
      {/* Shield + Title + Mastery Ring */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3">
        {/* Shield Emblem */}
        <div data-testid="shield-emblem" className="relative flex-shrink-0">
          <svg viewBox="0 0 52 58" width="48" height="54" className="drop-shadow-[2px_2px_0px_black]">
            <path
              d="M26 2 L48 14 L48 36 Q48 50 26 56 Q4 50 4 36 L4 14 Z"
              fill="#1a1a2e"
              stroke="black"
              strokeWidth="4"
            />
            <path
              d="M26 6 L44 16 L44 35 Q44 47 26 52 Q8 47 8 35 L8 16 Z"
              fill="none"
              stroke={glowColor}
              strokeWidth="2.5"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-neo-display font-black text-neo-white text-xl"
            style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.8)' }}
          >
            {world.id}
          </span>
        </div>

        {/* World Name */}
        <h2
          className="font-neo-display font-bold text-neo-white leading-tight text-2xl sm:text-[28px]"
          style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.9)' }}
        >
          {worldName}
        </h2>

        {/* Mastery Ring */}
        <div data-testid="mastery-ring" className="relative flex-shrink-0 w-14 h-14">
          <svg viewBox="0 0 56 56" width="56" height="56" className="transform -rotate-90">
            {/* Track */}
            <circle
              cx="28" cy="28" r={ringRadius}
              fill="none"
              stroke="rgba(191,255,0,0.15)"
              strokeWidth="4"
            />
            {/* Fill */}
            <circle
              cx="28" cy="28" r={ringRadius}
              fill="none"
              stroke={glowColor}
              strokeWidth="4"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-neo-display font-black text-neo-white text-xs">
            {masteryPercent}%
          </span>
        </div>
      </div>

      {/* Star Progress Bar */}
      <div className="w-full max-w-xs sm:max-w-sm mb-3">
        <div className="flex items-center justify-end gap-1.5 mb-1">
          <Star className="w-4 h-4 text-neo-yellow fill-neo-yellow" />
          <span className="font-neo-body font-bold text-neo-white text-sm">
            {worldStars}/{maxWorldStars}
          </span>
        </div>
        <div
          data-testid="star-progress-bar"
          className={cn(
            'h-4 rounded-neo border-3 border-neo-black shadow-hard-sm',
            'bg-neo-black/40 overflow-hidden'
          )}
        >
          <div
            data-testid="star-progress-fill"
            className="h-full bg-neo-lime rounded-sm transition-all duration-500"
            style={{ width: `${starFillPercent}%` }}
          />
        </div>
      </div>

      {/* Ornamental Divider */}
      <div data-testid="ornamental-divider" className="flex items-center w-full max-w-md gap-2">
        <div className="flex-1 h-[2px] bg-neo-white/15" />
        <svg viewBox="0 0 16 16" width="12" height="12" className="flex-shrink-0">
          <rect
            x="3" y="3" width="10" height="10"
            transform="rotate(45 8 8)"
            fill={glowColor}
            stroke="black"
            strokeWidth="1.5"
          />
        </svg>
        <div className="flex-1 h-[2px] bg-neo-white/15" />
      </div>
    </motion.div>
  );
});

export default LevelGridHeader;
