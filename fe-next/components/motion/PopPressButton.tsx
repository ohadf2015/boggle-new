'use client';

/**
 * PopPressButton — Neo-brutalist button with scale + shadow shift micro-interaction
 *
 * A primary button with on-press scale and shadow animation for tactile feedback.
 * Uses AdaptiveMotion to respect reduced-motion and low-end devices.
 *
 * No entrance opacity tween (only on interaction) to avoid mobile web flash.
 * Implements neo-brutalist style: hard pixel shadows, solid borders, electric colors.
 *
 * @example
 * ```tsx
 * <PopPressButton variant="primary" size="md" onClick={handleStart}>
 *   Start Game
 * </PopPressButton>
 * ```
 */

import React, { forwardRef } from 'react';
import { AdaptiveMotion } from './AdaptiveMotion';

interface PopPressButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button size (default 'md') */
  size?: 'sm' | 'md' | 'lg';
  /** Button variant (default 'primary') */
  variant?: 'primary' | 'secondary';
  /** Children to render inside button */
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

const variantClasses = {
  primary: 'bg-neo-lime border-2 border-black text-neo-navy hover:bg-yellow-300',
  secondary: 'bg-neo-navy border-2 border-neo-lime text-neo-lime hover:bg-slate-900',
};

export const PopPressButton = forwardRef<HTMLButtonElement, PopPressButtonProps>(
  (
    {
      size = 'md',
      variant = 'primary',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <AdaptiveMotion.div
        className="inline-block"
        whileTap={{
          scale: 0.95,
        }}
        whileHover={{
          boxShadow: '0px 6px 0px black, inset 0px 2px 0px rgba(0,0,0,0.2)',
        }}
      >
        <button
          ref={ref}
          className={`
            font-bold rounded-none
            transition-shadow duration-75
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${className}
          `}
          style={{
            boxShadow: '0px 4px 0px black',
            WebkitTapHighlightColor: 'transparent',
          }}
          {...props}
        >
          {children}
        </button>
      </AdaptiveMotion.div>
    );
  }
);

PopPressButton.displayName = 'PopPressButton';

export default PopPressButton;
