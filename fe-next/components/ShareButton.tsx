'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '../lib/utils';

/**
 * Share button variant types - now uses neo-brutalist styling
 */
type ShareButtonVariant = 'primary' | 'whatsapp' | 'secondary';

/**
 * Variant style configuration - neo-brutalist with hard shadows
 */
interface VariantStyle {
  base: string;
  hover: string;
}

/**
 * ShareButton Props
 *
 * Reusable Share Button Component with Neo-Brutalist styling
 * Used across the app for consistent share actions
 */
interface ShareButtonProps {
  variant?: ShareButtonVariant;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tooltip?: string;
  /** Full width button */
  fullWidth?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label for screen readers (defaults to tooltip or children text) */
  'aria-label'?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  variant = 'primary',
  onClick,
  icon,
  children,
  className,
  tooltip,
  fullWidth = false,
  size = 'md',
  'aria-label': ariaLabel,
}) => {
  // Neo-brutalist styling - hard shadows, no glow effects
  const variantStyles: Record<ShareButtonVariant, VariantStyle> = {
    primary: {
      base: 'bg-accent text-accent-foreground border-neo-black',
      hover: 'hover:shadow-hard-md hover:-translate-y-0.5 hover:brightness-110 active:shadow-hard-sm active:translate-y-0',
    },
    whatsapp: {
      base: 'bg-brand-whatsapp text-black border-neo-black',
      hover: 'hover:shadow-hard-md hover:-translate-y-0.5 hover:bg-brand-whatsapp-hover active:shadow-hard-sm active:translate-y-0',
    },
    secondary: {
      base: 'bg-neo-cyan text-neo-black border-neo-black',
      hover: 'hover:shadow-hard-md hover:-translate-y-0.5 active:shadow-hard-sm active:translate-y-0',
    },
  };

  // WCAG 2.1 AA: Minimum touch target 44x44px
  const sizeStyles = {
    sm: 'px-3 py-2 text-xs gap-1 min-h-[44px]',
    md: 'px-4 py-2.5 text-sm gap-1.5 min-h-[48px]',
    lg: 'px-5 py-3 text-base gap-2 min-h-[52px]',
  };

  const selectedVariant = variantStyles[variant] || variantStyles.primary;

  // Derive accessible label from props
  const accessibleLabel = ariaLabel || tooltip || (typeof children === 'string' ? children : undefined);

  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={accessibleLabel}
      className={cn(
        // Base styles - neo-brutalist
        'inline-flex items-center justify-center font-bold rounded-neo',
        'border-2 shadow-hard-sm transition-all duration-150',
        // Focus styles for accessibility
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
        // Size
        sizeStyles[size],
        // Width
        fullWidth && 'w-full',
        // Variant colors
        selectedVariant.base,
        selectedVariant.hover,
        className
      )}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="md:hidden">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

export default ShareButton;
