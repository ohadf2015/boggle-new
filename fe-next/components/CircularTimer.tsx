import { memo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useReducedMotion } from '../utils/accessibility';

/**
 * CircularTimer Props
 */
interface CircularTimerProps {
  remainingTime: number;
  totalTime?: number;
  /** Size variant: 'sm' for compact landscape mode, 'md' (default) for normal, 'lg' for desktop */
  size?: 'sm' | 'md' | 'lg';
}

// Size configurations
const SIZES = {
  sm: { svgSize: 100, radius: 38, strokeWidth: 8, textSize: 'text-2xl', frameClasses: 'p-2 border-3', badgeClasses: 'hidden' },
  md: { svgSize: 120, radius: 45, strokeWidth: 10, textSize: 'text-3xl', frameClasses: 'p-3 border-4', badgeClasses: '' },
  lg: { svgSize: 140, radius: 52, strokeWidth: 12, textSize: 'text-4xl', frameClasses: 'p-4 border-4', badgeClasses: '' },
};

// Format time as MM:SS - defined outside component to avoid recreation on each render
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * CircularTimer - Neo-Brutalist styled countdown timer
 * Memoized to prevent unnecessary re-renders when parent updates
 * Respects prefers-reduced-motion for accessibility
 */
const CircularTimer = memo<CircularTimerProps>(({ remainingTime, totalTime = 180, size = 'md' }) => {
  const { t } = useLanguage();
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
      initial={reduceMotion ? { opacity: 1 } : { scale: 0, opacity: 0, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55] }}
      className="flex items-center justify-center"
    >
      {/* Neo-Brutalist frame */}
      <div
        className={`
          relative
          bg-neo-cream text-neo-black
          border-neo-black
          rounded-neo-lg
          ${size === 'sm' ? 'shadow-hard-sm' : size === 'lg' ? 'shadow-hard-xl' : 'shadow-hard-lg'}
          ${config.frameClasses}
        `}
        style={{ transform: size === 'sm' ? 'rotate(-1deg)' : 'rotate(-2deg)' }}
      >
        <div className="relative" style={{ transform: size === 'sm' ? 'rotate(1deg)' : 'rotate(2deg)' }}>
          <svg width={config.svgSize} height={config.svgSize} className="transform -rotate-90">
            {/* Neo-Brutalist: Solid colors instead of gradients */}

            {/* Background circle - thick black stroke */}
            <circle
              cx={svgCenter}
              cy={svgCenter}
              r={radius}
              stroke="var(--neo-black)"
              strokeWidth={size === 'sm' ? 2 : 4}
              fill="none"
              opacity="0.2"
            />

            {/* Inner background circle */}
            <circle
              cx={svgCenter}
              cy={svgCenter}
              r={radius - (size === 'sm' ? 3 : 6)}
              stroke="var(--neo-black)"
              strokeWidth={size === 'sm' ? 6 : 12}
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
              r={radius + (size === 'sm' ? 2 : 4)}
              stroke="var(--neo-black)"
              strokeWidth={size === 'sm' ? 2 : 3}
              fill="none"
            />
          </svg>

          {/* Timer text in the center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={isLowTime && !reduceMotion ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: isLowTime && !reduceMotion ? Infinity : 0 }}
              className={`${config.textSize} font-black text-neo-black`}
              style={{
                textShadow: isLowTime
                  ? `${size === 'sm' ? '1px 1px' : '2px 2px'} 0px var(--neo-red)`
                  : `${size === 'sm' ? '1px 1px' : '2px 2px'} 0px var(--neo-cyan)`,
              }}
            >
              {formatTime(remainingTime)}
            </motion.div>
          </div>
        </div>

        {/* Low time warning badge - hidden on small size */}
        {isLowTime && (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: reduceMotion ? 0 : 12, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : undefined}
            className={`
              absolute -top-2 -right-2 z-10
              px-2 py-1
              bg-neo-red text-neo-cream
              text-xs font-black uppercase
              border-2 border-neo-black
              rounded-neo
              shadow-hard-sm
              whitespace-nowrap
              ${config.badgeClasses}
            `}
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
