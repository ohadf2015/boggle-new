import React, { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * CircularTimer Props
 */
interface CircularTimerProps {
  remainingTime: number;
  totalTime?: number;
}

/**
 * CircularTimer - Neo-Brutalist styled countdown timer
 * Memoized to prevent unnecessary re-renders when parent updates
 */
const CircularTimer = memo<CircularTimerProps>(({ remainingTime, totalTime = 180 }) => {
  const { t } = useLanguage();

  // Calculate the progress percentage
  const progress = totalTime > 0 ? (remainingTime / totalTime) * 100 : 0;

  // Calculate the stroke dash offset for the circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const paddedSecs = secs < 10 ? `0${secs}` : secs;
    return `${mins}:${paddedSecs}`;
  };

  // Determine color based on remaining time (20 seconds to match music transition)
  const isLowTime = remainingTime <= 20;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55] }}
      className="flex items-center justify-center"
    >
      {/* Neo-Brutalist frame */}
      <div
        className="
          relative p-3
          bg-neo-cream
          border-4 border-neo-black
          rounded-neo-lg
          shadow-hard-lg
        "
        style={{ transform: 'rotate(-2deg)' }}
      >
        <div className="relative" style={{ transform: 'rotate(2deg)' }}>
          <svg width="120" height="120" className="transform -rotate-90">
            {/* Neo-Brutalist: Solid colors instead of gradients */}

            {/* Background circle - thick black stroke */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="var(--neo-black)"
              strokeWidth="4"
              fill="none"
              opacity="0.2"
            />

            {/* Inner background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius - 6}
              stroke="var(--neo-black)"
              strokeWidth="12"
              fill="none"
              opacity="0.1"
            />

            {/* Progress circle - solid Neo-Brutalist colors */}
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              stroke={isLowTime ? 'var(--neo-red)' : 'var(--neo-cyan)'}
              strokeWidth="10"
              fill="none"
              strokeLinecap="square"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5 }}
            />

            {/* Outer ring */}
            <circle
              cx="60"
              cy="60"
              r={radius + 4}
              stroke="var(--neo-black)"
              strokeWidth="3"
              fill="none"
            />
          </svg>

          {/* Timer text in the center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
              className="text-3xl font-black text-neo-black"
              style={{
                textShadow: isLowTime
                  ? '2px 2px 0px var(--neo-red)'
                  : '2px 2px 0px var(--neo-cyan)',
              }}
            >
              {formatTime(remainingTime)}
            </motion.div>
          </div>
        </div>

        {/* Low time warning badge */}
        {isLowTime && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 12 }}
            className="
              absolute -top-2 -right-2 z-10
              px-2 py-1
              bg-neo-red text-neo-cream
              text-[10px] font-black uppercase
              border-2 border-neo-black
              rounded-neo
              shadow-hard-sm
              whitespace-nowrap
            "
          >
            {t('common.hurry')}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

CircularTimer.displayName = 'CircularTimer';

export default CircularTimer;
