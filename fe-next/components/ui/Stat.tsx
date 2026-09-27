'use client';

/**
 * Unified Stat Component
 *
 * Consolidates all stat display variants into a single, flexible component.
 *
 * Replaces:
 * - StatBadge (components/ui/StatBadge.tsx)
 * - StatDisplay (components/ui/stat-display.tsx)
 * - StatCard (components/ui/stat-display.tsx)
 * - StatCard (components/profile/StatCard.tsx)
 *
 * Key Features:
 * - Interactive vs non-interactive styling
 * - Icon in colored box or above value
 * - Multiple size variants
 * - Dark mode support
 * - Gradient backgrounds
 * - Neo-Brutalist styling
 *
 * @module components/ui/Stat
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export type StatVariant =
  | 'default'    // Standard styling
  | 'accent'     // Cyan accent
  | 'success'    // Lime/green success
  | 'warning'    // Yellow warning
  | 'info'       // Pink info
  | 'highlight'; // Gradient highlight

export type StatSize = 'sm' | 'md' | 'lg';

export type StatIconStyle =
  | 'box'    // Icon in a colored container (StatBadge style)
  | 'above'  // Icon directly above value (StatDisplay/StatCard style)
  | 'none';  // No icon

export interface StatProps {
  /** The main value to display */
  value: string | number;

  /** Label describing what the value represents */
  label: string;

  /** Optional icon component or element */
  icon?: React.ElementType | React.ReactNode;

  /** Visual variant */
  variant?: StatVariant;

  /** Size of the stat display */
  size?: StatSize;

  /** How to display the icon */
  iconStyle?: StatIconStyle;

  /** Background color for icon container (only used with iconStyle="box") */
  iconBgColor?: string;

  /** Icon color class (Tailwind class) */
  iconColor?: string;

  /** Whether this stat is interactive (affects styling) */
  interactive?: boolean;

  /** Optional sub-value text (smaller text below label) */
  subValue?: string;

  /** Additional CSS classes */
  className?: string;

  /** Click handler (only applies if interactive=true) */
  onClick?: () => void;

  /** Accessibility label override */
  'aria-label'?: string;
}

// ==================== Variant Configurations ====================

const VARIANT_STYLES: Record<StatVariant, { bg: string; border: string; text: string }> = {
  default: {
    bg: 'bg-neo-navy/50',
    border: 'border-neo-cream/20',
    text: 'text-neo-white',
  },
  accent: {
    bg: 'bg-neo-cyan/20',
    border: 'border-neo-cyan/30',
    text: 'text-neo-cyan',
  },
  success: {
    bg: 'bg-neo-lime/20',
    border: 'border-neo-lime/30',
    text: 'text-neo-lime',
  },
  warning: {
    bg: 'bg-neo-yellow/20',
    border: 'border-neo-yellow/30',
    text: 'text-neo-yellow',
  },
  info: {
    bg: 'bg-neo-pink/20',
    border: 'border-neo-pink/30',
    text: 'text-neo-pink',
  },
  highlight: {
    bg: 'bg-linear-to-br from-cyan-900/30 to-blue-900/30',
    border: 'border-neo-cyan/30',
    text: 'text-neo-cyan',
  },
};

const SIZE_CONFIGS = {
  sm: {
    wrapper: 'p-2 gap-0.5',
    iconContainer: 'w-4 h-4',
    iconSize: 'w-2.5 h-2.5',
    value: 'text-sm',
    label: 'text-[7px]',
    subValue: 'text-[6px]',
  },
  md: {
    wrapper: 'p-2 sm:p-3 gap-1',
    iconContainer: 'w-5 h-5 sm:w-6 sm:h-6',
    iconSize: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
    value: 'text-lg sm:text-xl',
    label: 'text-[8px] sm:text-[9px]',
    subValue: 'text-[7px] sm:text-xs',
  },
  lg: {
    wrapper: 'p-3 sm:p-4 gap-1.5',
    iconContainer: 'w-6 h-6 sm:w-8 sm:h-8',
    iconSize: 'w-3.5 h-3.5 sm:w-5 sm:h-5',
    value: 'text-xl sm:text-2xl',
    label: 'text-[9px] sm:text-xs',
    subValue: 'text-xs',
  },
};

// ==================== Component ====================

/**
 * Unified Stat component for displaying statistics
 *
 * @example
 * // Icon in colored box (StatBadge style)
 * <Stat
 *   icon={Hash}
 *   value={42}
 *   label="Words"
 *   iconStyle="box"
 *   iconBgColor="bg-neo-lime"
 * />
 *
 * @example
 * // Non-interactive display (StatDisplay style)
 * <Stat
 *   value="95%"
 *   label="Accuracy"
 *   variant="success"
 *   interactive={false}
 * />
 *
 * @example
 * // Card with gradient (StatCard highlight style)
 * <Stat
 *   icon={Trophy}
 *   value={1234}
 *   label="High Score"
 *   variant="highlight"
 *   size="lg"
 *   iconStyle="above"
 * />
 */
export function Stat({
  value,
  label,
  icon,
  variant = 'default',
  size = 'md',
  iconStyle = icon ? 'above' : 'none',
  iconBgColor = 'bg-neo-lime',
  iconColor = 'text-neo-black',
  interactive = true,
  subValue,
  className,
  onClick,
  'aria-label': ariaLabel,
}: StatProps) {
  const sizeConfig = SIZE_CONFIGS[size];
  const variantStyle = VARIANT_STYLES[variant];

  // Determine border style based on interactive state
  const borderStyle = interactive
    ? 'border-2'  // Solid border for interactive
    : 'border border-dashed';  // Dashed border for non-interactive

  // Determine shadow based on interactive state
  const shadowStyle = interactive ? 'shadow-xs' : 'shadow-none';

  // Base wrapper classes
  const wrapperClasses = cn(
    'inline-flex flex-col items-center justify-center text-center',
    'rounded-neo transition-all',
    borderStyle,
    shadowStyle,
    variantStyle.bg,
    variantStyle.border,
    sizeConfig.wrapper,
    interactive && onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
    !interactive && 'cursor-default select-none',
    className
  );

  // Render icon based on style
  const renderIcon = () => {
    if (iconStyle === 'none' || !icon) return null;

    // Check if icon is already a React element
    const isReactElement = React.isValidElement(icon);

    // Check if icon is a component (function or object with $$typeof - handles forwardRef)
    const isIconComponent = typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && '$$typeof' in icon);

    if (iconStyle === 'box') {
      // Icon in colored container (StatBadge style)
      return (
        <div className={cn('flex justify-center', size === 'sm' ? 'mb-0.5' : 'mb-0.5 sm:mb-1')}>
          <div
            className={cn(
              'rounded border border-neo-black flex items-center justify-center',
              iconBgColor,
              sizeConfig.iconContainer
            )}
          >
            {isIconComponent && !isReactElement ? (
              (() => {
                const IconComponent = icon as React.ComponentType<{ className?: string }>;
                return <IconComponent className={cn(iconColor, sizeConfig.iconSize)} />;
              })()
            ) : isReactElement ? (
              icon
            ) : (
              <span className={cn(iconColor, sizeConfig.iconSize)}>{icon as React.ReactNode}</span>
            )}
          </div>
        </div>
      );
    }

    // Icon above value (StatDisplay/StatCard style)
    return (
      <div className="text-muted-foreground mb-1" aria-hidden="true">
        {isIconComponent && !isReactElement ? (
          (() => {
            const IconComponent = icon as React.ComponentType<{ className?: string }>;
            return <IconComponent className={sizeConfig.iconSize} />;
          })()
        ) : (
          icon as React.ReactNode
        )}
      </div>
    );
  };

  // Accessibility label
  const accessibilityLabel = ariaLabel || `${label}: ${value}${subValue ? ` (${subValue})` : ''}`;

  return (
    <div
      className={wrapperClasses}
      onClick={onClick}
      role="status"
      aria-label={accessibilityLabel}
    >
      {renderIcon()}

      {/* Value */}
      <div
        className={cn(
          'font-black',
          variant === 'highlight' || variant === 'accent' || variant === 'success'
            ? variantStyle.text
            : 'text-neo-white',
          sizeConfig.value
        )}
      >
        {value}
      </div>

      {/* Label */}
      <div
        className={cn(
          'font-bold uppercase tracking-wide',
          'text-muted-foreground',
          sizeConfig.label
        )}
      >
        {label}
      </div>

      {/* Optional sub-value */}
      {subValue && (
        <div
          className={cn(
            'text-muted-foreground',
            sizeConfig.subValue
          )}
        >
          {subValue}
        </div>
      )}
    </div>
  );
}

export default Stat;
