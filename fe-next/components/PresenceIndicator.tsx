'use client';

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Status types
 */
type PresenceStatus = 'active' | 'idle' | 'afk';

/**
 * Size types
 */
type PresenceSize = 'sm' | 'md' | 'lg';

/**
 * Size configuration
 */
interface SizeConfig {
  container: string;
  dot: string;
  icon: string;
  zzz: string;
}

/**
 * Status configuration
 */
interface StatusConfig {
  color: string;
  ringColor: string;
  tooltip: string;
  pulse: boolean;
}

/**
 * PresenceIndicator Props
 */
interface PresenceIndicatorProps {
  status?: PresenceStatus;
  isWindowFocused?: boolean;
  size?: PresenceSize;
  showTooltip?: boolean;
  className?: string;
}

/**
 * PresenceIndicator - Shows player's current activity status
 * Memoized to prevent unnecessary re-renders in leaderboards
 */
const PresenceIndicator = memo<PresenceIndicatorProps>(({
  status = 'active',
  isWindowFocused = true,
  size = 'md',
  showTooltip = true,
  className = '',
}) => {
  const { t } = useLanguage();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-hide tooltip after 2 seconds (for mobile tap)
  useEffect(() => {
    if (tooltipVisible) {
      tooltipTimeoutRef.current = setTimeout(() => {
        setTooltipVisible(false);
      }, 2000);
    }
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, [tooltipVisible]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltipVisible(false);
      }
    };
    if (tooltipVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [tooltipVisible]);

  // Size configurations - memoized to prevent recreation
  const sizes: Record<PresenceSize, SizeConfig> = useMemo(() => ({
    sm: {
      container: 'w-4 h-4',
      dot: 'w-2 h-2',
      icon: 'text-[8px]',
      zzz: 'text-[6px]',
    },
    md: {
      container: 'w-5 h-5',
      dot: 'w-2.5 h-2.5',
      icon: 'text-[10px]',
      zzz: 'text-[8px]',
    },
    lg: {
      container: 'w-8 h-8',
      dot: 'w-3.5 h-3.5',
      icon: 'text-sm',
      zzz: 'text-base',
    },
  }), []);

  const sizeConfig = sizes[size] || sizes.md;

  // Status configurations - memoized to prevent recreation
  const statusConfig: Record<PresenceStatus, StatusConfig> = useMemo(() => ({
    active: {
      color: 'bg-neo-lime',
      ringColor: 'ring-neo-lime/50',
      tooltip: t('presence.active') ?? 'Active',
      pulse: true,
    },
    idle: {
      color: 'bg-neo-cream',
      ringColor: 'ring-neo-cream/50',
      tooltip: t('presence.idle') ?? 'Away',
      pulse: false,
    },
    afk: {
      color: 'bg-neo-cream/40',
      ringColor: 'ring-neo-cream/30',
      tooltip: t('presence.afk') ?? 'Away from keyboard',
      pulse: false,
    },
  }), [t]);

  const config = statusConfig[status] || statusConfig.active;

  // Determine effective status (window blur = at least idle) - memoized
  const effectiveStatus: PresenceStatus = useMemo(
    () => !isWindowFocused && status === 'active' ? 'idle' : status,
    [isWindowFocused, status]
  );
  const effectiveConfig = statusConfig[effectiveStatus] || config;

  // Handle click/tap for mobile
  const handleClick = (e: React.MouseEvent) => {
    if (showTooltip) {
      e.stopPropagation();
      setTooltipVisible((prev) => !prev);
    }
  };

  // Handle hover for desktop
  const handleMouseEnter = () => {
    if (showTooltip) {
      setTooltipVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (showTooltip) {
      setTooltipVisible(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center ${sizeConfig.container} ${className} ${showTooltip ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Custom Tooltip */}
      <AnimatePresence>
        {showTooltip && tooltipVisible && (
          <m.div
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            <div className="bg-neo-navy-light text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
              {effectiveConfig.tooltip}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {effectiveStatus === 'afk' ? (
          // AFK - Show animated zzz with staggered letters
          <m.div
            key="afk"
            initial={{ opacity: 0, scale: 0.5, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 5 }}
            className={`flex items-center justify-center ${sizeConfig.container}`}
          >
            <div className="flex items-end gap-0.5">
              {['Z', 'z', 'z'].map((letter, i) => (
                <m.span
                  key={`zzz-${i}-${letter}`}
                  className={`${sizeConfig.zzz} font-black text-slate-900 drop-shadow-xs`}
                  style={{
                    fontSize: i === 0 ? '1em' : `${0.85 - i * 0.1}em`,
                  }}
                  animate={{
                    y: [0, -3 - i, 0],
                    scale: [1, 1.15, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.12,
                  }}
                >
                  {letter}
                </m.span>
              ))}
            </div>
          </m.div>
        ) : effectiveStatus === 'idle' ? (
          // Idle - Show yellow moon/eye icon
          <m.div
            key="idle"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`flex items-center justify-center ${sizeConfig.container}`}
          >
            <m.div
              className={`${sizeConfig.dot} rounded-full ${effectiveConfig.color} ring-2 ${effectiveConfig.ringColor}`}
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </m.div>
        ) : (
          // Active - Show pulsing green dot
          <m.div
            key="active"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`flex items-center justify-center ${sizeConfig.container}`}
          >
            <m.div
              className={`${sizeConfig.dot} rounded-full ${effectiveConfig.color} ring-2 ${effectiveConfig.ringColor}`}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                type: 'tween',
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

PresenceIndicator.displayName = 'PresenceIndicator';

export default PresenceIndicator;
