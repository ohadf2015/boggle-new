'use client';

import React from 'react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '../lib/utils';

/**
 * Share button variant types
 */
type ShareButtonVariant = 'link' | 'whatsapp' | 'qr';

/**
 * Variant style configuration
 */
interface VariantStyle {
  base: string;
  hover: string;
}

/**
 * ShareButton Props
 *
 * Reusable Share Button Component
 * Used in JoinView (Create Game) and HostView (Game Code section)
 */
interface ShareButtonProps {
  variant?: ShareButtonVariant;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tooltip?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  variant = 'link',
  onClick,
  icon,
  children,
  className,
  tooltip
}) => {
  const variantStyles: Record<ShareButtonVariant, VariantStyle> = {
    link: {
      base: 'text-cyan-300 border-cyan-500/40',
      hover: 'hover:border-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:text-white',
    },
    whatsapp: {
      base: 'text-green-300 border-green-500/40',
      hover: 'hover:border-green-400 hover:bg-green-500/10 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] hover:text-white',
    },
    qr: {
      base: 'text-purple-300 border-purple-500/40',
      hover: 'hover:border-purple-400 hover:bg-purple-500/10 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:text-white',
    },
  };

  const selectedVariant = variantStyles[variant] || variantStyles.link;

  const button = (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        'bg-slate-700/50 font-medium backdrop-blur-sm transition-all duration-300',
        selectedVariant.base,
        selectedVariant.hover,
        className
      )}
    >
      {icon && <span className="sm:mr-1.5">{icon}</span>}
      {children}
    </Button>
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
