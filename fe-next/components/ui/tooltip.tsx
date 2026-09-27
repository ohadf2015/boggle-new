import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "../../lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipPortal = TooltipPrimitive.Portal;

// Neo-Brutalist Tooltip Arrow
const TooltipArrow = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    className={cn(
      "fill-neo-black",
      className
    )}
    width={20}
    height={10}
    {...props}
  />
));
TooltipArrow.displayName = "TooltipArrow";

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  /** Show arrow pointer (SuperDesign style) */
  showArrow?: boolean;
}

// Neo-Brutalist Tooltip: Thick borders, hard shadow, cream background
// Uses explicit Portal to render outside transformed containers
// Uses collision detection to prevent rendering outside viewport
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 6, collisionPadding = 16, showArrow = true, children, ...props }, ref) => (
  <TooltipPortal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={showArrow ? sideOffset + 4 : sideOffset}
      collisionPadding={collisionPadding}
      avoidCollisions={true}
      className={cn(
        "z-[100] overflow-visible",
        // Neo-Brutalist styling
        "bg-neo-cream text-neo-black",
        "border-3 border-neo-black",
        "rounded-neo",
        "shadow-hard-sm",
        // Typography
        "px-3 py-2 text-sm font-bold",
        // Constrain max width — wider on desktop to avoid unnecessary wrapping
        "max-w-[min(300px,calc(100vw-32px))] lg:max-w-[min(420px,calc(100vw-32px))]",
        // Animations
        "animate-in fade-in-0 zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "data-[side=bottom]:slide-in-from-top-2",
        "data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2",
        "data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      {children}
      {showArrow && <TooltipArrow />}
    </TooltipPrimitive.Content>
  </TooltipPortal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipArrow };
