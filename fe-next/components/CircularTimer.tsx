import { memo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../utils/accessibility';
import { formatTimeMMSS } from '@/shared/utils';

/**
 * CircularTimer Props
 */
interface CircularTimerProps {
  remainingTime: number;
  totalTime?: number;
  /** Size variant: 'xs' for ultra-compact mobile, 'sm' for compact landscape mode, 'md' (default) for normal, 'lg' for desktop */
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

// Size configurations - frameClasses removed since we no longer have a background frame
const SIZES = {
  xs: { svgSize: 80, radius: 30, strokeWidth: 6, textSize: 'text-xl', frameClasses: '', badgeClasses: 'hidden' },
  sm: { svgSize: 100, radius: 38, strokeWidth: 8, textSize: 'text-2xl', frameClasses: '', badgeClasses: 'hidden' },
  md: { svgSize: 120, radius: 45, strokeWidth: 10, textSize: 'text-3xl', frameClasses: '', badgeClasses: '' },
  lg: { svgSize: 140, radius: 52, strokeWidth: 12, textSize: 'text-4xl', frameClasses: '', badgeClasses: '' },
};

/**
 * CircularTimer - Neo-Brutalist styled countdown timer
 * Memoized to prevent unnecessary re-renders when parent updates
 * Respects prefers-reduced-motion for accessibility
 */
const CircularTimer = memo<CircularTimerProps>(({ remainingTime, totalTime = 180, size = 'md' }) => {
  const reduceMotion = useReducedMotion();
  const config = SIZES[size];

  // Calculate the progress percentage
  const progress = totalTime > 0 ? (remainingTime / totalTime) * 100 : 0;

  // Calculate the stroke dash offset for the circular progress
  const radius = config.radius;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Determine color based on remaining time (20 seconds to match music transition)
  const isLowTime = remainingTime <= 20;

  const svgCenter = config.svgSize / 2;

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-center"
    >
      {/* Neo-Brutalist frame - circular design */}
      <div
        className={`
          relative
          ${config.frameClasses}
        `}
      >
        <div className="relative">
          <svg width={config.svgSize} height={config.svgSize} className="transform -rotate-90">
            {/* Neo-Brutalist: Solid colors instead of gradients */}

            {/* Background circle - thick black stroke */}
            <circle
              cx={svgCenter}
              cy={svgCenter}
              r={radius}
              stroke="var(--neo-black)"
              strokeWidth={size === 'xs' ? 1.5 : size === 'sm' ? 2 : 4}
              fill="none"
              opacity="0.2"
            />

            {/* Inner background circle */}
            <circle
              cx={svgCenter}
              cy={svgCenter}
              r={radius - (size === 'xs' ? 2 : size === 'sm' ? 3 : 6)}
              stroke="var(--neo-black)"
              strokeWidth={size === 'xs' ? 4 : size === 'sm' ? 6 : 12}
              fill="none"
              opacity="0.1"
            />

            {/* Progress circle - solid Neo-Brutalist colors */}
            <motion.circle
              cx={svgCenter}
              cy={svgCenter}
              r={radius}
              stroke={isLowTime ? 'var(--neo-red)' : 'var(--neo-cyan)'}
              strokeWidth={config.strokeWidth}
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
              cx={svgCenter}
              cy={svgCenter}
              r={radius + (size === 'xs' ? 1.5 : size === 'sm' ? 2 : 4)}
              stroke="var(--neo-black)"
              strokeWidth={size === 'xs' ? 1.5 : size === 'sm' ? 2 : 3}
              fill="none"
            />
          </svg>

          {/* Timer text in the center - color change only for low time, no animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`${config.textSize} font-black ${isLowTime ? 'text-neo-red' : 'text-neo-cream'}`}
              style={{
                textShadow: isLowTime
                  ? `${size === 'xs' || size === 'sm' ? '1px 1px' : '2px 2px'} 0px rgba(0,0,0,0.3)`
                  : `${size === 'xs' || size === 'sm' ? '1px 1px' : '2px 2px'} 0px rgba(0,0,0,0.5)`,
                transition: 'color 0.3s ease',
              }}
            >
              {formatTimeMMSS(remainingTime)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

CircularTimer.displayName = 'CircularTimer';

export default CircularTimer;
