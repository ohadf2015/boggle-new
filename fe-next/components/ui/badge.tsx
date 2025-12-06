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
    "shadow-hard-sm",
    "transition-all duration-100",
    "focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary: Yellow
        default: "bg-neo-yellow text-neo-black",
        // Secondary: Orange
        secondary: "bg-neo-orange text-neo-black",
        // Destructive: Red
        destructive: "bg-neo-red text-neo-white",
        // Outline: Cream/transparent
        outline: "bg-neo-cream text-neo-black",
        // Success: Lime green
        success: "bg-neo-lime text-neo-black",
        // Accent: Pink
        accent: "bg-neo-pink text-neo-white",
        // Cyan: For special highlights
        cyan: "bg-neo-cyan text-neo-black",
        // Purple: For rare/special
        purple: "bg-neo-purple text-neo-white",
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
