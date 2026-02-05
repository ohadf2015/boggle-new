/**
 * EnhancedTimer Component
 *
 * Animated countdown timer with urgency states, flip animation, and visual warnings.
 * Creates tension as time runs out.
 */

'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==============================================
// TYPES
// ==============================================

interface EnhancedTimerProps {
  timeRemaining: number;
  totalTime: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
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
    <div className={cn('relative w-[0.6em] h-[1.2em] overflow-hidden', className)}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={digit}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center font-mono"
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

export const EnhancedTimer = memo(function EnhancedTimer({
  timeRemaining,
  totalTime,
  size = 'md',
  className,
  showIcon = true,
}: EnhancedTimerProps) {
  // Format time
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const minTens = Math.floor(minutes / 10).toString();
  const minOnes = (minutes % 10).toString();
  const secTens = Math.floor(seconds / 10).toString();
  const secOnes = (seconds % 10).toString();

  // Determine urgency state based on time thresholds
  function getUrgencyState(): 'critical' | 'danger' | 'warning' | 'normal' {
    if (timeRemaining <= CRITICAL_THRESHOLD) return 'critical';
    if (timeRemaining <= DANGER_THRESHOLD) return 'danger';
    if (timeRemaining <= WARNING_THRESHOLD) return 'warning';
    return 'normal';
  }

  const urgencyState = getUrgencyState();
  const progress = (timeRemaining / totalTime) * 100;

  // Size classes
  const sizeClasses = {
    sm: 'text-lg px-2 py-1',
    md: 'text-2xl px-3 py-2',
    lg: 'text-4xl px-4 py-3',
  };

  // Urgency styles
  const urgencyStyles = {
    normal: {
      bg: 'bg-neo-navy/80',
      border: 'border-2 border-neo-white/20',
      text: 'text-neo-white',
      shadow: 'shadow-hard-sm',
      progressColor: '#22d3ee',
    },
    warning: {
      bg: 'bg-neo-orange/20',
      border: 'border-2 border-neo-orange/60',
      text: 'text-neo-orange',
      shadow: 'shadow-[0_0_20px_rgba(255,107,53,0.3)]',
      progressColor: '#ff6b35',
    },
    danger: {
      bg: 'bg-neo-red/20',
      border: 'border-2 border-neo-red/60',
      text: 'text-neo-red',
      shadow: 'shadow-[0_0_30px_rgba(255,0,0,0.4)]',
      progressColor: '#ff0000',
    },
    critical: {
      bg: 'bg-neo-red/30',
      border: 'border-3 border-neo-red animate-pulse-border',
      text: 'text-neo-red',
      shadow: 'shadow-[0_0_40px_rgba(255,0,0,0.6)]',
      progressColor: '#ff0000',
    },
  };

  const styles = urgencyStyles[urgencyState];

  return (
    <motion.div
      className={cn(
        'relative rounded-neo flex items-center gap-2 font-black',
        'backdrop-blur-sm transition-all duration-300',
        sizeClasses[size],
        styles.bg,
        styles.border,
        styles.text,
        className
      )}
      style={{ boxShadow: styles.shadow }}
      animate={urgencyState === 'critical' ? {
        scale: [1, 1.02, 1],
      } : {}}
      transition={{ duration: 0.5, repeat: urgencyState === 'critical' ? Infinity : 0 }}
    >
      {/* Progress ring SVG */}
      <svg 
        className="absolute inset-0 w-full h-full -z-10 opacity-20"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="8"
          fill="none"
          stroke={styles.progressColor}
          strokeWidth="4"
          strokeDasharray="384"
          strokeDashoffset={384 - (384 * progress) / 100}
          className="transition-all duration-1000"
        />
      </svg>

      {/* Icon */}
      {showIcon && (
        <div className="relative">
          {(() => {
            const iconClasses = cn(
              'flex-shrink-0',
              size === 'sm' && 'w-4 h-4',
              size === 'md' && 'w-5 h-5',
              size === 'lg' && 'w-8 h-8'
            );

            if (urgencyState === 'critical') {
              return (
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <AlertTriangle className={iconClasses} />
                </motion.div>
              );
            }
            return <Clock className={iconClasses} />;
          })()}
        </div>
      )}

      {/* Time display with flip animation */}
      <div className="flex items-center font-mono tabular-nums">
        {/* Minutes */}
        <FlipDigit digit={minTens} />
        <FlipDigit digit={minOnes} />
        
        {/* Separator */}
        <motion.span 
          className="mx-0.5"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          :
        </motion.span>
        
        {/* Seconds */}
        <FlipDigit digit={secTens} />
        <FlipDigit digit={secOnes} />
      </div>

      {/* Urgency glow effect */}
      {urgencyState !== 'normal' && (
        <motion.div
          className="absolute inset-0 rounded-neo pointer-events-none"
          animate={{
            boxShadow: [
              `0 0 10px ${styles.progressColor}40`,
              `0 0 30px ${styles.progressColor}60`,
              `0 0 10px ${styles.progressColor}40`,
            ],
          }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
});

EnhancedTimer.displayName = 'EnhancedTimer';
FlipDigit.displayName = 'FlipDigit';

export default EnhancedTimer;
