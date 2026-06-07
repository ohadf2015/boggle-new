'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { m } from 'framer-motion';
import { ArrowRight, ArrowLeft, Users, LayoutGrid, Lock, Trophy, Clock, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTiltEffect } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { haptics } from '@/utils/haptics';
import { MascotHaloGlow, type HaloTone } from '@/components/mascot/MascotHaloGlow';
import { MODE_IMAGE_ENTRANCE } from '@/lib/landing/modeImageEntrance';

// Card variant → halo tone. Each tone amplifies the variant's existing
// accent (cyan/pink card gets pink-cyan halo; purple gets purple-pink; etc.)
// so the glow looks like the card's own color, not a sticker on top.
const VARIANT_HALO_TONE: Record<'cyan' | 'pink' | 'purple' | 'orange' | 'lime' | 'blue', HaloTone> = {
  cyan: 'pink-cyan',
  pink: 'pink-cyan',
  purple: 'purple-pink',
  orange: 'yellow-orange',
  lime: 'lime-cyan',
  blue: 'pink-cyan',
};

export interface LiveBadgeProps {
  openRooms: number;
  totalPlayers: number;
  roomsLabel: string;
  playersLabel: string;
}

interface PlayerCountProps {
  count: number;
  label: string;
}

interface PersonalBestProps {
  score: number;
  label: string;
}

interface ModeCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  variant: 'cyan' | 'pink' | 'purple' | 'orange' | 'lime' | 'blue';
  className?: string;
  liveBadge?: LiveBadgeProps;
  /** Simple player count indicator - shows "X playing now" style badge */
  playerCount?: PlayerCountProps;
  /** Personal best indicator - shows "X personal best" style badge with trophy */
  personalBest?: PersonalBestProps;
  /** Secondary cards are smaller and less prominent */
  secondary?: boolean;
  /** Shows lock icon and prevents navigation - for features requiring auth */
  locked?: boolean;
  /** Shows loading state - prevents showing locked state prematurely during auth loading */
  loading?: boolean;
  /** Message shown when card is locked */
  lockedMessage?: string;
  /** Callback when locked card is clicked */
  onLockedClick?: () => void;
  /** Callback when card is clicked (for analytics tracking) */
  onClick?: () => void;
  /** Optional badge to display (e.g., "NEW", "HOT") */
  badge?: string;
  /** Highlighted state for first-time players — adds pulsing glow and animated badge */
  highlighted?: boolean;
  /** Label for the highlighted badge (e.g., "Start Here") */
  highlightLabel?: string;
  /** Duration label (e.g., "1-3 min") */
  duration?: string;
  /** Difficulty level 1-3 */
  difficulty?: 1 | 2 | 3;
  /** Difficulty label (e.g., "Easy", "Medium", "Hard") */
  difficultyLabel?: string;
  /** Path to custom mode sticker image — replaces the small icon box with a large floating sticker */
  modeImage?: string;
  /** Above-the-fold LCP card — eager-loads the mode image at high fetch priority */
  priority?: boolean;
}

/**
 * ModeCard - Large clickable card for game mode selection
 * Clean Neo-Brutalist styling with 3D tilt effect and shine animation
 */
const ModeCard: React.FC<ModeCardProps> = ({
  title,
  description,
  href,
  icon,
  variant,
  className,
  liveBadge,
  playerCount,
  personalBest,
  secondary = false,
  locked = false,
  loading = false,
  lockedMessage,
  onLockedClick,
  onClick,
  badge,
  highlighted = false,
  highlightLabel,
  duration,
  difficulty,
  difficultyLabel,
  modeImage,
  priority = false,
}) => {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  // 3D tilt effect on hover - DRAMATIC for premium game feel
  const { ref, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
    maxTilt: 18,        // More dramatic tilt for game-like feel
    hoverScale: 1.06,   // Noticeable scale-up on hover
    perspective: 700,   // Strong 3D effect
  });

  // Combined handlers
  const handlers = {
    ...tiltHandlers,
    onMouseEnter: () => {
      setIsHovered(true);
      tiltHandlers.onMouseEnter();
    },
    onMouseLeave: () => {
      setIsHovered(false);
      tiltHandlers.onMouseLeave();
    },
  };

  const variantStyles = {
    cyan: {
      bg: 'bg-linear-to-br from-neo-navy via-neo-navy-light/80 to-neo-cyan/70',
      hoverBg: 'hover:to-neo-cyan/90',
      iconBg: 'bg-neo-cyan',
      iconText: 'text-neo-navy',
      arrow: 'bg-neo-cyan text-neo-navy',
      glowColor: 'rgba(0, 255, 255, 0.65)',
    },
    pink: {
      bg: 'bg-linear-to-br from-neo-navy via-neo-navy-light/80 to-neo-pink/70',
      hoverBg: 'hover:to-neo-pink/90',
      iconBg: 'bg-neo-pink',
      iconText: 'text-neo-navy',
      arrow: 'bg-neo-pink text-neo-navy',
      glowColor: 'rgba(255, 20, 147, 0.65)',
    },
    purple: {
      bg: 'bg-linear-to-br from-neo-navy via-neo-navy-light/80 to-neo-purple/70',
      hoverBg: 'hover:to-neo-purple/90',
      iconBg: 'bg-neo-purple',
      iconText: 'text-neo-white',
      arrow: 'bg-neo-purple text-neo-white',
      glowColor: 'rgba(139, 92, 246, 0.65)',
    },
    orange: {
      bg: 'bg-linear-to-br from-neo-navy via-neo-navy-light/80 to-neo-orange/70',
      hoverBg: 'hover:to-neo-orange/90',
      iconBg: 'bg-neo-orange',
      iconText: 'text-neo-navy',
      arrow: 'bg-neo-orange text-neo-navy',
      glowColor: 'rgba(255, 107, 53, 0.65)',
    },
    lime: {
      bg: 'bg-linear-to-br from-neo-navy via-neo-navy-light/80 to-neo-lime/70',
      hoverBg: 'hover:to-neo-lime/90',
      iconBg: 'bg-neo-lime',
      iconText: 'text-neo-navy',
      arrow: 'bg-neo-lime text-neo-navy',
      glowColor: 'rgba(163, 230, 53, 0.65)',
    },
    blue: {
      bg: 'bg-linear-to-br from-neo-navy via-neo-navy-light/80 to-blue-500/70',
      hoverBg: 'hover:to-blue-500/90',
      iconBg: 'bg-blue-500',
      iconText: 'text-neo-white',
      arrow: 'bg-blue-500 text-neo-white',
      glowColor: 'rgba(59, 130, 246, 0.65)',
    },
  };

  const styles = variantStyles[variant];

  const wrapperClassName = cn('block w-full h-full group focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy rounded-neo-lg', className);

  const cardContent = (
    <div
      ref={ref}
      className={cn(
        // Neo-Brutalist card base
        'rounded-neo-lg border-neo-black',
        secondary ? 'border-2 shadow-hard' : 'border-3 shadow-hard-lg',
        // Container query setup for responsive children
        'cq-container',
        locked ? 'cursor-not-allowed' : 'cursor-pointer',
        'relative',
        'overflow-hidden',
        // Full height to fill grid cell
        'h-full',
        // Colors - grayscale filter when locked for visual distinction
        locked ? 'grayscale' : '',
        styles.bg,
        !locked && styles.hoverBg,
        // Transitions - improved easing
        'transition-shadow duration-200 ease-out',
        // Active effect - press down (only when not locked)
        !locked && (isRTL
          ? 'active:-translate-x-px active:translate-y-px'
          : 'active:translate-x-px active:translate-y-px'),
        !locked && 'active:shadow-hard-pressed',
        highlighted && 'ring-4 ring-neo-lime ring-offset-2 ring-offset-neo-navy'
      )}
      style={{
        // Container-relative padding using cqw - smaller for secondary
        padding: secondary ? 'clamp(0.5rem, 3cqw, 1rem)' : 'clamp(0.75rem, 4cqw, 1.5rem)',
        // Hover glow effect via CSS filter (GPU-accelerated) instead of boxShadow
        filter: highlighted
          ? `drop-shadow(0 0 24px ${styles.glowColor})`
          : isHovered && !locked ? `drop-shadow(0 0 20px ${styles.glowColor})` : undefined,
        ...tiltStyle,
      }}
      {...handlers}
    >
      {/* Badge (e.g., NEW, HOT) - positioned in top-right corner */}
      {badge && !locked && (
        <div
          className={cn(
            'absolute top-2 inset-e-2 z-10',
            'px-2 py-0.5 sm:px-2.5 sm:py-1',
            'bg-neo-navy text-neo-white',
            'font-black uppercase tracking-wider',
            'text-[10px] sm:text-xs',
            'border-2 border-neo-black rounded-neo shadow-hard-sm',
            isRTL ? 'transform -rotate-3' : 'transform rotate-3'
          )}
        >
          {badge}
        </div>
      )}

      {/* Highlighted badge for first-time players — inner `animate-ping` dot
          already provides liveness via Tailwind CSS keyframes (browser
          throttles them off-screen). A framer-motion repeat:Infinity scale
          wrapper kept GPU paints firing on every mounted landing card and
          showed up as steady CPU drain. Static wrapper is enough. */}
      {highlighted && highlightLabel && (
        <div
          className={cn(
            'absolute top-2 z-10',
            isRTL ? 'left-2' : 'right-2'
          )}
        >
          <span
            className={cn(
              'inline-flex items-center gap-1.5',
              'px-2.5 py-1 sm:px-3 sm:py-1.5',
              'bg-neo-lime text-neo-black',
              'font-black uppercase tracking-wider',
              'text-[10px] sm:text-xs',
              'border-2 border-neo-black rounded-neo shadow-hard-sm',
              isRTL ? '-rotate-3' : 'rotate-3'
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-black opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neo-black" />
            </span>
            {highlightLabel}
          </span>
        </div>
      )}

      {/* Mode character — large blended illustration anchored to bottom-end,
          wrapped in MascotHaloGlow so the brand pulse sits behind it.
          Paused when the user prefers reduced motion or on low-end devices
          to keep the landing page cheap to paint. */}
      {modeImage && !secondary && (
        <m.div
          className={cn(
            'absolute pointer-events-none',
            isRTL ? 'bottom-0 left-0' : 'bottom-0 right-0'
          )}
          style={{
            width: 'clamp(5.5rem, 28cqw, 8rem)',
            height: 'clamp(5.5rem, 28cqw, 8rem)',
          }}
          {...MODE_IMAGE_ENTRANCE}
          animate={isHovered
            ? { scale: 1.08, y: -6, rotate: isRTL ? -5 : 5 }
            : { scale: 1, y: 0, rotate: 0 }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          <MascotHaloGlow
            tone={VARIANT_HALO_TONE[variant]}
            intensity={isHovered ? 'bold' : 'subtle'}
            paused={prefersReducedMotion || !enableComplexAnimations}
            scale={1.15}
            wrapperStyle={{ width: '100%', height: '100%' }}
          >
            <Image
              src={modeImage}
              alt=""
              fill
              priority={priority}
              className={cn(
                'object-contain',
                'drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
                isHovered ? 'brightness-110' : 'brightness-100'
              )}
              style={{
                filter: isHovered ? 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))' : undefined,
                transition: 'filter 0.3s ease',
              }}
              sizes="(max-width: 640px) 96px, 192px"
            />
          </MascotHaloGlow>
        </m.div>
      )}

      {/* Header with icon/title and arrow */}
      <div className={cn('flex items-center', secondary ? 'gap-2' : 'gap-2 sm:gap-3 lg:gap-4')} style={{ marginBottom: secondary ? 'clamp(0.125rem, 1cqw, 0.5rem)' : 'clamp(0.25rem, 1.5cqw, 0.75rem)' }}>
        {/* Icon box — only shown when no modeImage or secondary */}
        {(!modeImage || secondary) && (
          <div
            className={cn(
              'rounded-neo border-neo-black',
              secondary ? 'border shadow-hard-xs' : 'border-2 shadow-hard-sm',
              'flex items-center justify-center shrink-0',
              styles.iconBg
            )}
            style={{
              width: secondary ? 'clamp(1.5rem, 8cqw, 2.5rem)' : 'clamp(2rem, 10cqw, 3.5rem)',
              height: secondary ? 'clamp(1.5rem, 8cqw, 2.5rem)' : 'clamp(2rem, 10cqw, 3.5rem)',
            }}
          >
            <span className={styles.iconText} style={{ fontSize: secondary ? 'clamp(0.75rem, 4cqw, 1.25rem)' : 'clamp(1rem, 5cqw, 1.75rem)' }}>
              {icon}
            </span>
          </div>
        )}

        {/* Title */}
        <h2
          className={cn(
            'font-black uppercase tracking-tight flex-1 min-w-0',
            'text-neo-white',
            secondary && 'text-base sm:text-lg'
          )}
          style={secondary ? undefined : {
            fontSize: 'clamp(1.25rem, 6cqw, 2rem)',
          }}
        >
          {title}
        </h2>

        {/* Arrow/Lock indicator — always visible on mobile (tap affordance), reveal-on-hover on desktop */}
        <div
          className={cn(
            'min-w-[44px] min-h-[44px]',
            'rounded-full border-neo-black',
            secondary ? 'border' : 'border-2',
            'flex items-center justify-center shrink-0',
            'transition-all duration-200 ease-out',
            !locked && 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
            !locked && (isRTL ? 'lg:group-hover:-translate-x-1' : 'lg:group-hover:translate-x-1'),
            locked ? 'bg-neo-black/80 text-neo-white' : styles.arrow
          )}
          style={{
            width: secondary ? 'clamp(2.75rem, 6cqw, 3.25rem)' : 'clamp(2.75rem, 8cqw, 3.25rem)',
            height: secondary ? 'clamp(2.75rem, 6cqw, 3.25rem)' : 'clamp(2.75rem, 8cqw, 3.25rem)',
          }}
        >
          {loading ? (
            <Loader size="sm" />
          ) : locked ? (
            <Lock style={{ fontSize: secondary ? 'clamp(0.625rem, 3cqw, 0.875rem)' : 'clamp(0.75rem, 3.5cqw, 1rem)' }} />
          ) : (
            <ArrowIcon style={{ fontSize: secondary ? 'clamp(0.625rem, 3cqw, 0.875rem)' : 'clamp(0.75rem, 3.5cqw, 1rem)' }} />
          )}
        </div>
      </div>

      {/* Description - container-relative font size */}
      {/* drop-shadow-md added for WCAG AA contrast compliance on gradient backgrounds */}
      {/* White text for locked state for better contrast */}
      {/* Hide description for secondary cards to keep them compact */}
      {!secondary && (
        <p
          className={cn(
            'font-medium',
            'text-neo-white'
          )}
          style={{
            fontSize: 'clamp(0.875rem, 3.75cqw, 1.25rem)',
            marginBottom: 'clamp(0.375rem, 2cqw, 1rem)',
          }}
        >
          {description}
        </p>
      )}

      {/* Duration + Difficulty badges */}
      {!secondary && (duration || difficulty) && (
        <div className="flex flex-wrap" style={{ gap: 'clamp(0.375rem, 1.5cqw, 0.5rem)', marginBottom: 'clamp(0.25rem, 1cqw, 0.5rem)' }}>
          {duration && (
            <span
              className="inline-flex items-center bg-neo-white/10 text-neo-white font-bold rounded-neo border-2 border-neo-white/20"
              style={{
                gap: 'clamp(0.25rem, 1cqw, 0.375rem)',
                padding: 'clamp(0.125rem, 0.5cqw, 0.25rem) clamp(0.375rem, 1.5cqw, 0.5rem)',
                fontSize: 'clamp(0.625rem, 2.5cqw, 0.75rem)',
              }}
            >
              <Clock style={{ width: 'clamp(0.625rem, 2.5cqw, 0.875rem)', height: 'clamp(0.625rem, 2.5cqw, 0.875rem)' }} />
              {duration}
            </span>
          )}
          {difficulty && difficultyLabel && (
            <span
              className="inline-flex items-center bg-neo-white/10 text-neo-white font-bold rounded-neo border-2 border-neo-white/20"
              style={{
                gap: 'clamp(0.25rem, 1cqw, 0.375rem)',
                padding: 'clamp(0.125rem, 0.5cqw, 0.25rem) clamp(0.375rem, 1.5cqw, 0.5rem)',
                fontSize: 'clamp(0.625rem, 2.5cqw, 0.75rem)',
              }}
            >
              <Signal style={{ width: 'clamp(0.625rem, 2.5cqw, 0.875rem)', height: 'clamp(0.625rem, 2.5cqw, 0.875rem)' }} />
              {difficultyLabel}
            </span>
          )}
        </div>
      )}

      {/* Live Badge - shows open rooms and players only when meaningful (> 5) */}
      {/* Using bg-neo-cream for WCAG AA compliant contrast (19.8:1 vs neo-black) */}
      {/* Hide live badge for secondary cards */}
      {!secondary && liveBadge && (liveBadge.openRooms > 5 || liveBadge.totalPlayers > 5) && (
        <div className="flex flex-wrap" style={{ gap: 'clamp(0.375rem, 1.5cqw, 0.5rem)' }}>
          {liveBadge.openRooms > 5 && (
            <span
              className="inline-flex items-center bg-neo-cream text-neo-black font-bold rounded-neo border-2 border-neo-black shadow-hard-sm"
              style={{
                gap: 'clamp(0.25rem, 1cqw, 0.5rem)',
                padding: 'clamp(0.25rem, 1cqw, 0.375rem) clamp(0.5rem, 2cqw, 0.75rem)',
                fontSize: 'clamp(0.75rem, 3cqw, 0.875rem)',
              }}
            >
              <LayoutGrid style={{ width: 'clamp(0.75rem, 3cqw, 1rem)', height: 'clamp(0.75rem, 3cqw, 1rem)' }} />
              {liveBadge.openRooms} {liveBadge.roomsLabel}
            </span>
          )}
          {liveBadge.totalPlayers > 5 && (
            <span
              className="inline-flex items-center bg-neo-cream text-neo-black font-bold rounded-neo border-2 border-neo-black shadow-hard-sm"
              style={{
                gap: 'clamp(0.25rem, 1cqw, 0.5rem)',
                padding: 'clamp(0.25rem, 1cqw, 0.375rem) clamp(0.5rem, 2cqw, 0.75rem)',
                fontSize: 'clamp(0.75rem, 3cqw, 0.875rem)',
              }}
            >
              <Users style={{ width: 'clamp(0.75rem, 3cqw, 1rem)', height: 'clamp(0.75rem, 3cqw, 1rem)' }} />
              {liveBadge.totalPlayers} {liveBadge.playersLabel}
            </span>
          )}
        </div>
      )}

      {/* Simple Player Count Badge - shows when there are players */}
      {/* Only render when: (1) no liveBadge, or (2) liveBadge thresholds not met */}
      {/* This ensures small player counts are still shown */}
      {playerCount && playerCount.count > 0 &&
        (!liveBadge || (liveBadge.openRooms <= 5 && liveBadge.totalPlayers <= 5)) && (
        <div
          className="inline-flex items-center bg-neo-lime text-neo-black font-bold rounded-neo border-2 border-neo-black shadow-hard-sm"
          style={{
            gap: 'clamp(0.25rem, 1cqw, 0.5rem)',
            padding: 'clamp(0.25rem, 1cqw, 0.375rem) clamp(0.5rem, 2cqw, 0.75rem)',
            fontSize: secondary ? 'clamp(0.625rem, 2.5cqw, 0.75rem)' : 'clamp(0.75rem, 3cqw, 0.875rem)',
          }}
        >
          {/* Animated pulse dot for live indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-black opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neo-black" />
          </span>
          <Users style={{ width: 'clamp(0.75rem, 3cqw, 1rem)', height: 'clamp(0.75rem, 3cqw, 1rem)' }} />
          {playerCount.count} {playerCount.label}
        </div>
      )}

      {/* Personal Best Badge - shows user's all-time best score with trophy icon */}
      {personalBest && personalBest.score > 0 && !locked && (
        <div
          className="inline-flex items-center bg-neo-lime text-neo-black font-bold rounded-neo border-2 border-neo-black shadow-hard-sm"
          style={{
            gap: 'clamp(0.25rem, 1cqw, 0.5rem)',
            padding: 'clamp(0.25rem, 1cqw, 0.375rem) clamp(0.5rem, 2cqw, 0.75rem)',
            fontSize: secondary ? 'clamp(0.625rem, 2.5cqw, 0.75rem)' : 'clamp(0.75rem, 3cqw, 0.875rem)',
          }}
        >
          <Trophy style={{ width: 'clamp(0.75rem, 3cqw, 1rem)', height: 'clamp(0.75rem, 3cqw, 1rem)' }} />
          {personalBest.score.toLocaleString()} {personalBest.label}
        </div>
      )}
      {/* Premium animated effects */}
      {enableComplexAnimations && !prefersReducedMotion && (
        <>
          {/* Shine effect on hover */}
          <m.div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo-lg"
            initial={false}
            animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <m.div
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent"
              initial={{ x: '-100%' }}
              animate={isHovered ? { x: '200%' } : { x: '-100%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </m.div>

          {/* Decorative corner accent */}
          <m.div
            className="absolute top-0 inset-e-0 w-16 h-16 pointer-events-none overflow-hidden rounded-neo-lg"
            initial={false}
          >
            <m.div
              className="absolute -top-8 -inset-e-8 w-16 h-16 bg-white/10 rotate-45"
              animate={isHovered ? { scale: 1.2, opacity: 0.15 } : { scale: 1, opacity: 0.08 }}
              transition={{ duration: 0.3 }}
            />
          </m.div>
        </>
      )}

      {/* Locked overlay with message badge - hidden during loading to prevent flicker */}
      {locked && !loading && lockedMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5',
              'bg-neo-navy text-neo-white font-bold rounded-neo',
              'border-3 border-neo-black shadow-hard',
              'text-sm sm:text-base',
              'transform -rotate-3'
            )}
          >
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            {lockedMessage}
          </span>
        </div>
      )}
    </div>
  );

  // Render as button when locked (but not loading), Link when not locked
  // During loading, render as div to prevent interaction
  if (loading) {
    return (
      <div
        className={cn(wrapperClassName, 'cursor-wait')}
        aria-label={`${title} - Loading`}
        aria-busy="true"
      >
        {cardContent}
      </div>
    );
  }

  const handleLockedClick = () => {
    haptics.tap();
    onLockedClick?.();
  };

  const handleClick = () => {
    haptics.tap();
    onClick?.();
  };

  if (locked) {
    return (
      <button
        type="button"
        onClick={handleLockedClick}
        className={cn(wrapperClassName, 'text-left')}
        aria-label={`${title} - ${lockedMessage || 'Locked'}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link href={href} className={wrapperClassName} onClick={handleClick}>
      {cardContent}
    </Link>
  );
};

export default ModeCard;
