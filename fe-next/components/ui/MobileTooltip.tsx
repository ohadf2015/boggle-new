'use client';

import React, { useState, useRef, useCallback, ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { cn } from '@/lib/utils';

interface MobileTooltipProps {
  children: ReactNode;
  content: ReactNode;
  /** Side of the trigger to show tooltip on. Default: 'top' */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Offset from the trigger element. Default: 8 */
  sideOffset?: number;
  /** Additional class names for the tooltip content */
  contentClassName?: string;
  /** Whether to disable the tooltip entirely. Default: false */
  disabled?: boolean;
  /** Delay before showing tooltip on hover (desktop). Default: 0 */
  delayDuration?: number;
}

/**
 * MobileTooltip - A mobile-friendly tooltip wrapper
 *
 * Handles touch devices properly by:
 * - Detecting touch devices via onTouchStart
 * - Using click to toggle open/close on touch devices
 * - Using hover on non-touch devices (standard Radix behavior)
 * - Closing on outside click/touch via onPointerDownOutside
 *
 * Usage:
 * ```tsx
 * <MobileTooltip content="Tooltip text here">
 *   <button>Hover/tap me</button>
 * </MobileTooltip>
 * ```
 */
export function MobileTooltip({
  children,
  content,
  side = 'top',
  sideOffset = 8,
  contentClassName,
  disabled = false,
  delayDuration = 0,
}: MobileTooltipProps) {
  const [open, setOpen] = useState(false);
  const isTouchDevice = useRef(false);

  const handleTouchStart = useCallback(() => {
    isTouchDevice.current = true;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only handle click for touch devices
    // Desktop users get hover behavior
    if (isTouchDevice.current) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(prev => !prev);
    }
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    // On touch devices, ignore Radix's automatic open/close from hover simulation
    // We rely solely on the click handler to control the state
    if (isTouchDevice.current) {
      return;
    }
    setOpen(newOpen);
  }, []);

  const handlePointerDownOutside = useCallback(() => {
    setOpen(false);
  }, []);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger
          asChild
          onClick={handleClick}
          onTouchStart={handleTouchStart}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={sideOffset}
          className={cn(contentClassName)}
          onPointerDownOutside={handlePointerDownOutside}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default MobileTooltip;
