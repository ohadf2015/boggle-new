'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface StatBadgeProps {
  /** Icon component to display */
  icon: React.ElementType;
  /** The main value to display (number or string) */
  value: string | number;
  /** Label text below the value */
  label: string;
  /** Background color for the icon container (Tailwind class) */
  iconBgColor?: string;
  /** Icon color class (Tailwind class, defaults based on iconBgColor) */
  iconColor?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class name for the wrapper */
  className?: string;
  /** Whether to use dark mode styling */
  darkMode?: boolean;
}

/**
 * StatBadge - A reusable stat display component
 *
 * Shows an icon, value, and label in a compact badge format.
 * Used in player cards, result screens, and stat displays.
 *
 * @example
 * ```tsx
 * <StatBadge
 *   icon={Hash}
 *   value={42}
 *   label="Words"
 *   iconBgColor="bg-neo-lime"
 * />
 *
 * <StatBadge
 *   icon={Target}
 *   value="85%"
 *   label="Accuracy"
 *   iconBgColor="bg-neo-pink"
 *   size="lg"
 * />
 * ```
 */
export function StatBadge({
  icon: Icon,
  value,
  label,
  iconBgColor = 'bg-neo-lime',
  iconColor = 'text-neo-black',
  size = 'md',
  className,
  darkMode = false,
}: StatBadgeProps) {
  const sizeStyles = {
    sm: {
      wrapper: 'p-1',
      iconContainer: 'w-4 h-4',
      iconSize: 'w-2.5 h-2.5',
      value: 'text-sm',
      label: 'text-[7px]',
    },
    md: {
      wrapper: 'p-1.5 sm:p-2',
      iconContainer: 'w-5 h-5 sm:w-6 sm:h-6',
      iconSize: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
      value: 'text-lg sm:text-xl',
      label: 'text-[8px] sm:text-[9px]',
    },
    lg: {
      wrapper: 'p-2 sm:p-3',
      iconContainer: 'w-6 h-6 sm:w-8 sm:h-8',
      iconSize: 'w-3.5 h-3.5 sm:w-5 sm:h-5',
      value: 'text-xl sm:text-2xl',
      label: 'text-[9px] sm:text-xs',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'rounded-neo border text-center',
        darkMode
          ? 'bg-white/10 border-white/20'
          : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/20',
        styles.wrapper,
        className
      )}
    >
      {/* Icon Container */}
      <div className={cn('flex justify-center', size === 'sm' ? 'mb-0.5' : 'mb-0.5 sm:mb-1')}>
        <div
          className={cn(
            'rounded border border-neo-black flex items-center justify-center',
            iconBgColor,
            styles.iconContainer
          )}
        >
          <Icon className={cn(iconColor, styles.iconSize)} />
        </div>
      </div>

      {/* Value */}
      <div
        className={cn(
          'font-black',
          darkMode ? 'text-white' : 'text-neo-black dark:text-white',
          styles.value
        )}
      >
        {value}
      </div>

      {/* Label */}
      <div
        className={cn(
          'font-bold uppercase',
          darkMode ? 'text-white/60' : 'text-slate-500 dark:text-white/60',
          styles.label
        )}
      >
        {label}
      </div>
    </div>
  );
}

export default StatBadge;
