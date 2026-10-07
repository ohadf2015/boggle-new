'use client';

import { useState, type ReactNode } from 'react';
import { m } from 'framer-motion';
import {
  Timer, Hourglass, Check, X, Loader2,
} from 'lucide-react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useTiltEffect } from '@/hooks/useTiltEffect';
import { cn } from '@/lib/utils';

export interface QuestCardProps {
  challengeId: string;
  icon: ReactNode;
  title: string;
  tagline: string;
  /** Each value renders its own accent, icon, glow and art scrim — one owned
   *  colour per daily game, which is what makes the hub scannable. `purple` is
   *  Connections': without it the card fell through to `cyan` and rendered
   *  identically to Word Tower whenever Connections was the hero. */
  color: 'orange' | 'yellow' | 'cyan' | 'purple';
  status: 'new' | 'won' | 'lost';
  isLoadingStatus?: boolean;
  onPlay: () => void;
  buttonText: string;
  timeMode: 'timed' | 'relaxed';
  timeModeLabel: string;
  delay?: number;
  previewImageUrl?: string;
}

export function QuestCard({
  challengeId,
  icon,
  title,
  tagline,
  color,
  status,
  isLoadingStatus = false,
  onPlay,
  buttonText,
  timeMode,
  timeModeLabel,
  delay = 0,
  previewImageUrl,
}: QuestCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  const { ref, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
    maxTilt: 10,
    hoverScale: 1.03,
    perspective: 800,
  });

  const handleMouseEnter = () => {
    setIsHovered(true);
    tiltHandlers.onMouseEnter();
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
    tiltHandlers.onMouseLeave();
  };

  const isCompleted = status === 'won' || status === 'lost';
  const showEffects = enableComplexAnimations && !prefersReducedMotion;
  const isNew = status === 'new';

  /* One owned colour per game — the hub is scanned, not read, and colour is how a
     returning player finds the game they want without parsing three titles.
     `yellow` used to fall through to the cyan branch, which made two of the three
     daily games visually interchangeable.

     Tailwind only emits a class when the literal string appears in source, so
     these are spelled out in full rather than composed as `bg-neo-${color}`. */
  const COLOR_CONFIGS = {
    orange: {
      text: 'text-neo-orange',
      bg: 'bg-neo-orange',
      pill: 'bg-neo-orange/20 border-neo-orange text-neo-orange',
      iconBg: 'bg-neo-orange',
      gradient: 'from-neo-orange/15',
      accent: 'bg-neo-orange',
      glow: 'bg-neo-orange/30',
      // Scrim keeps the art legible but carries the game's hue, so the card reads
      // as "the orange one" at a glance instead of as generic dark slate.
      scrim: 'from-neo-navy via-neo-navy/85 to-neo-orange/45',
    },
    yellow: {
      text: 'text-neo-yellow',
      bg: 'bg-neo-yellow',
      pill: 'bg-neo-yellow/20 border-neo-yellow text-neo-yellow',
      iconBg: 'bg-neo-yellow',
      gradient: 'from-neo-yellow/15',
      accent: 'bg-neo-yellow',
      glow: 'bg-neo-yellow/30',
      scrim: 'from-neo-navy via-neo-navy/85 to-neo-yellow/45',
    },
    cyan: {
      text: 'text-neo-cyan',
      bg: 'bg-neo-cyan',
      pill: 'bg-neo-cyan/20 border-neo-cyan text-neo-cyan',
      iconBg: 'bg-neo-cyan',
      gradient: 'from-neo-cyan/15',
      accent: 'bg-neo-cyan',
      glow: 'bg-neo-cyan/30',
      scrim: 'from-neo-navy via-neo-navy/85 to-neo-cyan/45',
    },
    purple: {
      text: 'text-neo-purple',
      bg: 'bg-neo-purple',
      pill: 'bg-neo-purple/20 border-neo-purple text-neo-purple',
      iconBg: 'bg-neo-purple',
      gradient: 'from-neo-purple/15',
      accent: 'bg-neo-purple',
      glow: 'bg-neo-purple/30',
      scrim: 'from-neo-navy via-neo-navy/85 to-neo-purple/45',
    },
  } as const;

  const colorConfig = COLOR_CONFIGS[color] ?? COLOR_CONFIGS.cyan;

  const handleClick = onPlay;

  return (
    <m.div
      // Opacity-only entrance: a y-transform moves the hit target during the
      // spring, so the first START QUEST tap landed on empty space. Keep the
      // card interactive from the first paint of the animation.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      // `w-full` is load-bearing: the daily hub stacks these in a
      // `flex flex-col items-center` column, which shrinks any child that does
      // not opt out to its intrinsic content width. Without it the chain
      // rendered three different widths (Wheel 219px, Tower 349px, played hero
      // 360px) purely from how long each tagline happened to be.
      className="relative w-full"
      data-testid={`quest-card-${challengeId}`}
    >
      {/* Glow ring for new challenges — breathing lives here (not on the
          clickable card) so the CSS scale transform cannot displace the CTA. */}
      {isNew && (
        <div className={cn('absolute -inset-0.5 rounded-xl -z-10 pointer-events-none', colorConfig.glow, showEffects && 'animate-breathing')} />
      )}

      <div
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={tiltHandlers.onMouseMove}
        // No touch tilt: the first-touch scale(1.03) moved the card under the
        // finger so pointerup missed and START QUEST needed a second press.
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          'relative w-full bg-neo-navy/95 rounded-xl border-3 border-neo-black',
          'shadow-hard overflow-hidden cursor-pointer',
          'flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4',
          previewImageUrl && 'min-h-[170px] md:min-h-[130px]',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
          'transition-shadow duration-200 group',
          /* A finished game steps back so the eye lands on what is still waiting
             today. `opacity-85` alone was a 15% drop — invisible in practice, which
             left all three cards at identical weight. Desaturating the artwork is
             what actually reads at a glance, and it makes the hub look different as
             the day progresses. */
          isCompleted && 'opacity-70 grayscale-[0.85] saturate-50',
        )}
        style={{
          ...tiltStyle,
          ...(previewImageUrl ? {
            backgroundImage: `url(${previewImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          } : {}),
        }}
      >
        {/* Accent strip */}
        <div
          data-testid="quest-card-accent"
          className={cn('absolute inset-e-0 top-0 bottom-0 w-2', colorConfig.accent)}
        />

        {/* Gradient overlay */}
        {!previewImageUrl && (
          <div className={cn(
            'absolute inset-x-0 top-0 h-16 bg-linear-to-b to-transparent pointer-events-none',
            colorConfig.gradient
          )} />
        )}
        {previewImageUrl && (
          <div
            data-testid="quest-card-image-overlay"
            className={cn(
              'absolute inset-0 bg-linear-to-t pointer-events-none',
              colorConfig.scrim,
            )}
          />
        )}

        {/* Holographic shimmer on hover */}
        {showEffects && isHovered && (
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="absolute top-0 w-[60%] h-full bg-linear-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-hologram-shimmer"
              style={{ left: '-150%' }}
            />
          </div>
        )}

        <div className="flex items-start justify-between relative z-10 md:flex-col md:items-center md:gap-2 md:shrink-0">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full border-2 text-[10px] font-black uppercase tracking-wide',
            colorConfig.pill
          )}>
            {timeMode === 'timed'
              ? <Timer className="w-3.5 h-3.5" />
              : <Hourglass className="w-3.5 h-3.5" />
            }
            <span>{timeModeLabel}</span>
          </div>

          <div className="relative">
            <div className={cn(
              'w-10 h-10 rounded-full border-2 border-neo-black',
              'flex items-center justify-center text-neo-black',
              'shadow-hard-xs group-hover:scale-110 transition-transform',
              colorConfig.iconBg
            )}>
              <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
            </div>

            {!isLoadingStatus && isCompleted && (
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  'absolute -top-1 -inset-s-1 p-0.5 rounded-full border-2 border-neo-black shadow-hard-xs',
                  status === 'won' ? 'bg-neo-lime' : 'bg-neo-pink'
                )}
                data-testid={status === 'won' ? 'won-badge' : 'lost-badge'}
              >
                {status === 'won'
                  ? <Check className="w-3 h-3 text-neo-black" strokeWidth={3} />
                  : <X className="w-3 h-3 text-neo-black" strokeWidth={3} />
                }
              </m.div>
            )}

            {isLoadingStatus && (
              <div className="absolute -top-1 -inset-s-1 p-0.5 rounded-full bg-neo-navy-elevated border border-slate-600">
                <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-1 md:flex-1 md:min-w-0">
          <h2 className={cn(
            'font-neo-display font-black leading-none',
            /* The scrim now carries the game's hue, so tinting the title too puts
               orange on orange over busy artwork — below WCAG AA. Identity still
               reads from the accent strip, the icon and the button. */
            previewImageUrl ? 'text-neo-white' : colorConfig.text,
            'text-2xl'
          )}>
            {title}
          </h2>
          <p className={cn(
            'text-[13px] line-clamp-2',
            /* A blind craft review measured this line at roughly 4.5:1 over the
               tinted card art — the AA threshold exactly, which is a floor, not a
               target. slate-400 was tuned for a flat dark card, not for artwork
               with a colour wash over it. */
            previewImageUrl ? 'text-neo-white/90' : 'text-slate-400',
          )}>
            {tagline}
          </p>
        </div>

        {/* CTA button */}
        <div className={cn(
          'relative z-10 font-black uppercase rounded-lg text-center',
          colorConfig.bg,
          'text-neo-black border-2 border-neo-black shadow-hard-sm',
          'active:translate-y-0.5 active:shadow-none transition-all',
          'w-full py-3 text-xs md:w-auto md:px-8 md:shrink-0'
        )}>
          {buttonText}
        </div>
      </div>
    </m.div>
  );
}
