'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
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

/**
 * RPGLevelCard — Polished trading-card-style level node with world-colored accents
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
  const isCompleted = stars > 0;

  // Dynamic shadow: world-colored glow for current/boss, hard black otherwise
  const cardShadow = isCurrent
    ? `4px 4px 0px black, 0 0 20px ${glowColor}`
    : isBoss
      ? '4px 4px 0px rgba(255,51,102,0.5), 0 0 16px rgba(255,51,102,0.2)'
      : '4px 4px 0px black';

  return (
    <AdaptiveMotion.div
      className={cn(
        'relative rounded-neo-lg overflow-hidden',
        'border-3',
        isBoss && 'col-span-2 border-4',
        isCurrent ? 'border-neo-lime' : isBoss ? 'border-neo-red/60' : 'border-neo-black',
        isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        isCurrent && 'level-grid-current-pulse',
      )}
      style={{ boxShadow: cardShadow }}
      role="button"
      tabIndex={isUnlocked ? 0 : -1}
      aria-disabled={isLocked}
      aria-label={isLocked
        ? t('adventure.levelLocked', { level: levelNum })
        : isBoss
          ? t('adventure.bossLevel', { level: levelNum })
          : t('adventure.playLevel', { level: levelNum, stars, maxStars })
      }
      onKeyDown={isUnlocked ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      } : undefined}
      whileHover={isUnlocked ? { scale: 1.04, y: -5 } : undefined}
      whileTap={isUnlocked ? { scale: 0.96 } : undefined}
      onClick={isUnlocked ? onClick : undefined}
      data-testid={`level-card-${levelNum}`}
    >
      {/* Grain texture overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] card-grain" />

      {/* Card background */}
      <div className={cn(
        'relative',
        'bg-[rgba(15,15,35,0.9)] backdrop-blur-xs',
        isBoss && 'min-h-[160px]',
      )}>
        {/* Top accent strip — world-colored gradient for unlocked, muted for locked */}
        <div
          data-testid="card-banner"
          className="h-1.5 relative overflow-hidden"
          style={{
            background: isLocked
              ? 'rgba(100,100,120,0.3)'
              : isBoss
                ? 'linear-gradient(90deg, #FF3366, #FF6699, #FF3366)'
                : isPerfect
                  ? 'linear-gradient(90deg, #FFE135, #FFA500, #FFE135)'
                  : `linear-gradient(90deg, ${glowColor}, transparent)`,
          }}
        />

        {/* Card Body */}
        <div className={cn('flex flex-col items-center py-4 px-3', isBoss && 'py-5')}>
          {/* Boss label */}
          {isBoss && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <Swords data-testid="swords-icon" className="w-3.5 h-3.5 text-neo-red" />
              <span className="text-[10px] font-neo-display font-black text-neo-red uppercase tracking-widest">
                {t('adventure.boss')}
              </span>
            </div>
          )}

          {/* Level Number or Lock */}
          {isLocked ? (
            <div className="flex flex-col items-center">
              <Lock data-testid="lock-icon" className="w-7 h-7 text-neo-white mb-1" />
              {levelNum > 1 && (
                <span className="text-[9px] text-neo-white font-neo-body text-center leading-tight">
                  {t('adventure.unlockRequirement', { level: String(levelNum - 1) })}
                </span>
              )}
            </div>
          ) : (
            <span
              data-testid="level-number"
              className={cn(
                'font-neo-display font-black leading-none mb-2',
                isBoss ? 'text-5xl' : 'text-4xl sm:text-5xl',
                isCurrent ? 'text-neo-white' : isCompleted ? 'text-neo-white' : 'text-neo-white',
              )}
              style={{
                textShadow: isCurrent
                  ? `2px 2px 0px rgba(0,0,0,0.8), 0 0 12px ${glowColor}`
                  : '2px 2px 0px rgba(0,0,0,0.8)',
              }}
            >
              {levelNum}
            </span>
          )}

          {/* Stars Row — with size variation for filled stars */}
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: maxStars }).map((_, i) => {
              const isFilled = i < stars;
              return (
                <Star
                  key={`star-${i}`}
                  data-testid={isFilled ? 'star-filled' : 'star-empty'}
                  className={cn(
                    'transition-all duration-300',
                    isFilled
                      ? 'w-5 h-5 text-neo-yellow fill-neo-yellow'
                      : 'w-4 h-4 text-neo-white fill-neo-white/5'
                  )}
                  style={isFilled ? { filter: 'drop-shadow(0 0 5px rgba(255,225,53,0.5))' } : undefined}
                />
              );
            })}
          </div>

          {/* Current level indicator */}
          {isCurrent && isUnlocked && (
            <div className="flex items-center gap-1.5">
              <Play
                data-testid="play-icon"
                className="w-4 h-4 text-neo-lime fill-neo-lime animate-bounce motion-reduce:animate-none"
              />
              <span className="text-[10px] font-black text-neo-lime uppercase tracking-wide">
                {t('adventure.next')}
              </span>
            </div>
          )}

          {/* Boss difficulty skulls */}
          {isBoss && (
            <div data-testid="difficulty-skulls" className="flex items-center gap-1 mt-1">
              {[1, 2, 3].map((i) => (
                <Skull key={`skull-${i}`} className="w-3 h-3 text-neo-red/60" />
              ))}
            </div>
          )}
        </div>

        {/* Footer with reward tokens — cleaner separator */}
        <div
          data-testid="reward-tokens"
          className="flex items-center justify-center gap-2.5 py-1.5 border-t border-neo-white/5"
        >
          <Coins className={cn('w-3.5 h-3.5', isLocked ? 'text-neo-white' : 'text-neo-yellow/60')} />
          {(levelNum % 3 === 0 || isBoss) && (
            <Gem className={cn('w-3.5 h-3.5', isLocked ? 'text-neo-white' : isBoss ? 'text-neo-purple/80' : 'text-neo-cyan/60')} />
          )}
          {isBoss && (
            <Zap className={cn('w-3.5 h-3.5', isLocked ? 'text-neo-white' : 'text-neo-lime/60')} />
          )}
        </div>

        {/* Inner ambient glow for current level */}
        {isCurrent && isUnlocked && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${glowColor.replace(/[\d.]+\)$/, '0.08)')}, transparent 70%)`,
            }}
          />
        )}
      </div>

      {/* Perfect crown badge */}
      {isPerfect && isUnlocked && (
        <div
          data-testid="crown-badge"
          className="absolute -top-1 -inset-e-1 w-7 h-7 bg-neo-yellow rounded-full border-2 border-neo-black flex items-center justify-center shadow-hard-sm z-20"
        >
          <Crown className="w-4 h-4 text-neo-black" />
        </div>
      )}

      {/* Locked chain stripes overlay */}
      {isLocked && (
        <div className="absolute inset-0 pointer-events-none z-10 chain-stripes" />
      )}

      {/* Current level pulse ring — world-colored */}
      {isCurrent && isUnlocked && (
        <div
          className="absolute -inset-1 rounded-neo-lg border-3 border-neo-lime pointer-events-none z-20"
          style={{ animation: 'pulse-border 2s ease-in-out infinite' }}
        />
      )}
    </AdaptiveMotion.div>
  );
});

export default RPGLevelCard;
