/**
 * ModeCardV2 Component
 *
 * Enhanced game mode selection card with:
 * - Custom illustrated icons
 * - Decorative corner flourishes
 * - Enhanced hover effects with shimmer
 * - Better tactile feedback
 * - Improved typography with text shadows
 */

'use client';

import React, { useState, memo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Lock, Trophy, Users, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTiltEffect } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { GameModeIcon } from '@/components/ui/GameModeIcon';

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

interface ModeCardV2Props {
  title: string;
  description: string;
  href: string;
  /**
   * Game mode for custom icon
   */
  mode: 'multiplayer' | 'singleplayer' | 'adventure';
  variant: 'cyan' | 'pink' | 'lime' | 'orange' | 'purple';
  className?: string;
  liveBadge?: LiveBadgeProps;
  playerCount?: PlayerCountProps;
  personalBest?: PersonalBestProps;
  secondary?: boolean;
  locked?: boolean;
  loading?: boolean;
  lockedMessage?: string;
  onLockedClick?: () => void;
  badge?: string;
  /**
   * Enable decorative corners
   */
  decorative?: boolean;
}

const ModeCardV2: React.FC<ModeCardV2Props> = ({
  title,
  description,
  href,
  mode,
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
  badge,
  decorative = true,
}) => {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  // Enhanced 3D tilt effect
  const { ref, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
    maxTilt: 20,
    hoverScale: 1.05,
    perspective: 600,
  });

  const combinedHandlers = {
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
      bg: 'bg-gradient-to-br from-neo-cyan via-cyan-400 to-cyan-600',
      hoverBg: 'hover:from-cyan-300 hover:via-neo-cyan hover:to-cyan-500',
      glowColor: 'rgba(0, 255, 255, 0.5)',
      shadowColor: '#006666',
      cornerColor: '#00FFFF',
    },
    pink: {
      bg: 'bg-gradient-to-br from-neo-pink via-pink-400 to-pink-600',
      hoverBg: 'hover:from-pink-300 hover:via-neo-pink hover:to-pink-500',
      glowColor: 'rgba(255, 20, 147, 0.5)',
      shadowColor: '#8B0A50',
      cornerColor: '#FF1493',
    },
    lime: {
      bg: 'bg-gradient-to-br from-neo-lime via-lime-400 to-lime-600',
      hoverBg: 'hover:from-lime-300 hover:via-neo-lime hover:to-lime-500',
      glowColor: 'rgba(163, 230, 53, 0.5)',
      shadowColor: '#4A6B0F',
      cornerColor: '#A3E635',
    },
    orange: {
      bg: 'bg-gradient-to-br from-neo-orange via-amber-400 to-orange-600',
      hoverBg: 'hover:from-amber-300 hover:via-neo-orange hover:to-orange-500',
      glowColor: 'rgba(255, 107, 53, 0.5)',
      shadowColor: '#8B3A0F',
      cornerColor: '#FF6B35',
    },
    purple: {
      bg: 'bg-gradient-to-br from-neo-purple via-purple-400 to-purple-600',
      hoverBg: 'hover:from-purple-300 hover:via-neo-purple hover:to-purple-500',
      glowColor: 'rgba(139, 92, 246, 0.5)',
      shadowColor: '#4C1D95',
      cornerColor: '#8B5CF6',
    },
  };

  const styles = variantStyles[variant];

  // Corner decoration SVG path
  const cornerPath = 'M0,0 L16,0 Q12,4 10,10 Q4,12 0,16 Z';

  const wrapperClassName = cn(
    'block w-full h-full group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy rounded-neo-xl',
    className
  );

  const cardContent = (
    <div
      ref={ref}
      className={cn(
        // Base card styles
        'rounded-neo-xl border-neo-black relative overflow-hidden',
        secondary ? 'border-2 shadow-hard' : 'border-4 shadow-hard-lg',
        'cq-container',
        locked ? 'cursor-not-allowed' : 'cursor-pointer',
        'h-full',
        locked ? 'grayscale' : '',
        styles.bg,
        !locked && styles.hoverBg,
        'transition-all duration-300 ease-out',
        !locked && (isRTL
          ? 'active:translate-x-[-2px] active:translate-y-[2px]'
          : 'active:translate-x-[2px] active:translate-y-[2px]'),
        !locked && 'active:shadow-hard-pressed'
      )}
      style={{
        padding: secondary ? 'clamp(0.75rem, 3cqw, 1.25rem)' : 'clamp(1rem, 4cqw, 2rem)',
        boxShadow: isHovered && !locked
          ? `8px 8px 0 ${styles.shadowColor}, 0 0 30px ${styles.glowColor}`
          : `6px 6px 0 ${styles.shadowColor}`,
        ...tiltStyle,
      }}
      {...combinedHandlers}
    >
      {/* Decorative corners */}
      {decorative && !secondary && (
        <>
          <svg className="absolute top-0 left-0 w-4 h-4 pointer-events-none z-10" viewBox="0 0 16 16" fill="none">
            <path d={cornerPath} fill={styles.cornerColor} stroke="#1a1a2e" strokeWidth="1" />
          </svg>
          <svg className="absolute top-0 right-0 w-4 h-4 pointer-events-none z-10" viewBox="0 0 16 16" fill="none" style={{ transform: 'scaleX(-1)' }}>
            <path d={cornerPath} fill={styles.cornerColor} stroke="#1a1a2e" strokeWidth="1" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none z-10" viewBox="0 0 16 16" fill="none" style={{ transform: 'scaleY(-1)' }}>
            <path d={cornerPath} fill={styles.cornerColor} stroke="#1a1a2e" strokeWidth="1" />
          </svg>
          <svg className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none z-10" viewBox="0 0 16 16" fill="none" style={{ transform: 'scale(-1, -1)' }}>
            <path d={cornerPath} fill={styles.cornerColor} stroke="#1a1a2e" strokeWidth="1" />
          </svg>
        </>
      )}

      {/* Inner glow effect */}
      <div
        className="absolute inset-0 pointer-events-none rounded-neo-xl"
        style={{
          background: `radial-gradient(ellipse at 30% 30%, ${styles.glowColor.replace('0.5', '0.15')} 0%, transparent 60%)`,
        }}
      />

      {/* Badge */}
      {badge && !locked && (
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 3 }}
          className={cn(
            'absolute top-2 right-2 z-10',
            'px-2 py-1 sm:px-3 sm:py-1',
            'bg-neo-navy text-neo-white',
            'font-black uppercase tracking-wider',
            'text-xs sm:text-sm',
            'border-2 border-neo-black rounded-neo shadow-hard-sm',
            isRTL && 'right-auto left-2 -rotate-3'
          )}
        >
          {badge}
        </motion.div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header with icon and title */}
        <div className={cn('flex items-center gap-3 sm:gap-4', secondary ? 'mb-2' : 'mb-3 sm:mb-4')}>
          {/* Custom illustrated icon */}
          <motion.div
            whileHover={!locked ? { rotate: [0, -5, 5, 0], scale: 1.1 } : {}}
            transition={{ duration: 0.5 }}
          >
            <GameModeIcon
              mode={mode}
              size={secondary ? 'sm' : 'lg'}
              animated={!locked}
            />
          </motion.div>

          {/* Title with text shadow for depth */}
          <h2
            className={cn(
              'font-black uppercase tracking-tight flex-1 min-w-0',
              locked ? 'text-neo-white' : 'text-neo-black',
              secondary && 'text-base sm:text-lg'
            )}
            style={{
              fontSize: secondary ? undefined : 'clamp(1.25rem, 5cqw, 2rem)',
              textShadow: locked
                ? '2px 2px 4px rgba(0,0,0,0.5)'
                : '1px 1px 2px rgba(255,255,255,0.3), 2px 2px 0 rgba(0,0,0,0.1)',
            }}
          >
            {title}
          </h2>

          {/* Arrow indicator */}
          <motion.div
            className={cn(
              'min-w-[44px] min-h-[44px] rounded-full border-neo-black flex items-center justify-center shrink-0',
              secondary ? 'border' : 'border-2',
              locked ? 'bg-neo-black/80 text-neo-white' : 'bg-neo-navy'
            )}
            style={{
              width: secondary ? 'clamp(2.5rem, 6cqw, 3rem)' : 'clamp(3rem, 8cqw, 3.5rem)',
              height: secondary ? 'clamp(2.5rem, 6cqw, 3rem)' : 'clamp(3rem, 8cqw, 3.5rem)',
            }}
            animate={isHovered && !locked ? { x: isRTL ? -4 : 4 } : { x: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {loading ? (
              <NeoLoader variant="dots" size="sm" />
            ) : locked ? (
              <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <ArrowIcon className={cn(
                'text-white',
                variant === 'cyan' && 'text-neo-cyan',
                variant === 'pink' && 'text-neo-pink',
                variant === 'lime' && 'text-neo-lime',
                variant === 'orange' && 'text-neo-orange',
                variant === 'purple' && 'text-neo-purple'
              )} style={{ width: secondary ? '1.25rem' : '1.5rem', height: secondary ? '1.25rem' : '1.5rem' }} />
            )}
          </motion.div>
        </div>

        {/* Description */}
        {!secondary && (
          <p
            className={cn(
              'font-medium mb-4',
              locked ? 'text-neo-white' : 'text-neo-black/90'
            )}
            style={{
              fontSize: 'clamp(0.875rem, 3cqw, 1.125rem)',
              textShadow: locked ? '1px 1px 2px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {description}
          </p>
        )}

        {/* Live badge / Player count */}
        <div className="mt-auto space-y-2">
          {!secondary && liveBadge && (liveBadge.openRooms > 5 || liveBadge.totalPlayers > 5) && (
            <div className="flex flex-wrap gap-2">
              {liveBadge.openRooms > 5 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 bg-neo-cream text-neo-black font-bold rounded-neo border-2 border-neo-black shadow-hard-sm px-2.5 py-1 text-sm"
                >
                  <LayoutGrid className="w-4 h-4" />
                  {liveBadge.openRooms} {liveBadge.roomsLabel}
                </motion.span>
              )}
              {liveBadge.totalPlayers > 5 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-1.5 bg-neo-cream text-neo-black font-bold rounded-neo border-2 border-neo-black shadow-hard-sm px-2.5 py-1 text-sm"
                >
                  <Users className="w-4 h-4" />
                  {liveBadge.totalPlayers} {liveBadge.playersLabel}
                </motion.span>
              )}
            </div>
          )}

          {playerCount && playerCount.count > 0 &&
            (!liveBadge || (liveBadge.openRooms <= 5 && liveBadge.totalPlayers <= 5)) && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-1.5 bg-neo-lime text-neo-black font-bold rounded-neo border-2 border-neo-black shadow-hard-sm px-2.5 py-1 text-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-black opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neo-black" />
              </span>
              <Users className="w-4 h-4" />
              {playerCount.count} {playerCount.label}
            </motion.div>
          )}

          {personalBest && personalBest.score > 0 && !locked && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-1.5 bg-neo-orange text-neo-black font-bold rounded-neo border-2 border-neo-black shadow-hard-sm px-2.5 py-1 text-sm"
            >
              <Trophy className="w-4 h-4" />
              {personalBest.score.toLocaleString()} {personalBest.label}
            </motion.div>
          )}
        </div>
      </div>

      {/* Shimmer effect */}
      {enableComplexAnimations && !prefersReducedMotion && !locked && (
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo-xl"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Locked overlay */}
      {locked && !loading && lockedMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-neo-black/20">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2',
              'bg-neo-navy text-neo-white font-bold rounded-neo',
              'border-3 border-neo-black shadow-hard',
              'text-base sm:text-lg',
              'transform -rotate-2'
            )}
          >
            <Lock className="w-5 h-5" />
            {lockedMessage}
          </motion.span>
        </div>
      )}
    </div>
  );

  // Render appropriate wrapper
  if (loading) {
    return (
      <div className={cn(wrapperClassName, 'cursor-wait')} aria-busy="true">
        {cardContent}
      </div>
    );
  }

  if (locked) {
    return (
      <button type="button" onClick={onLockedClick} className={cn(wrapperClassName, 'text-left')}>
        {cardContent}
      </button>
    );
  }

  return (
    <Link href={href} className={wrapperClassName}>
      {cardContent}
    </Link>
  );
};

export default ModeCardV2;
