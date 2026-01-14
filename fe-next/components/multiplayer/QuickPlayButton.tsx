'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickPlayButtonProps {
  onQuickPlay: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  t: (path: string) => string;
  className?: string;
  variant?: 'hero' | 'compact';
}

/**
 * QuickPlayButton - Prominent 1-tap button for instant multiplayer room creation
 *
 * Features:
 * - Eye-catching animation and design
 * - Loading state during room creation
 * - Hero variant for main screen, compact for secondary use
 */
const QuickPlayButton: React.FC<QuickPlayButtonProps> = ({
  onQuickPlay,
  isLoading = false,
  disabled = false,
  t,
  className,
  variant = 'hero',
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    if (isLoading || disabled) return;
    onQuickPlay();
  }, [onQuickPlay, isLoading, disabled]);

  const isHero = variant === 'hero';

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading || disabled}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : undefined}
      className={cn(
        'relative overflow-hidden',
        'rounded-neo-lg border-4 border-neo-black',
        'font-black uppercase tracking-wide',
        'transition-all duration-200',
        // Pressed state shadow
        isPressed ? 'shadow-hard-pressed translate-x-[2px] translate-y-[2px]' : 'shadow-hard-lg',
        // Disabled state
        (disabled || isLoading) && 'opacity-70 cursor-not-allowed',
        // Hero variant styles
        isHero && [
          'w-full py-5 px-6',
          'text-xl lg:text-2xl',
          'bg-gradient-to-r from-neo-cyan via-neo-lime to-neo-cyan',
          'text-neo-black',
        ],
        // Compact variant styles
        !isHero && [
          'py-3 px-5',
          'text-base',
          'bg-neo-cyan',
          'text-neo-black',
        ],
        className
      )}
    >
      {/* Animated background shimmer */}
      {isHero && !isLoading && !disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Button content */}
      <span className="relative flex items-center justify-center gap-3">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
            >
              <Loader2 className={cn('animate-spin', isHero ? 'w-7 h-7' : 'w-5 h-5')} />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Zap className={cn(isHero ? 'w-7 h-7' : 'w-5 h-5')} />
            </motion.span>
          )}
        </AnimatePresence>

        <span>
          {isLoading
            ? t('quickPlay.creating') || 'Creating...'
            : t('quickPlay.title') || 'Quick Play'}
        </span>

        {/* Player count indicator - only in hero mode */}
        {isHero && !isLoading && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-1 text-sm font-bold bg-neo-black/20 px-2 py-1 rounded-neo"
          >
            <Users className="w-4 h-4" />
            <span>{t('quickPlay.hostAndPlay') || 'Host & Play'}</span>
          </motion.span>
        )}
      </span>

      {/* Subtitle - only in hero mode */}
      {isHero && !isLoading && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-medium normal-case tracking-normal mt-1 text-neo-black/70"
        >
          {t('quickPlay.subtitle') || 'Instant room • Friends join via QR'}
        </motion.p>
      )}
    </motion.button>
  );
};

export default QuickPlayButton;
