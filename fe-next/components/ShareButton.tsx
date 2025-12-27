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
}) => {
  // Neo-brutalist styling - hard shadows, no glow effects
  const variantStyles: Record<ShareButtonVariant, VariantStyle> = {
    primary: {
      base: 'bg-neo-yellow text-neo-black border-neo-black',
      hover: 'hover:shadow-hard-md hover:-translate-y-0.5 active:shadow-hard-sm active:translate-y-0',
    },
    whatsapp: {
      base: 'bg-[#25D366] text-black border-neo-black',
      hover: 'hover:shadow-hard-md hover:-translate-y-0.5 hover:bg-[#1ebe5d] active:shadow-hard-sm active:translate-y-0',
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

  const button = (
    <button
      onClick={onClick}
      className={cn(
        // Base styles - neo-brutalist
        'inline-flex items-center justify-center font-bold rounded-neo',
        'border-2 shadow-hard-sm transition-all duration-150',
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
      {icon && <span className="flex-shrink-0">{icon}</span>}
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
