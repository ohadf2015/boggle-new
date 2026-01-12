'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Users, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTiltEffect } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

export interface LiveBadgeProps {
  openRooms: number;
  totalPlayers: number;
  roomsLabel: string;
  playersLabel: string;
}

interface ModeCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  variant: 'cyan' | 'pink' | 'purple' | 'orange';
  className?: string;
  liveBadge?: LiveBadgeProps;
  /** Secondary cards are smaller and less prominent */
  secondary?: boolean;
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
  secondary = false,
}) => {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  // 3D tilt effect on hover - MORE DRAMATIC
  const { ref, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
    maxTilt: 15,        // Increased from 8
    hoverScale: 1.04,   // Increased from 1.02
    perspective: 800,   // Decreased for more dramatic effect
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
      bg: 'bg-gradient-to-br from-neo-cyan to-neo-cyan-dark',
      hoverBg: 'hover:from-neo-cyan-light hover:to-neo-cyan',
      iconBg: 'bg-neo-navy',
      iconText: 'text-neo-cyan-light',
      arrow: 'bg-neo-navy text-neo-cyan',
    },
    pink: {
      bg: 'bg-gradient-to-br from-neo-pink to-neo-pink-dark',
      hoverBg: 'hover:from-neo-pink-light hover:to-neo-pink',
      iconBg: 'bg-neo-navy',
      iconText: 'text-neo-pink-light',
      arrow: 'bg-neo-navy text-neo-pink',
    },
    purple: {
      bg: 'bg-gradient-to-br from-neo-purple to-neo-purple-dark',
      hoverBg: 'hover:from-neo-purple-light hover:to-neo-purple',
      iconBg: 'bg-neo-navy',
      iconText: 'text-neo-purple-light',
      arrow: 'bg-neo-navy text-neo-purple',
    },
    orange: {
      bg: 'bg-gradient-to-br from-neo-orange to-amber-600',
      hoverBg: 'hover:from-amber-400 hover:to-neo-orange',
      iconBg: 'bg-neo-navy',
      iconText: 'text-amber-400',
      arrow: 'bg-neo-navy text-neo-orange',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Link href={href} className={cn('block w-full h-full group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy rounded-neo-lg', className)}>
      <div
        ref={ref}
        className={cn(
          // Neo-Brutalist card base
          'rounded-neo-lg border-neo-black',
          secondary ? 'border-2 shadow-hard' : 'border-3 shadow-hard-lg',
          // Container query setup for responsive children
          'cq-container',
          'cursor-pointer',
          'relative overflow-hidden',
          // Full height to fill grid cell
          'h-full',
          // Colors
          styles.bg,
          styles.hoverBg,
          // Transitions - improved easing
          'transition-shadow duration-200 ease-out',
          // Active effect - press down
          isRTL
            ? 'active:translate-x-[-1px] active:translate-y-[1px]'
            : 'active:translate-x-[1px] active:translate-y-[1px]',
          'active:shadow-hard-pressed'
        )}
        style={{
          // Container-relative padding using cqw - smaller for secondary
          padding: secondary ? 'clamp(0.5rem, 3cqw, 1rem)' : 'clamp(0.75rem, 4cqw, 1.5rem)',
          ...tiltStyle,
        }}
        {...handlers}
      >
        {/* Header with icon, title, and arrow in one row */}
        <div className={cn('flex items-center', secondary ? 'gap-2' : 'gap-2 sm:gap-3 lg:gap-4')} style={{ marginBottom: secondary ? 'clamp(0.125rem, 1cqw, 0.5rem)' : 'clamp(0.25rem, 1.5cqw, 0.75rem)' }}>
          {/* Icon - container-relative sizing */}
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

          {/* Title - container-relative font size */}
          {/* drop-shadow-lg added for WCAG AA contrast compliance on gradient backgrounds */}
          <h2
            className={cn('font-black uppercase tracking-tight text-neo-black flex-1 min-w-0 drop-shadow-lg', secondary && 'text-sm sm:text-base')}
            style={secondary ? undefined : {
              fontSize: 'clamp(1rem, 5cqw, 1.75rem)',
            }}
          >
            {title}
          </h2>

          {/* Arrow indicator - min 44x44px touch target for WCAG compliance */}
          <div
            className={cn(
              secondary ? 'min-w-[36px] min-h-[36px]' : 'min-w-[44px] min-h-[44px]',
              'rounded-full border-neo-black',
              secondary ? 'border' : 'border-2',
              'flex items-center justify-center shrink-0',
              'transition-transform duration-200 ease-out',
              isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1',
              styles.arrow
            )}
            style={{
              width: secondary ? 'clamp(2rem, 6cqw, 2.5rem)' : 'clamp(2.75rem, 8cqw, 3.25rem)',
              height: secondary ? 'clamp(2rem, 6cqw, 2.5rem)' : 'clamp(2.75rem, 8cqw, 3.25rem)',
            }}
          >
            <ArrowIcon style={{ fontSize: secondary ? 'clamp(0.625rem, 3cqw, 0.875rem)' : 'clamp(0.75rem, 3.5cqw, 1rem)' }} />
          </div>
        </div>

        {/* Description - container-relative font size */}
        {/* drop-shadow-md added for WCAG AA contrast compliance on gradient backgrounds */}
        {/* Hide description for secondary cards to keep them compact */}
        {!secondary && (
          <p
            className="font-medium text-neo-black drop-shadow-md"
            style={{
              fontSize: 'clamp(0.75rem, 3cqw, 1.125rem)',
              marginBottom: 'clamp(0.375rem, 2cqw, 1rem)',
            }}
          >
            {description}
          </p>
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
        {/* Shine effect on hover */}
        {enableComplexAnimations && !prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo-lg"
            initial={false}
            animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={isHovered ? { x: '200%' } : { x: '-100%' }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </div>
    </Link>
  );
};

export default ModeCard;
