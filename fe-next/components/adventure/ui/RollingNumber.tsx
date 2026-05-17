/**
 * RollingNumber Component
 *
 * Animated number counter with rolling digit animation.
 * Creates satisfying counting effect for scores, gold, and XP.
 */

'use client';

import React, { useEffect, useState, useRef, memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';

// ==============================================
// TYPES
// ==============================================

interface RollingNumberProps {
  value: number;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  /**
   * Minimum digits to display (pads with zeros)
   */
  minDigits?: number;
  /**
   * Use compact notation for large numbers (1.2k, 1.5m)
   */
  compact?: boolean;
  /**
   * Animate on value change
   */
  animateOnChange?: boolean;
  /**
   * Color theme
   */
  variant?: 'default' | 'gold' | 'green' | 'white';
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatNumber(num: number, minDigits: number, locale?: string): string {
  return num.toLocaleString(locale).padStart(minDigits, '0');
}

// ==============================================
// COMPONENT
// ==============================================

export const RollingNumber = memo(function RollingNumber({
  value,
  className,
  duration = 1,
  prefix = '',
  suffix = '',
  minDigits = 1,
  compact = false,
  animateOnChange = true,
  variant = 'default',
}: RollingNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  
  // Spring animation for smooth counting
  const springValue = useSpring(value, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  // Transform spring to integer display
  const roundedValue = useTransform(springValue, (latest) => Math.round(latest));

  useEffect(() => {
    if (animateOnChange && value !== prevValueRef.current) {
      springValue.set(value);
    } else {
      setDisplayValue(value);
    }
    prevValueRef.current = value;
  }, [value, animateOnChange, springValue]);

  useEffect(() => {
    // Guard: in some test environments useTransform returns a stub without
    // `.on` (jsdom + framer-motion v12 under React strict-mode double-render);
    // fall back to displaying the value directly so we don't throw.
    if (typeof roundedValue?.on !== 'function') {
      setDisplayValue(value);
      return;
    }
    const unsubscribe = roundedValue.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [roundedValue, value]);

  const { language } = useLanguageSafe();
  const formattedValue = compact
    ? formatCompactNumber(displayValue)
    : formatNumber(displayValue, minDigits, language);

  const variantClasses = {
    default: 'text-neo-white',
    gold: 'text-neo-yellow drop-shadow-[0_0_10px_rgb(255_225_53/0.5)]',
    green: 'text-neo-lime drop-shadow-[0_0_10px_rgb(163_230_53/0.5)]',
    white: 'text-neo-white drop-shadow-[0_2px_4px_rgb(0_0_0/0.5)]',
  };

  return (
    <AdaptiveMotion.span
      className={cn(
        'font-mono font-black tabular-nums inline-flex items-center',
        variantClasses[variant],
        className
      )}
      initial={animateOnChange ? { scale: 1.1 } : false}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {prefix && <span className="opacity-70 me-1">{prefix}</span>}
      <span>{formattedValue}</span>
      {suffix && <span className="opacity-70 ms-1">{suffix}</span>}
    </AdaptiveMotion.span>
  );
});

// ==============================================
// DIGIT ROLLER COMPONENT
// ==============================================

interface DigitRollerProps {
  digit: string;
  className?: string;
  variant?: 'default' | 'gold' | 'green';
}

/**
 * Individual digit with slot-machine rolling animation
 */
export const DigitRoller = memo(function DigitRoller({
  digit,
  className,
  variant = 'default',
}: DigitRollerProps) {
  const variantClasses = {
    default: 'text-neo-white',
    gold: 'text-neo-yellow',
    green: 'text-neo-lime',
  };

  return (
    <div className={cn('relative overflow-hidden h-[1em] w-[0.6em]', className)}>
      <AdaptiveMotion.div
        key={digit}
        initial={{ y: '-100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn('absolute inset-0 flex items-center justify-center', variantClasses[variant])}
      >
        {digit}
      </AdaptiveMotion.div>
    </div>
  );
});

RollingNumber.displayName = 'RollingNumber';
DigitRoller.displayName = 'DigitRoller';

export default RollingNumber;
