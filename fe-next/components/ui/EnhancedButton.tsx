'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

/**
 * Enhanced Button - Neo-Brutalist button with improved UX
 * 
 * Improvements over standard button:
 * - Larger minimum touch target (48px)
 * - Better focus indicators for accessibility
 * - Haptic feedback support (where available)
 * - Loading state with animation
 * - Success/error state animations
 */

const buttonVariants = cva(
  [
    // Base styles: Neo-Brutalist foundation
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'text-sm font-semibold tracking-wide',
    'border-2 border-neo-black rounded-neo',
    'shadow-hard',
    'transition-all duration-100',
    // Enhanced touch target - minimum 48px
    'min-h-[48px] min-w-[48px]',
    // Press effect: subtle translate to close shadow gap
    'hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] hover:shadow-hard-lg',
    'active:translate-x-px active:translate-y-px active:shadow-hard-pressed',
    // Enhanced focus styling with visible ring
    'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-white dark:focus-visible:ring-offset-neo-navy',
    // Disabled state
    'disabled:pointer-events-none disabled:opacity-70 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0',
    // SVG icons - responsive sizes
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    '[&_svg]:w-5 [&_svg]:h-5',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary: player-accent themed (lime by default) - main CTA
        default: 'bg-accent text-accent-foreground hover:brightness-110',
        // Destructive: Red for danger actions
        destructive: 'bg-neo-red text-neo-black hover:brightness-110',
        // Outline: Transparent with border
        outline: [
          'bg-neo-cream text-neo-black',
          'hover:bg-neo-white',
        ].join(' '),
        // Secondary: Pink accent
        secondary: 'bg-neo-pink text-neo-black hover:brightness-110',
        // Ghost: Minimal, with high-contrast visible border for accessibility
        ghost: [
          'bg-transparent text-neo-black dark:text-neo-white border-3 border-neo-black dark:border-neo-cream shadow-none',
          'hover:bg-neo-navy-light/50 hover:border-neo-cyan hover:shadow-hard-sm',
          'hover:translate-x-0 hover:translate-y-0',
          'active:translate-x-0 active:translate-y-0 active:shadow-none',
        ].join(' '),
        // Link: Text only with always-visible underline for accessibility
        link: [
          'bg-transparent text-neo-black dark:text-neo-cyan border-0 shadow-none min-h-auto min-w-auto',
          'underline underline-offset-4 decoration-2 decoration-neo-cyan',
          'hover:brightness-110 hover:translate-x-0 hover:translate-y-0 hover:shadow-none',
          'active:translate-x-0 active:translate-y-0',
        ].join(' '),
        // Success variant (green)
        success: 'bg-neo-lime text-neo-black hover:brightness-110',
        // Accent variant (pink)
        accent: 'bg-neo-pink text-neo-black hover:brightness-110',
        // Cyan variant
        cyan: 'bg-neo-cyan text-neo-black hover:brightness-110',
        // Gradient variant for special CTAs
        gradient: [
          'bg-linear-to-r from-neo-pink via-neo-orange to-neo-yellow',
          'text-neo-black hover:brightness-110',
        ].join(' '),
      },
      size: {
        // Consistent sizing with proper touch targets (48px minimum)
        default: 'h-12 px-5 py-3 [&_svg]:w-5 [&_svg]:h-5',
        sm: 'h-11 px-4 py-2 text-xs [&_svg]:w-4 [&_svg]:h-4',
        lg: 'h-14 px-8 py-4 text-base [&_svg]:w-6 [&_svg]:h-6',
        xl: 'h-16 px-10 py-5 text-lg [&_svg]:w-7 [&_svg]:h-7',
        '2xl': 'h-18 px-12 py-6 text-xl [&_svg]:w-8 [&_svg]:h-8',
        icon: 'h-12 w-12 p-0 [&_svg]:w-5 [&_svg]:h-5',
        'icon-lg': 'h-14 w-14 p-0 [&_svg]:w-6 [&_svg]:h-6',
        'icon-xl': 'h-16 w-16 p-0 [&_svg]:w-7 [&_svg]:h-7',
      },
      state: {
        default: '',
        loading: 'cursor-wait',
        success: '',
        error: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
    },
  }
);

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Show success state */
  isSuccess?: boolean;
  /** Show error state */
  isError?: boolean;
  /** Left icon element */
  leftIcon?: React.ReactNode;
  /** Right icon element */
  rightIcon?: React.ReactNode;
  /** Enable haptic feedback on tap (mobile) */
  haptic?: boolean;
  /** Animation variant — 'jelly' is the default for a satisfying squish feel */
  animation?: 'none' | 'jelly' | 'pop' | 'wobble' | 'shake';
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  (
    {
      className,
      variant,
      size,
      state,
      asChild = false,
      isLoading = false,
      isSuccess = false,
      isError = false,
      leftIcon,
      rightIcon,
      haptic = false,
      animation = 'jelly',
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const [isPressed, setIsPressed] = React.useState(false);

    // Haptic feedback handler
    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (haptic && typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
        onClick?.(e);
      },
      [haptic, onClick]
    );

    // Get animation props based on variant
    const getAnimationProps = () => {
      switch (animation) {
        case 'jelly':
          // Jelly squish: scaleX widens, scaleY compresses — satisfying elastic feel
          // Spring config inspired by animate-ai wobble-jelly (stiffness 200, damping 8)
          return {
            whileTap: { scaleX: 1.04, scaleY: 0.94 },
          };
        case 'pop':
          return {
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.95 },
          };
        case 'wobble':
          return {
            whileHover: { rotate: [0, -2, 2, 0] },
            whileTap: { scale: 0.95 },
          };
        case 'shake':
          return {
            animate: isError ? { x: [-4, 4, -4, 4, 0] } : {},
            whileTap: { scale: 0.95 },
          };
        default:
          return {};
      }
    };

    // Get state-based styling
    const getStateStyles = () => {
      if (isSuccess) {
        return 'bg-neo-lime ring-4 ring-neo-lime/50';
      }
      if (isError) {
        return 'bg-neo-red ring-4 ring-neo-red/50';
      }
      if (isLoading) {
        return 'cursor-wait opacity-80';
      }
      return '';
    };

    return (
      <AdaptiveMotion.div
        {...getAnimationProps()}
        transition={animation === 'jelly'
          ? { type: 'spring', stiffness: 300, damping: 10 }
          : { type: 'spring', stiffness: 400, damping: 17 }
        }
      >
        <Comp
          className={cn(
            buttonVariants({ variant, size, state: isLoading ? 'loading' : state }),
            getStateStyles(),
            className
          )}
          ref={ref}
          onClick={handleClick}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onTouchEnd={() => setIsPressed(false)}
          disabled={isLoading || props.disabled}
          aria-busy={isLoading}
          aria-pressed={isPressed}
          {...props}
        >
          {/* Loading spinner */}
          {isLoading && (
            <svg
              className="animate-spin -ms-1 me-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}

          {/* Success icon */}
          {isSuccess && (
            <svg
              className="w-5 h-5 me-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}

          {/* Error icon */}
          {isError && (
            <svg
              className="w-5 h-5 me-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}

          {/* Left icon */}
          {!isLoading && !isSuccess && !isError && leftIcon}

          {/* Content */}
          <span className={cn(isLoading && 'opacity-70')}>{children}</span>

          {/* Right icon */}
          {!isLoading && !isSuccess && !isError && rightIcon}
        </Comp>
      </AdaptiveMotion.div>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';

export { EnhancedButton, buttonVariants };
