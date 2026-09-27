'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Unified close/dismiss button for modals, drawers, banners, and inline components.
 *
 * Variants:
 * - `default`  — Red neo-brutalist (modals on light bg)
 * - `dark`     — Subtle glass on dark backgrounds (auth modal, blast codex, etc.)
 * - `ghost`    — Minimal hover-only (banners, inline dismissals)
 * - `minimal`  — Black square (SuperDesign style)
 */

type CloseButtonVariant = 'default' | 'dark' | 'ghost' | 'minimal';
type CloseButtonSize = 'sm' | 'md' | 'lg';

interface CloseButtonProps {
  onClick: () => void;
  variant?: CloseButtonVariant;
  size?: CloseButtonSize;
  label?: string;
  className?: string;
  'data-testid'?: string;
}

const sizeStyles: Record<CloseButtonSize, { button: string; icon: string }> = {
  sm: {
    button: 'w-8 h-8 min-w-[32px] min-h-[32px]',
    icon: 'w-4 h-4',
  },
  md: {
    button: 'w-11 h-11 min-w-[44px] min-h-[44px]',
    icon: 'w-5 h-5',
  },
  lg: {
    button: 'w-12 h-12 min-w-[48px] min-h-[48px]',
    icon: 'w-5 h-5 sm:w-6 sm:h-6',
  },
};

const variantStyles: Record<CloseButtonVariant, string> = {
  default: [
    'bg-neo-red text-neo-black',
    'border-2 sm:border-3 border-neo-black rounded-neo',
    'shadow-hard-sm',
    'hover:-translate-x-px hover:-translate-y-px hover:shadow-hard',
    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  ].join(' '),
  dark: [
    'rounded-neo border-2 border-slate-600',
    'text-gray-400 hover:text-white',
    'hover:border-white hover:bg-white/10',
  ].join(' '),
  ghost: [
    'rounded-full',
    'text-white hover:text-white',
    'hover:bg-white/10',
  ].join(' '),
  minimal: [
    'bg-neo-black text-neo-white',
    'border-0 rounded-none',
    'hover:bg-neo-black/80 active:bg-neo-black',
  ].join(' '),
};

const CloseButton: React.FC<CloseButtonProps> = ({
  onClick,
  variant = 'default',
  size = 'md',
  label = 'Close',
  className,
  'data-testid': testId,
}) => {
  const s = sizeStyles[size];

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'flex items-center justify-center transition-all duration-100',
        'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2',
        s.button,
        variantStyles[variant],
        className,
      )}
      aria-label={label}
    >
      <X className={cn(s.icon, 'stroke-3')} aria-hidden="true" />
    </button>
  );
};

export { CloseButton };
export type { CloseButtonProps, CloseButtonVariant, CloseButtonSize };
