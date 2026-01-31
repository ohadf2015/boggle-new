import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

// Neo-Brutalist Badge: Thick borders, hard shadows, bold colors
const badgeVariants = cva(
  // Base styles
  [
    "inline-flex items-center justify-center",
    "rounded-neo-pill border-2 border-neo-black",
    "px-3 py-1 text-xs font-black uppercase tracking-wide",
    "transition-all duration-100",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary: Yellow - interactive affordance
        default: "bg-neo-lime text-neo-black shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
        // Secondary: Pink - interactive
        secondary: "bg-neo-pink text-neo-black shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
        // Destructive: Red (4.8:1 contrast with cream)
        destructive: "bg-neo-red text-neo-cream shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
        // Outline: Cream/transparent - interactive
        outline: "bg-neo-cream text-neo-black shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
        // Success: Lime green - interactive
        success: "bg-neo-lime text-neo-black shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
        // Accent: Pink (5.8:1 contrast with black) - interactive
        accent: "bg-neo-pink text-neo-black shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
        // Cyan: For special highlights - interactive
        cyan: "bg-neo-cyan text-neo-black shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
        // Purple: For rare/special (7.2:1 contrast with cream) - interactive
        purple: "bg-neo-purple text-neo-cream shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
        // DISPLAY-ONLY variants: No shadow, muted border, no focus ring
        // Use these for static info displays that aren't clickable
        "display-default": "bg-neo-lime/80 text-neo-black border-neo-black/50 shadow-none cursor-default",
        "display-secondary": "bg-neo-pink/80 text-neo-black border-neo-black/50 shadow-none cursor-default",
        "display-success": "bg-neo-lime/80 text-neo-black border-neo-black/50 shadow-none cursor-default",
        "display-accent": "bg-neo-pink/80 text-neo-black border-neo-black/50 shadow-none cursor-default",
        "display-cyan": "bg-neo-cyan/80 text-neo-black border-neo-black/50 shadow-none cursor-default",
        "display-purple": "bg-neo-purple/80 text-neo-cream border-neo-black/50 shadow-none cursor-default",
        "display-muted": "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-400/50 shadow-none cursor-default",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
