import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

// Neo-Brutalist Progress: Thick borders, hard shadows, chunky feel
const progressVariants = cva(
  // Base styles
  [
    "relative w-full overflow-hidden",
    "rounded-neo-pill border-3 border-neo-black",
    "shadow-hard-sm",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-3",
        default: "h-5",
        lg: "h-7",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const indicatorVariants = cva(
  // Base indicator styles
  [
    "h-full transition-all duration-300 ease-out",
    "border-r-2 border-neo-black",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-neo-yellow",
        success: "bg-neo-lime",
        warning: "bg-neo-orange",
        danger: "bg-neo-red",
        accent: "bg-neo-pink",
        cyan: "bg-neo-cyan",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Progress = React.forwardRef(({ className, value, size, variant, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      progressVariants({ size }),
      "bg-neo-cream",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(indicatorVariants({ variant }))}
      style={{ width: `${value || 0}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, progressVariants, indicatorVariants };
