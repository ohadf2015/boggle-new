'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Enhanced Card Component - Neo-Brutalist with Glassy Modern UI
 *
 * Features:
 * - Backdrop blur effect (glassy appearance)
 * - Smooth cubic-bezier transitions
 * - Glow effects on hover
 * - Hover lift effect with shadow enhancement
 * - Press feedback animation
 * - Optional interactive states
 * - Loading skeleton support
 * - Better accessibility attributes
 */

export interface EnhancedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Make the card interactive (clickable) */
  isInteractive?: boolean;
  /** Show loading skeleton state */
  isLoading?: boolean;
  /** Disable interactions */
  isDisabled?: boolean;
  /** Card elevation level */
  elevation?: 'flat' | 'default' | 'raised' | 'floating';
  /** Border color variant */
  borderColor?: 'default' | 'primary' | 'secondary' | 'accent' | 'none';
  /** Background variant */
  bgVariant?: 'default' | 'gradient' | 'transparent' | 'glassy';
  /** Click handler for interactive cards */
  onCardClick?: () => void;
  /** Haptic feedback on tap (mobile) */
  haptic?: boolean;
  /** Reduce motion for accessibility */
  reduceMotion?: boolean;
  /** Glow color on hover (for interactive cards) */
  glowColor?: 'lime' | 'pink' | 'cyan' | 'purple' | 'none';
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  (
    {
      className,
      children,
      isInteractive = false,
      isLoading = false,
      isDisabled = false,
      elevation = 'default',
      borderColor = 'default',
      bgVariant = 'default',
      onCardClick,
      haptic = false,
      reduceMotion = false,
      glowColor = 'none',
      ...props
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = React.useState(false);

    // Elevation styles with glow support
    const elevationStyles = {
      flat: 'shadow-none',
      default: 'shadow-hard',
      raised: 'shadow-hard-lg',
      floating: 'shadow-hard-xl',
    };

    // Glow color CSS values
    const glowColors = {
      lime: 'rgba(191, 255, 0, 0.4)',
      pink: 'rgba(255, 20, 147, 0.4)',
      cyan: 'rgba(0, 255, 255, 0.4)',
      purple: 'rgba(139, 92, 246, 0.4)',
      none: 'transparent',
    };

    // Border color styles
    const borderStyles = {
      default: 'border-neo-black',
      primary: 'border-neo-lime',
      secondary: 'border-neo-pink',
      accent: 'border-neo-cyan',
      none: 'border-transparent',
    };

    // Background styles - added glassy variant
    const bgStyles = {
      default: 'bg-neo-white dark:bg-neo-navy',
      gradient: 'bg-gradient-to-br from-neo-white to-neo-cream dark:from-neo-navy dark:to-neo-navy-light',
      transparent: 'bg-transparent',
      glassy: 'bg-neo-cream/95 dark:bg-neo-navy/95 backdrop-blur-md',
    };

    // Handle click with haptic feedback
    const handleClick = React.useCallback(
      (e: React.MouseEvent) => {
        if (isDisabled || isLoading) return;
        
        if (haptic && typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
        onCardClick?.();
      },
      [isDisabled, isLoading, haptic, onCardClick]
    );

    // Animation variants with glow support
    const hoverShadow = glowColor !== 'none'
      ? `12px 12px 0px black, 0 0 25px ${glowColors[glowColor]}`
      : undefined;

    const cardVariants = {
      initial: { scale: 1, y: 0 },
      hover: isInteractive && !reduceMotion
        ? {
            y: -4,
            scale: 1.02,
            boxShadow: hoverShadow,
          }
        : {},
      tap: isInteractive && !reduceMotion
        ? { scale: 0.98, y: 0 }
        : {},
    };

        // Base className
    const baseClassName = cn(
      // Base styles
      'relative overflow-hidden rounded-neo-lg border-4',
      // Smooth transition for all properties (matches SuperDesign)
      'transition-all duration-400 ease-[cubic-bezier(0.23,1,0.32,1)]',
      elevationStyles[elevation],
      borderStyles[borderColor],
      bgStyles[bgVariant as keyof typeof bgStyles],
      // Interactive styles
      isInteractive && !isDisabled && 'cursor-pointer',
      isInteractive && isDisabled && 'cursor-not-allowed opacity-60',
      // Loading state
      isLoading && 'animate-pulse',
      className
    );

    // Interactive card with motion
    if (isInteractive) {
      // Extract only valid HTML div props for motion component
      const { onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, ...validProps } = props;
      
      return (
        <motion.div
          ref={ref}
          className={baseClassName}
          variants={cardVariants}
          initial="initial"
          whileHover={!isDisabled ? 'hover' : undefined}
          whileTap={!isDisabled ? 'tap' : undefined}
          transition={{
            type: 'tween',
            duration: 0.4,
            ease: [0.23, 1, 0.32, 1], // Smooth cubic-bezier from SuperDesign
          }}
          onClick={handleClick}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          role="button"
          tabIndex={0}
          aria-disabled={isDisabled || isLoading}
          aria-busy={isLoading}
          aria-pressed={isPressed}
          {...validProps}
        >
          {/* Loading skeleton overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-neo-cream/50 dark:bg-neo-navy/50 animate-pulse">
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          )}

          {/* Focus ring for accessibility */}
          <div className="absolute inset-0 rounded-neo-lg ring-4 ring-neo-cyan ring-offset-2 ring-offset-transparent opacity-0 focus-visible:opacity-100 transition-opacity pointer-events-none" />

          {/* Content */}
          <div className={cn('relative z-10', isLoading && 'opacity-0')}>
            {children}
          </div>
        </motion.div>
      );
    }

    // Non-interactive card
    return (
      <div
        ref={ref}
        className={baseClassName}
        aria-disabled={isDisabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {/* Loading skeleton overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-neo-cream/50 dark:bg-neo-navy/50 animate-pulse">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        )}

        {/* Content */}
        <div className={cn('relative z-10', isLoading && 'opacity-0')}>
          {children}
        </div>
      </div>
    );
  }
);

EnhancedCard.displayName = 'EnhancedCard';

/**
 * Card Header Component
 */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Align items */
  align?: 'start' | 'center' | 'between';
  /** Compact mode */
  compact?: boolean;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, align = 'start', compact = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-1.5',
        align === 'center' && 'items-center text-center',
        align === 'between' && 'flex-row items-center justify-between',
        !compact && 'p-6',
        compact && 'p-4',
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

/**
 * Card Title Component
 */
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', size = 'md', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        'font-black uppercase tracking-tight text-neo-black dark:text-neo-white',
        size === 'sm' && 'text-lg',
        size === 'md' && 'text-xl',
        size === 'lg' && 'text-2xl',
        size === 'xl' && 'text-3xl',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

/**
 * Card Description Component
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-sm font-medium text-neo-black/70 dark:text-neo-white/70 leading-relaxed',
      className
    )}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

/**
 * Card Content Component
 */
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, compact = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        !compact && 'p-6 pt-0',
        compact && 'p-4 pt-0',
        className
      )}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

/**
 * Card Footer Component
 */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end' | 'between';
  compact?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, align = 'start', compact = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-2',
        !compact && 'p-6 pt-0',
        compact && 'p-4 pt-0',
        align === 'start' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'end' && 'justify-end',
        align === 'between' && 'justify-between',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

/**
 * Card Badge Component - For status indicators on cards
 */
interface CardBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const CardBadge: React.FC<CardBadgeProps> = ({
  children,
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: 'bg-neo-lime text-neo-black',
    success: 'bg-neo-lime text-neo-black',
    warning: 'bg-neo-yellow text-neo-black',
    error: 'bg-neo-red text-neo-black',
    info: 'bg-neo-cyan text-neo-black',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-neo text-xs font-black uppercase tracking-wide border-2 border-neo-black shadow-hard-xs',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export {
  EnhancedCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardBadge,
};
