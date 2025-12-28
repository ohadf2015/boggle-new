'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Users, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface FeatureItem {
  icon: React.ReactNode;
  label: string;
}

export interface LiveBadgeProps {
  openRooms: number;
  totalPlayers: number;
  roomsLabel: string;
  playersLabel: string;
}

interface ModeCardProps {
  title: string;
  description: string;
  features: FeatureItem[];
  href: string;
  icon: React.ReactNode;
  variant: 'cyan' | 'pink';
  className?: string;
  liveBadge?: LiveBadgeProps;
}

/**
 * ModeCard - Large clickable card for game mode selection
 * Modern Neo-Brutalist styling with feature badges
 */
const ModeCard: React.FC<ModeCardProps> = ({
  title,
  description,
  features,
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
      badgeBg: 'bg-neo-navy/20 backdrop-blur-sm',
      badgeText: 'text-neo-navy font-semibold',
      arrow: 'bg-neo-navy text-neo-cyan',
    },
    pink: {
      bg: 'bg-gradient-to-br from-neo-pink to-pink-400',
      hoverBg: 'hover:from-neo-pink hover:to-pink-300',
      iconBg: 'bg-neo-navy',
      iconText: 'text-neo-pink',
      badgeBg: 'bg-neo-navy/20 backdrop-blur-sm',
      badgeText: 'text-neo-navy font-semibold',
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
          'p-3 sm:p-4',
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
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Header with icon and arrow */}
        <div className="flex items-start justify-between mb-2">
          {/* Icon */}
          <div
            className={cn(
              'w-9 h-9 sm:w-10 sm:h-10',
              'rounded-neo border-2 border-neo-black',
              'shadow-hard-sm',
              'flex items-center justify-center',
              styles.iconBg
            )}
          >
            <span className={cn('text-lg sm:text-xl', styles.iconText)}>
              {icon}
            </span>
          </div>

          {/* Arrow indicator */}
          <div
            className={cn(
              'w-7 h-7 sm:w-8 sm:h-8',
              'rounded-full border-2 border-neo-black',
              'flex items-center justify-center',
              'transition-transform duration-200 ease-out',
              isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1',
              styles.arrow
            )}
          >
            <ArrowIcon className="text-sm sm:text-base" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-neo-black mb-0.5">
          {title}
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-sm font-medium text-neo-black mb-2">
          {description}
        </p>

        {/* Live Badge - shows open rooms and players when available */}
        {liveBadge && (liveBadge.openRooms > 0 || liveBadge.totalPlayers > 0) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {liveBadge.openRooms > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-neo-lime/90 text-neo-black text-xs font-bold rounded-neo border-2 border-neo-black shadow-hard-sm">
                <LayoutGrid className="w-3 h-3" />
                {liveBadge.openRooms} {liveBadge.roomsLabel}
              </span>
            )}
            {liveBadge.totalPlayers > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-neo-lime/90 text-neo-black text-xs font-bold rounded-neo border-2 border-neo-black shadow-hard-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-black text-neo-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neo-black text-neo-white" />
                </span>
                <Users className="w-3 h-3" />
                {liveBadge.totalPlayers} {liveBadge.playersLabel}
              </span>
            )}
          </div>
        )}

        {/* Features as icon row with tooltips */}
        <div className="flex gap-1">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative group/tooltip"
            >
              <div
                className={cn(
                  'w-6 h-6 sm:w-7 sm:h-7',
                  'rounded-neo border-2 border-neo-black/30',
                  'flex items-center justify-center',
                  'text-xs sm:text-sm',
                  styles.badgeBg,
                  styles.badgeText
                )}
              >
                {feature.icon}
              </div>
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 text-[10px] font-medium text-neo-white bg-neo-black rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                {feature.label}
              </span>
            </div>
          ))}
        </div>

        {/* Decorative element */}
        <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-neo-black/5 blur-2xl" />
      </motion.div>
    </Link>
  );
};

export default ModeCard;
