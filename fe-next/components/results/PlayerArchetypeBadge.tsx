'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

interface PlayerArchetypeBadgeProps {
  archetype: PlayerArchetype;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  animate?: boolean;
  className?: string;
}

/**
 * Neo-Brutalist Player Archetype Badge
 * Displays a player's personality archetype with icon and name
 */
const PlayerArchetypeBadge: React.FC<PlayerArchetypeBadgeProps> = ({
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
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; showAbove?: boolean } | null>(null);
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
    if (isOpen && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const tooltipEstimatedHeight = 80;

      // Check if tooltip would go below viewport
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < tooltipEstimatedHeight + 20;

      setTooltipPosition({
        top: showAbove ? rect.top - 8 : rect.bottom + 8,
        left: rect.left + rect.width / 2,
        showAbove,
      });
    } else if (!isOpen) {
      setTooltipPosition(null);
    }
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

  // Size classes - 1.5x larger for better visibility
  const sizeClasses = {
    sm: {
      container: 'px-2.5 py-1.5 gap-2',
      icon: 'w-12 h-12',     // Was w-8 h-8 (32px), now 48px
      text: 'text-sm',
      emoji: 'text-2xl',
    },
    md: {
      container: 'px-3.5 py-2 gap-3',
      icon: 'w-16 h-16',     // Was w-12 h-12 (48px), now 64px
      text: 'text-base',
      emoji: 'text-3xl',
    },
    lg: {
      container: 'px-5 py-2.5 gap-4',
      icon: 'w-20 h-20',     // Was w-16 h-16 (64px), now 80px
      text: 'text-lg font-black',
      emoji: 'text-5xl',
    },
  };

  const sizes = sizeClasses[size];

  // Background color mapping for neo-brutalist style
  const bgColorMap: Record<string, string> = {
    strategist: 'bg-neo-cyan',
    speedster: 'bg-neo-yellow',
    scholar: 'bg-neo-purple',
    explorer: 'bg-neo-orange',
    perfectionist: 'bg-neo-pink',
    maverick: 'bg-neo-red',
    workhorse: 'bg-amber-400',
    closer: 'bg-neo-lime',
    trailblazer: 'bg-violet-400',
  };

  const textColorMap: Record<string, string> = {
    strategist: 'text-neo-black',
    speedster: 'text-neo-black',
    scholar: 'text-neo-cream',
    explorer: 'text-neo-black',
    perfectionist: 'text-neo-black',
    maverick: 'text-neo-cream',
    workhorse: 'text-neo-black',
    closer: 'text-neo-black',
    trailblazer: 'text-neo-cream',
  };

  const bgColor = bgColorMap[archetype.id] || 'bg-neo-cyan';
  const textColor = textColorMap[archetype.id] || 'text-neo-black';

  const BadgeContent = (
    <motion.div
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
      <div className={cn('flex-shrink-0', sizes.icon)}>
        {archetype.icon && !imageError ? (
          <Image
            src={archetype.icon}
            alt={archetype.name}
            width={80}
            height={80}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={sizes.emoji}>{archetype.emoji}</span>
        )}
      </div>

      {/* Name */}
      <span className={sizes.text}>
        {t(`archetypes.${archetype.id}`) || archetype.name}
      </span>
    </motion.div>
  );

  if (!showTooltip) {
    return BadgeContent;
  }

  const tooltipContent = (
    <AnimatePresence>
      {isOpen && isMounted && tooltipPosition && (
        <motion.div
          initial={{ opacity: 0, y: tooltipPosition.showAbove ? -5 : 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: tooltipPosition.showAbove ? -5 : 5, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'fixed z-[9999] -translate-x-1/2',
            'px-3 py-2 rounded-neo border-2 border-neo-black',
            'bg-neo-cream shadow-hard',
            'whitespace-nowrap',
            tooltipPosition.showAbove && '-translate-y-full'
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Arrow - points down when showing above, up when showing below */}
          {tooltipPosition.showAbove ? (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-neo-cream border-r-2 border-b-2 border-neo-black" />
          ) : (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-neo-cream border-l-2 border-t-2 border-neo-black" />
          )}

          <p className="text-sm font-bold text-neo-black relative z-10">
            {t(`archetypes.${archetype.id}Desc`) || archetype.description}
          </p>
        </motion.div>
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
};

export default PlayerArchetypeBadge;
