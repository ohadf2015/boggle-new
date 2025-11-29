'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  overlay?: boolean;
}

/**
 * PresenceIndicator - Shows player's current activity status
 */
const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  status = 'active',
  isWindowFocused = true,
  size = 'md',
  showTooltip = true,
  className = '',
  overlay = false,
}) => {
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

  // Size configurations
  const sizes: Record<PresenceSize, SizeConfig> = {
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
  };

  const sizeConfig = sizes[size] || sizes.md;

  // Status configurations
  const statusConfig: Record<PresenceStatus, StatusConfig> = {
    active: {
      color: 'bg-green-500',
      ringColor: 'ring-green-400/50',
      tooltip: 'Active',
      pulse: true,
    },
    idle: {
      color: 'bg-yellow-500',
      ringColor: 'ring-yellow-400/50',
      tooltip: 'Away',
      pulse: false,
    },
    afk: {
      color: 'bg-slate-500',
      ringColor: 'ring-slate-400/50',
      tooltip: 'Away from keyboard',
      pulse: false,
    },
  };

  const config = statusConfig[status] || statusConfig.active;

  // Determine effective status (window blur = at least idle)
  const effectiveStatus: PresenceStatus = !isWindowFocused && status === 'active' ? 'idle' : status;
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
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            <div className="bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
              {effectiveConfig.tooltip}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {effectiveStatus === 'afk' ? (
          // AFK - Show animated zzz with staggered letters
          <motion.div
            key="afk"
            initial={{ opacity: 0, scale: 0.5, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 5 }}
            className={`flex items-center justify-center ${sizeConfig.container}`}
          >
            <div className="flex items-end gap-0.5">
              {['Z', 'z', 'z'].map((letter, i) => (
                <motion.span
                  key={i}
                  className={`${sizeConfig.zzz} font-black text-slate-900 drop-shadow-sm`}
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
                </motion.span>
              ))}
            </div>
          </motion.div>
        ) : effectiveStatus === 'idle' ? (
          // Idle - Show yellow moon/eye icon
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`flex items-center justify-center ${sizeConfig.container}`}
          >
            <motion.div
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
          </motion.div>
        ) : (
          // Active - Show pulsing green dot
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`flex items-center justify-center ${sizeConfig.container}`}
          >
            <motion.div
              className={`${sizeConfig.dot} rounded-full ${effectiveConfig.color} ring-2 ${effectiveConfig.ringColor}`}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * PresenceBadge Props
 */
interface PresenceBadgeProps {
  status?: PresenceStatus;
  isWindowFocused?: boolean;
  showText?: boolean;
  size?: PresenceSize;
  className?: string;
}

/**
 * PresenceBadge - A more detailed presence indicator with text
 */
export const PresenceBadge: React.FC<PresenceBadgeProps> = ({
  status = 'active',
  isWindowFocused = true,
  showText = true,
  size = 'md',
  className = '',
}) => {
  // Determine effective status
  const effectiveStatus: PresenceStatus = !isWindowFocused && status === 'active' ? 'idle' : status;

  interface BadgeConfig {
    bg: string;
    text: string;
    label: string;
  }

  const badgeConfig: Record<PresenceStatus, BadgeConfig> = {
    active: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      label: 'Online',
    },
    idle: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      label: 'Away',
    },
    afk: {
      bg: 'bg-slate-500/20',
      text: 'text-slate-400',
      label: 'AFK',
    },
  };

  const config = badgeConfig[effectiveStatus] || badgeConfig.active;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.bg} ${className}`}
    >
      <PresenceIndicator
        status={status}
        isWindowFocused={isWindowFocused}
        size="sm"
        showTooltip={false}
      />
      {showText && (
        <span className={`text-xs font-medium ${config.text}`}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export default PresenceIndicator;
