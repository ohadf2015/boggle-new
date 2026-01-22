/**
 * AdventureTimer Component
 *
 * Displays countdown timer with urgency states (normal, warning, danger).
 */

'use client';

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
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

// ==============================================
// CONSTANTS
// ==============================================

const WARNING_THRESHOLD = 30; // Seconds
const DANGER_THRESHOLD = 10; // Seconds

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Format seconds as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get urgency level from time remaining
 */
function getUrgencyLevel(
  seconds: number
): 'normal' | 'warning' | 'danger' {
  if (seconds < DANGER_THRESHOLD) return 'danger';
  if (seconds < WARNING_THRESHOLD) return 'warning';
  return 'normal';
}

// ==============================================
// COMPONENT
// ==============================================

const AdventureTimer = memo<AdventureTimerProps>(
  ({ timeRemaining, size = 'normal', className }) => {
    const urgency = useMemo(
      () => getUrgencyLevel(timeRemaining),
      [timeRemaining]
    );
    const formattedTime = useMemo(
      () => formatTime(timeRemaining),
      [timeRemaining]
    );
    const isDanger = urgency === 'danger';

    return (
      <div
        role="timer"
        aria-label={`${timeRemaining} seconds remaining`}
        aria-live={isDanger ? 'assertive' : 'polite'}
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          'rounded-neo border-2',
          'font-mono font-black',
          'transition-all duration-300',

          // Size variants
          size === 'compact' && 'timer-compact text-sm px-2 py-1',
          size === 'normal' && 'text-lg',
          size === 'large' && 'timer-large text-2xl px-4 py-3',

          // Urgency states
          urgency === 'normal' && [
            'timer-normal',
            'bg-neo-navy/80 border-neo-white/20',
            'text-neo-white',
          ],
          urgency === 'warning' && [
            'timer-warning',
            'bg-neo-orange/20 border-neo-orange/60',
            'text-neo-orange',
          ],
          urgency === 'danger' && [
            'timer-danger',
            'bg-neo-red/20 border-neo-red/60',
            'text-neo-red',
          ],

          className
        )}
      >
        {/* Timer Icon */}
        <Clock
          data-testid="timer-icon"
          className={cn(
            'w-5 h-5',
            size === 'compact' && 'w-4 h-4',
            size === 'large' && 'w-6 h-6'
          )}
        />

        {/* Time Display */}
        <span className="tabular-nums">{formattedTime}</span>

        {/* Danger Pulse Animation */}
        {isDanger && (
          <motion.div
            className="timer-pulse absolute inset-0 rounded-neo"
            animate={{
              boxShadow: [
                '0 0 0px rgba(255, 0, 0, 0)',
                '0 0 20px rgba(255, 0, 0, 0.5)',
                '0 0 0px rgba(255, 0, 0, 0)',
              ],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>
    );
  }
);

AdventureTimer.displayName = 'AdventureTimer';

export default AdventureTimer;
