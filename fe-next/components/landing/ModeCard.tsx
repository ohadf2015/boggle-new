'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Users, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

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
  variant: 'cyan' | 'pink';
  className?: string;
  liveBadge?: LiveBadgeProps;
}

/**
 * ModeCard - Large clickable card for game mode selection
 * Clean Neo-Brutalist styling with optional live stats
 */
const ModeCard: React.FC<ModeCardProps> = ({
  title,
  description,
  href,
  icon,
  variant,
  className,
  liveBadge,
}) => {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const variantStyles = {
    cyan: {
      bg: 'bg-gradient-to-br from-neo-cyan to-cyan-400',
      hoverBg: 'hover:from-neo-cyan hover:to-cyan-300',
      iconBg: 'bg-neo-navy',
      iconText: 'text-neo-cyan',
      arrow: 'bg-neo-navy text-neo-cyan',
    },
    pink: {
      bg: 'bg-gradient-to-br from-neo-pink to-pink-400',
      hoverBg: 'hover:from-neo-pink hover:to-pink-300',
      iconBg: 'bg-neo-navy',
      iconText: 'text-neo-pink',
      arrow: 'bg-neo-navy text-neo-pink',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Link href={href} className="block w-full group">
      <motion.div
        className={cn(
          // Neo-Brutalist card base
          'rounded-neo-lg border-3 border-neo-black',
          'shadow-hard-lg',
          // Container query setup for responsive children
          'cq-container',
          'cursor-pointer',
          'relative overflow-hidden',
          // Colors
          styles.bg,
          styles.hoverBg,
          // Transitions - improved easing
          'transition-all duration-200 ease-out',
          // Hover effect - move up and left/right based on direction, grow shadow
          isRTL
            ? 'hover:translate-x-[3px] hover:translate-y-[-3px] hover:shadow-[-6px_6px_0px_black]'
            : 'hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[6px_6px_0px_black]',
          // Active effect - press down
          isRTL
            ? 'active:translate-x-[-1px] active:translate-y-[1px]'
            : 'active:translate-x-[1px] active:translate-y-[1px]',
          'active:shadow-hard-pressed',
          className
        )}
        style={{
          // Container-relative padding using cqw
          padding: 'clamp(0.75rem, 3cqw, 1rem)',
        }}
        // Removed micro-animations for cleaner UX
      >
        {/* Header with icon and arrow */}
        <div className="flex items-start justify-between" style={{ marginBottom: 'clamp(0.5rem, 2cqw, 1rem)' }}>
          {/* Icon - container-relative sizing */}
          <div
            className={cn(
              'rounded-neo border-2 border-neo-black',
              'shadow-hard-sm',
              'flex items-center justify-center',
              styles.iconBg
            )}
            style={{
              width: 'clamp(2.25rem, 12cqw, 4rem)',
              height: 'clamp(2.25rem, 12cqw, 4rem)',
            }}
          >
            <span className={styles.iconText} style={{ fontSize: 'clamp(1.125rem, 6cqw, 1.875rem)' }}>
              {icon}
            </span>
          </div>

          {/* Arrow indicator - min 44x44px touch target on mobile */}
          <div
            className={cn(
              'min-w-[44px] min-h-[44px]',
              'rounded-full border-2 border-neo-black',
              'flex items-center justify-center',
              'transition-transform duration-200 ease-out',
              isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1',
              styles.arrow
            )}
            style={{
              width: 'clamp(2.5rem, 10cqw, 3rem)',
              height: 'clamp(2.5rem, 10cqw, 3rem)',
            }}
          >
            <ArrowIcon style={{ fontSize: 'clamp(0.875rem, 4cqw, 1.25rem)' }} />
          </div>
        </div>

        {/* Title - container-relative font size */}
        <h2
          className="font-black uppercase tracking-tight text-neo-black"
          style={{
            fontSize: 'clamp(1.125rem, 6cqw, 1.875rem)',
            marginBottom: 'clamp(0.125rem, 0.5cqw, 0.5rem)',
          }}
        >
          {title}
        </h2>

        {/* Description - container-relative font size */}
        <p
          className="font-medium text-neo-black"
          style={{
            fontSize: 'clamp(0.75rem, 3.5cqw, 1.125rem)',
            marginBottom: 'clamp(0.5rem, 2cqw, 1rem)',
          }}
        >
          {description}
        </p>

        {/* Live Badge - shows open rooms and players only when meaningful (> 5) */}
        {/* Using bg-neo-cream for WCAG AA compliant contrast (19.8:1 vs neo-black) */}
        {liveBadge && (liveBadge.openRooms > 5 || liveBadge.totalPlayers > 5) && (
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
        {/* Removed decorative blur element */}
      </motion.div>
    </Link>
  );
};

export default ModeCard;
