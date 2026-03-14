'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Lock,
  Play,
  Crown,
  Swords,
  Skull,
  Coins,
  Gem,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface RPGLevelCardProps {
  levelNum: number;
  stars: number;
  maxStars: number;
  isUnlocked: boolean;
  isPerfect: boolean;
  isCurrent: boolean;
  isBoss: boolean;
  worldAccentColor: string;
  glowColor: string;
  onClick: () => void;
}

// Banner color per state
function getBannerClasses(isPerfect: boolean, isCurrent: boolean, isUnlocked: boolean, isBoss: boolean) {
  if (isBoss) return 'bg-neo-red/80';
  if (!isUnlocked) return 'bg-gray-700';
  if (isPerfect) return 'bg-neo-yellow';
  if (isCurrent) return 'bg-neo-lime';
  return 'bg-green-600';
}

function getBannerTextColor(isPerfect: boolean, isBoss: boolean, isUnlocked: boolean) {
  if (isPerfect || isBoss) return 'text-neo-black';
  if (!isUnlocked) return 'text-neo-white/40';
  return 'text-neo-white/80';
}

/**
 * RPGLevelCard — Trading-card-style level node for RPG level grid
 */
const RPGLevelCard = memo(function RPGLevelCard({
  levelNum,
  stars,
  maxStars,
  isUnlocked,
  isPerfect,
  isCurrent,
  isBoss,
  glowColor,
  onClick,
}: RPGLevelCardProps) {
  const { t } = useLanguage();
  const isLocked = !isUnlocked;
  const effectiveMaxStars = isBoss ? 5 : maxStars;

  const bannerClasses = getBannerClasses(isPerfect, isCurrent, isUnlocked, isBoss);
  const bannerText = getBannerTextColor(isPerfect, isBoss, isUnlocked);

  // Card shadow based on state
  const cardShadow = isBoss
    ? '6px 6px 0px rgba(255,51,102,0.5)'
    : '6px 6px 0px black';

  const cardBorder = isCurrent
    ? 'border-neo-lime'
    : isBoss
      ? 'border-neo-black'
      : 'border-neo-black';

  return (
    <motion.div
      className={cn(
        'relative rounded-neo-lg overflow-hidden cursor-pointer',
        'border-3 shadow-hard-lg',
        cardBorder,
        isBoss && 'col-span-2 border-4',
        isLocked && 'opacity-50 cursor-not-allowed',
        isCurrent && 'level-grid-current-pulse',
      )}
      style={{ boxShadow: cardShadow }}
      whileHover={isUnlocked ? { scale: 1.03, y: -4 } : undefined}
      whileTap={isUnlocked ? { scale: 0.97 } : undefined}
      onClick={isUnlocked ? onClick : undefined}
      data-testid={`level-card-${levelNum}`}
    >
      {/* Grain texture overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] card-grain" />

      {/* Card glass background */}
      <div className={cn(
        'relative',
        'bg-[rgba(15,15,35,0.85)] backdrop-blur-md',
        isBoss && 'min-h-[160px]',
      )}>
        {/* Top Banner Strip */}
        <div
          data-testid="card-banner"
          className={cn(
            'h-6 flex items-center justify-center gap-1.5',
            'border-b-3 border-neo-black',
            'chevron-texture',
            bannerClasses,
          )}
        >
          {isBoss && (
            <Swords data-testid="swords-icon" className={cn('w-3.5 h-3.5', bannerText)} />
          )}
          <span className={cn('text-[10px] font-neo-display font-black uppercase tracking-wider', bannerText)}>
            {isBoss ? t('adventure.boss') : isCurrent ? t('adventure.next') : t('adventure.lvl')}
          </span>
        </div>

        {/* Card Body */}
        <div className={cn('flex flex-col items-center py-4 px-3', isBoss && 'py-5')}>
          {/* Boss label above number */}
          {isBoss && (
            <span className="text-[10px] font-neo-display font-black text-neo-red uppercase tracking-widest mb-1">
              {t('adventure.boss')}
            </span>
          )}

          {/* Level Number or Lock */}
          {isLocked ? (
            <Lock data-testid="lock-icon" className="w-8 h-8 text-neo-white/30 mb-2" />
          ) : (
            <span
              data-testid="level-number"
              className={cn(
                'font-neo-display font-black text-neo-white leading-none mb-2',
                isBoss ? 'text-5xl' : 'text-4xl sm:text-5xl',
              )}
              style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.8)' }}
            >
              {levelNum}
            </span>
          )}

          {/* Stars Row */}
          <div className="flex items-center gap-1.5 mb-3">
            {Array.from({ length: effectiveMaxStars }).map((_, i) => {
              const isFilled = i < stars;
              return isFilled ? (
                <Star
                  key={i}
                  data-testid="star-filled"
                  className="w-5 h-5 text-neo-yellow fill-neo-yellow"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(255,225,53,0.6))' }}
                />
              ) : (
                <Star
                  key={i}
                  data-testid="star-empty"
                  className="w-5 h-5 text-neo-white/25"
                />
              );
            })}
          </div>

          {/* Play icon for current level */}
          {isCurrent && isUnlocked && (
            <Play
              data-testid="play-icon"
              className="w-5 h-5 text-neo-lime fill-neo-lime animate-bounce"
            />
          )}

          {/* Boss difficulty skulls */}
          {isBoss && (
            <div data-testid="difficulty-skulls" className="flex items-center gap-1 mt-1">
              {[1, 2, 3].map((i) => (
                <Skull key={i} className="w-3.5 h-3.5 text-neo-red/70" />
              ))}
            </div>
          )}
        </div>

        {/* Footer with reward tokens */}
        <div
          data-testid="reward-tokens"
          className="flex items-center justify-center gap-2 py-1.5 border-t-2 border-neo-black/20"
        >
          <Coins className={cn('w-3.5 h-3.5', isLocked ? 'text-neo-white/15' : 'text-neo-yellow/70')} />
          {(levelNum % 3 === 0 || isBoss) && (
            <Gem className={cn('w-3.5 h-3.5', isLocked ? 'text-neo-white/15' : isBoss ? 'text-neo-purple' : 'text-neo-cyan/70')} />
          )}
          {isBoss && (
            <Zap className={cn('w-3.5 h-3.5', isLocked ? 'text-neo-white/15' : 'text-neo-lime/70')} />
          )}
        </div>
      </div>

      {/* Perfect crown badge */}
      {isPerfect && isUnlocked && (
        <div
          data-testid="crown-badge"
          className="absolute -top-1 -right-1 rtl:-right-auto rtl:-left-1 w-7 h-7 bg-neo-yellow rounded-full border-2 border-neo-black flex items-center justify-center shadow-hard-sm z-20"
        >
          <Crown className="w-4 h-4 text-neo-black" />
        </div>
      )}

      {/* Locked chain stripes overlay */}
      {isLocked && (
        <div className="absolute inset-0 pointer-events-none z-10 chain-stripes" />
      )}

      {/* Current level pulse ring */}
      {isCurrent && isUnlocked && (
        <div
          className="absolute -inset-1 rounded-neo-lg border-[3px] border-neo-lime pointer-events-none z-20"
          style={{ animation: 'pulse-border 2s ease-in-out infinite' }}
        />
      )}
    </motion.div>
  );
});

export default RPGLevelCard;
