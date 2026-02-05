/**
 * TactileButton Component
 *
 * Enhanced button with "squishy" tactile feedback:
 * - Elastic press animations
 * - Glow effects on hover
 * - Ripple feedback on click
 * - Multiple visual variants
 */

'use client';

import React, { useState, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface TactileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  /**
   * Enable ripple effect on click
   */
  ripple?: boolean;
  /**
   * Enable glow effect on hover
   */
  glow?: boolean;
  /**
   * Type attribute for form buttons
   */
  type?: 'button' | 'submit' | 'reset';
  'data-testid'?: string;
}

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

const variantStyles: Record<ButtonVariant, { bg: string; hoverBg: string; text: string; border: string; shadow: string; glowColor: string }> = {
  primary: {
    bg: 'bg-neo-yellow',
    hoverBg: 'hover:bg-yellow-300',
    text: 'text-neo-black',
    border: 'border-neo-black',
    shadow: '#1a1a2e',
    glowColor: 'rgba(255, 225, 53, 0.6)',
  },
  secondary: {
    bg: 'bg-neo-navy',
    hoverBg: 'hover:bg-neo-navy/90',
    text: 'text-neo-white',
    border: 'border-neo-white/20',
    shadow: '#1a1a2e',
    glowColor: 'rgba(0, 255, 255, 0.4)',
  },
  accent: {
    bg: 'bg-neo-cyan',
    hoverBg: 'hover:bg-cyan-300',
    text: 'text-neo-black',
    border: 'border-neo-black',
    shadow: '#1a1a2e',
    glowColor: 'rgba(0, 255, 255, 0.6)',
  },
  ghost: {
    bg: 'bg-transparent',
    hoverBg: 'hover:bg-neo-white/10',
    text: 'text-neo-white',
    border: 'border-neo-white/30',
    shadow: 'transparent',
    glowColor: 'rgba(255, 255, 255, 0.3)',
  },
  danger: {
    bg: 'bg-neo-red',
    hoverBg: 'hover:bg-red-500',
    text: 'text-neo-white',
    border: 'border-neo-black',
    shadow: '#1a1a2e',
    glowColor: 'rgba(239, 68, 68, 0.6)',
  },
};

const sizeStyles: Record<ButtonSize, { height: string; padding: string; fontSize: string; iconSize: string }> = {
  sm: {
    height: 'h-9',
    padding: 'px-3',
    fontSize: 'text-sm',
    iconSize: 'w-4 h-4',
  },
  md: {
    height: 'h-12',
    padding: 'px-5',
    fontSize: 'text-base',
    iconSize: 'w-5 h-5',
  },
  lg: {
    height: 'h-14',
    padding: 'px-7',
    fontSize: 'text-lg',
    iconSize: 'w-6 h-6',
  },
  xl: {
    height: 'h-16',
    padding: 'px-10',
    fontSize: 'text-xl',
    iconSize: 'w-7 h-7',
  },
};

export const TactileButton = memo(function TactileButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  ripple = true,
  glow = true,
  type = 'button',
  'data-testid': dataTestId,
}: TactileButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  const vStyles = variantStyles[variant];
  const sStyles = sizeStyles[size];

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
  };
  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);

  const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!ripple || !enableComplexAnimations || prefersReducedMotion) return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple: RippleItem = {
      id: Date.now(),
      x,
      y,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  }, [ripple, enableComplexAnimations, prefersReducedMotion]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(event);
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  const shouldReduceMotion = !enableComplexAnimations || prefersReducedMotion;

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      data-testid={dataTestId}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      disabled={disabled || loading}
      className={cn(
        // Base styles
        'relative overflow-hidden rounded-neo font-black uppercase tracking-wide',
        'border-3 transition-colors duration-200',
        'flex items-center justify-center gap-2',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2',
        // Variant styles
        vStyles.bg,
        vStyles.hoverBg,
        vStyles.text,
        vStyles.border,
        // Size styles
        sStyles.height,
        sStyles.padding,
        sStyles.fontSize,
        // Width
        fullWidth && 'w-full',
        // Disabled state
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        boxShadow: isPressed
          ? `2px 2px 0 ${vStyles.shadow}`
          : isHovered && glow
          ? `6px 6px 0 ${vStyles.shadow}, 0 0 20px ${vStyles.glowColor}`
          : `4px 4px 0 ${vStyles.shadow}`,
        transform: isPressed ? 'translate(2px, 2px)' : 'translate(0, 0)',
      }}
      whileHover={!shouldReduceMotion && !disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!shouldReduceMotion && !disabled && !loading ? { scale: 0.98 } : {}}
      transition={{
        type: 'spring',
        stiffness: shouldReduceMotion ? 1000 : 400,
        damping: shouldReduceMotion ? 100 : 25,
      }}
    >
      {/* Ripple effects */}
      {ripple && enableComplexAnimations && !prefersReducedMotion && (
        <AnimatePresence>
          {ripples.map((rippleItem) => (
            <motion.span
              key={rippleItem.id}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute rounded-full bg-white/30 pointer-events-none"
              style={{
                left: rippleItem.x,
                top: rippleItem.y,
                width: 20,
                height: 20,
                marginLeft: -10,
                marginTop: -10,
              }}
            />
          ))}
        </AnimatePresence>
      )}

      {/* Inner glow on hover */}
      {glow && isHovered && !disabled && !loading && (
        <div
          className="absolute inset-0 pointer-events-none rounded-neo"
          style={{
            background: `radial-gradient(ellipse at center, ${vStyles.glowColor} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Loading spinner */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-inherit rounded-neo"
        >
          <svg
            className={cn('animate-spin', sStyles.iconSize)}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </motion.div>
      )}

      {/* Content */}
      <span
        className={cn(
          'relative z-10 flex items-center gap-2',
          loading && 'opacity-0'
        )}
      >
        {icon && iconPosition === 'left' && (
          <span className={sStyles.iconSize}>{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className={sStyles.iconSize}>{icon}</span>
        )}
      </span>
    </motion.button>
  );
});

export default TactileButton;
