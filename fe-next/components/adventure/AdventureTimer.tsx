/**
 * AdventureTimer Component
 *
 * Displays countdown timer with urgency states (normal, warning, danger).
 * Features flip digit animation and pulsing glow effects.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==============================================
// TYPES
// ==============================================

interface AdventureTimerProps {
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Size variant */
  size?: 'compact' | 'normal' | 'large';
  /** Additional CSS classes */
  className?: string;
}

interface FlipDigitProps {
  digit: string;
  className?: string;
}

// ==============================================
// CONSTANTS
// ==============================================

const WARNING_THRESHOLD = 30;
const DANGER_THRESHOLD = 10;
const CRITICAL_THRESHOLD = 5;

// ==============================================
// FLIP DIGIT COMPONENT
// ==============================================

const FlipDigit = memo(function FlipDigit({ digit, className }: FlipDigitProps) {
  return (
    <div className={cn('relative w-[0.55em] h-[1.1em] overflow-hidden', className)}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={digit}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
});

// ==============================================
// MAIN COMPONENT
// ==============================================

const AdventureTimer = memo<AdventureTimerProps>(
  ({ timeRemaining, size = 'normal', className }) => {
    // Format time
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    const minTens = Math.floor(minutes / 10).toString();
    const minOnes = (minutes % 10).toString();
    const secTens = Math.floor(seconds / 10).toString();
    const secOnes = (seconds % 10).toString();

    // Determine urgency state
    const urgencyState = useMemo(() => {
      if (timeRemaining <= CRITICAL_THRESHOLD) return 'critical';
      if (timeRemaining <= DANGER_THRESHOLD) return 'danger';
      if (timeRemaining <= WARNING_THRESHOLD) return 'warning';
      return 'normal';
    }, [timeRemaining]);

    const isDanger = urgencyState === 'danger' || urgencyState === 'critical';
    const isCritical = urgencyState === 'critical';

    // Size classes
    const sizeClasses = {
      compact: 'text-xs sm:text-sm px-2 py-1 gap-1',
      normal: 'text-lg px-3 py-2 gap-2',
      large: 'text-3xl px-4 py-3 gap-3',
    };

    const iconSizes = {
      compact: 'w-3 h-3 sm:w-4 sm:h-4',
      normal: 'w-5 h-5',
      large: 'w-8 h-8',
    };

    // Urgency styles
    const urgencyStyles = {
      normal: {
        bg: 'bg-neo-navy/80 border-neo-white/20',
        text: 'text-neo-white',
        shadow: 'shadow-hard-sm',
        pulse: false,
      },
      warning: {
        bg: 'bg-neo-orange/20 border-neo-orange/60',
        text: 'text-neo-orange',
        shadow: 'shadow-[0_0_20px_rgba(255,107,53,0.3)]',
        pulse: false,
      },
      danger: {
        bg: 'bg-neo-red/20 border-neo-red/60',
        text: 'text-neo-red',
        shadow: 'shadow-[0_0_30px_rgba(255,0,0,0.4)]',
        pulse: true,
      },
      critical: {
        bg: 'bg-neo-red/30 border-neo-red',
        text: 'text-neo-red',
        shadow: 'shadow-[0_0_40px_rgba(255,0,0,0.6)]',
        pulse: true,
      },
    };

    const styles = urgencyStyles[urgencyState];

    return (
      <motion.div
        role="timer"
        aria-label={`${timeRemaining} seconds remaining`}
        aria-live={isDanger ? 'assertive' : 'polite'}
        className={cn(
          'flex items-center rounded-neo border-2 font-black backdrop-blur-sm',
          'transition-all duration-300',
          sizeClasses[size],
          styles.bg,
          styles.text,
          className
        )}
        style={{ boxShadow: styles.shadow }}
        animate={styles.pulse ? {
          scale: [1, 1.02, 1],
        } : {}}
        transition={{ duration: 0.5, repeat: styles.pulse ? Infinity : 0 }}
      >
        {/* Icon */}
        <div className="relative">
          {isCritical ? (
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <AlertTriangle className={iconSizes[size]} />
            </motion.div>
          ) : (
            <Clock className={iconSizes[size]} />
          )}
        </div>

        {/* Time display with flip animation */}
        <div className="flex items-center font-mono tabular-nums">
          {/* Minutes */}
          <FlipDigit digit={minTens} />
          <FlipDigit digit={minOnes} />
          
          {/* Separator */}
          <motion.span 
            className="mx-0.5 opacity-60"
            animate={{ opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            :
          </motion.span>
          
          {/* Seconds */}
          <FlipDigit digit={secTens} />
          <FlipDigit digit={secOnes} />
        </div>

        {/* Urgency glow effect */}
        {isDanger && (
          <motion.div
            className="absolute inset-0 rounded-neo pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 10px rgba(255, 0, 0, 0.4)',
                '0 0 25px rgba(255, 0, 0, 0.6)',
                '0 0 10px rgba(255, 0, 0, 0.4)',
              ],
            }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.div>
    );
  }
);

AdventureTimer.displayName = 'AdventureTimer';
FlipDigit.displayName = 'FlipDigit';

export default AdventureTimer;
