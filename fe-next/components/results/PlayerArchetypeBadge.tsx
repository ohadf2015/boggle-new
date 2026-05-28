'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

interface PlayerArchetypeBadgeProps {
  archetype: PlayerArchetype;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  animate?: boolean;
  className?: string;
}

/**
 * Neo-Brutalist Player Archetype Badge
 * Displays a player's personality archetype with icon and name
 */
const PlayerArchetypeBadge = memo<PlayerArchetypeBadgeProps>(({
  archetype,
  size = 'md',
  showTooltip = true,
  animate = true,
  className,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; showAbove?: boolean; arrowOffset?: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen && isTouchDevice.current) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !badgeRef.current) {
      if (!isOpen) setTooltipPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!badgeRef.current) return;
      const rect = badgeRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const tooltipEstimatedHeight = 140;
      const tooltipEstimatedWidth = 256; // w-64 = 16rem = 256px

      // Check if tooltip would go below viewport
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < tooltipEstimatedHeight + 20;

      // Calculate horizontal position - center on badge by default
      const badgeCenter = rect.left + rect.width / 2;
      let leftPos = badgeCenter;

      // Ensure tooltip doesn't overflow horizontally
      // Leave 16px padding from viewport edges
      const minLeft = tooltipEstimatedWidth / 2 + 16;
      const maxLeft = viewportWidth - tooltipEstimatedWidth / 2 - 16;
      leftPos = Math.max(minLeft, Math.min(maxLeft, leftPos));

      // Calculate arrow offset - arrow should point at badge center
      const tooltipLeft = leftPos - tooltipEstimatedWidth / 2;
      const arrowOffset = Math.max(10, Math.min(90, ((badgeCenter - tooltipLeft) / tooltipEstimatedWidth) * 100));

      setTooltipPosition({
        top: showAbove ? rect.top - 8 : rect.bottom + 8,
        left: leftPos,
        showAbove,
        arrowOffset,
      });
    };

    updatePosition();

    // Recalculate on scroll to keep tooltip aligned
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Touch/click handlers for mobile support
  const handleTouchStart = () => {
    isTouchDevice.current = true;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice.current) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice.current) {
      setIsOpen(false);
    }
  };

  // Size classes - various sizes for different contexts
  const sizeClasses = {
    xs: {
      container: 'px-1.5 py-1 gap-1.5',
      icon: 'w-6 h-6',       // 24px - compact for inline display
      text: 'text-xs',
      emoji: 'text-base',
    },
    sm: {
      container: 'px-2 py-1 gap-1.5',
      icon: 'w-8 h-8',       // 32px - good for cards
      text: 'text-xs',
      emoji: 'text-xl',
    },
    md: {
      container: 'px-3 py-1.5 gap-2',
      icon: 'w-10 h-10',     // 40px
      text: 'text-sm',
      emoji: 'text-2xl',
    },
    lg: {
      container: 'px-4 py-2 gap-3',
      icon: 'w-14 h-14',     // 56px
      text: 'text-base font-black',
      emoji: 'text-3xl',
    },
  };

  const sizes = sizeClasses[size];

  // Background color mapping for neo-brutalist style
  const bgColorMap: Record<string, string> = {
    strategist: 'bg-neo-cyan',
    speedster: 'bg-neo-lime',
    scholar: 'bg-neo-pink',
    explorer: 'bg-neo-red',
    perfectionist: 'bg-neo-pink',
    maverick: 'bg-neo-red',
    workhorse: 'bg-amber-400',
    closer: 'bg-neo-lime',
    trailblazer: 'bg-violet-400',
  };

  const textColorMap: Record<string, string> = {
    strategist: 'text-neo-black',
    speedster: 'text-neo-black',
    scholar: 'text-neo-white',
    explorer: 'text-neo-black',
    perfectionist: 'text-neo-black',
    maverick: 'text-neo-white',
    workhorse: 'text-neo-black',
    closer: 'text-neo-black',
    trailblazer: 'text-neo-white',
  };

  const bgColor = bgColorMap[archetype.id] || 'bg-neo-cyan';
  const textColor = textColorMap[archetype.id] || 'text-neo-black';

  const BadgeContent = (
    <m.div
      ref={badgeRef}
      className={cn(
        'inline-flex items-center font-black uppercase tracking-wide',
        'border-2 border-neo-black rounded-neo shadow-hard-sm',
        'cursor-pointer select-none',
        bgColor,
        textColor,
        sizes.container,
        className
      )}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={animate ? { scale: 0, rotate: -10 } : false}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.05, rotate: 2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    >
      {/* Icon - Image or Emoji fallback */}
      <div className={cn('shrink-0 flex items-center justify-center', sizes.icon)}>
        {archetype.icon && !imageError ? (
          <Image
            src={archetype.icon}
            alt={archetype.name}
            width={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : 56}
            height={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : 56}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
            priority={size === 'lg'}
            unoptimized
          />
        ) : (
          <span className={cn('flex items-center justify-center', sizes.emoji)}>{archetype.emoji}</span>
        )}
      </div>

      {/* Name - use translation if available, fallback to archetype.name */}
      <span className={sizes.text}>
        {(() => {
          const translationKey = `archetypes.${archetype.id}`;
          const translated = t(translationKey);
          // If t() returns the key path itself, translation is missing - use fallback
          return translated !== translationKey ? translated : archetype.name;
        })()}
      </span>
    </m.div>
  );

  if (!showTooltip) {
    return BadgeContent;
  }

  // Get translated name and description
  const archetypeName = (() => {
    const translationKey = `archetypes.${archetype.id}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : archetype.name;
  })();

  const archetypeDesc = (() => {
    const translationKey = `archetypes.${archetype.id}Desc`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : archetype.description;
  })();

  const tooltipContent = (
    <AnimatePresence>
      {isOpen && isMounted && tooltipPosition && (
        <m.div
          initial={{ opacity: 0, y: tooltipPosition.showAbove ? -5 : 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: tooltipPosition.showAbove ? -5 : 5, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'fixed z-30 -translate-x-1/2',
            'w-56 sm:w-64 px-3 py-2.5 rounded-neo border-3 border-neo-black',
            'bg-neo-cream shadow-hard-lg',
            tooltipPosition.showAbove && '-translate-y-full'
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Arrow - points down when showing above, up when showing below */}
          {/* Arrow position is dynamic to always point at the badge, even when tooltip is clamped */}
          {tooltipPosition.showAbove ? (
            <div
              className="absolute -bottom-2 -translate-x-1/2 w-3 h-3 rotate-45 bg-neo-cream border-r-3 border-b-3 border-neo-black"
              style={{ left: `${tooltipPosition.arrowOffset ?? 50}%` }}
            />
          ) : (
            <div
              className="absolute -top-2 -translate-x-1/2 w-3 h-3 rotate-45 bg-neo-cream border-l-3 border-t-3 border-neo-black"
              style={{ left: `${tooltipPosition.arrowOffset ?? 50}%` }}
            />
          )}

          {/* Header: Icon + Name */}
          <div className="flex items-center gap-2 mb-1.5 relative z-10">
            <div className={cn(
              'w-7 h-7 rounded-neo border-2 border-neo-black flex items-center justify-center shrink-0',
              bgColor
            )}>
              {archetype.icon && !imageError ? (
                <Image
                  src={archetype.icon}
                  alt={archetype.name}
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                  unoptimized
                />
              ) : (
                <span className="text-base">{archetype.emoji}</span>
              )}
            </div>
            <span className={cn('font-black text-sm uppercase tracking-wide', textColor === 'text-neo-white' ? 'text-neo-black' : textColor)}>
              {archetypeName}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-neo-black/80 leading-relaxed relative z-10">
            {archetypeDesc}
          </p>

          {/* Hint */}
          <p className="text-[10px] text-neo-black/70 mt-1.5 pt-1.5 border-t border-neo-black/10 relative z-10">
            {t('archetypes.hint')}
          </p>
        </m.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative inline-block">
      {BadgeContent}

      {/* Tooltip rendered via portal to escape overflow-hidden parents */}
      {showTooltip && isMounted && createPortal(tooltipContent, document.body)}
    </div>
  );
});

PlayerArchetypeBadge.displayName = 'PlayerArchetypeBadge';

export default PlayerArchetypeBadge;
