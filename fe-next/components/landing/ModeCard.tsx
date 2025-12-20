'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface FeatureItem {
  icon: React.ReactNode;
  label: string;
}

interface ModeCardProps {
  title: string;
  description: string;
  features: FeatureItem[];
  href: string;
  icon: React.ReactNode;
  variant: 'cyan' | 'pink';
  className?: string;
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
}) => {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? FaArrowLeft : FaArrowRight;

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
          'rounded-neo-lg border-4 border-neo-black',
          'shadow-hard-lg',
          'p-6 sm:p-8',
          'cursor-pointer',
          'relative overflow-hidden',
          // Colors
          styles.bg,
          styles.hoverBg,
          // Transitions - improved easing
          'transition-all duration-200 ease-out',
          // Hover effect - move up and left/right based on direction, grow shadow
          isRTL
            ? 'hover:translate-x-[4px] hover:translate-y-[-4px] hover:shadow-[-8px_8px_0px_black]'
            : 'hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_black]',
          // Active effect - press down
          isRTL
            ? 'active:translate-x-[-2px] active:translate-y-[2px]'
            : 'active:translate-x-[2px] active:translate-y-[2px]',
          'active:shadow-hard-pressed',
          className
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Header with icon and arrow */}
        <div className="flex items-start justify-between mb-6">
          {/* Icon */}
          <div
            className={cn(
              'w-14 h-14 sm:w-16 sm:h-16',
              'rounded-neo border-3 border-neo-black',
              'shadow-hard',
              'flex items-center justify-center',
              styles.iconBg
            )}
          >
            <span className={cn('text-2xl sm:text-3xl', styles.iconText)}>
              {icon}
            </span>
          </div>

          {/* Arrow indicator */}
          <div
            className={cn(
              'w-10 h-10 sm:w-12 sm:h-12',
              'rounded-full border-3 border-neo-black',
              'flex items-center justify-center',
              'transition-transform duration-200 ease-out',
              isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1',
              styles.arrow
            )}
          >
            <ArrowIcon className="text-lg sm:text-xl" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-black mb-2">
          {title}
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base font-medium text-neo-black mb-5">
          {description}
        </p>

        {/* Features as icon row with tooltips */}
        <div className="flex gap-2">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative group/tooltip"
            >
              <div
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10',
                  'rounded-neo border-2 border-neo-black/30',
                  'flex items-center justify-center',
                  'text-base sm:text-lg',
                  styles.badgeBg,
                  styles.badgeText
                )}
              >
                {feature.icon}
              </div>
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-neo-white bg-neo-black rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
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
