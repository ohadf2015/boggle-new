import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "../../lib/utils";

// Neo-Brutalist Checkbox: Traditional checkbox with clear checked state
// Wrapper provides 48px minimum touch target (WCAG 2.5.5)
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <span className="inline-flex items-center justify-center min-h-[44px] min-w-[44px]">
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        // Size - larger for better visibility and touch
        "peer h-6 w-6 shrink-0",
        // Traditional checkbox shape - more rounded
        "rounded-md border-2",
        // Unchecked: white/light background with visible border
        "bg-white border-slate-400",
        // States
        "ring-offset-background",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-70",
        // Checked state - bright green background, clear "on" state
        "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-600",
        // Hover
        "transition-colors duration-100",
        "hover:border-slate-500 data-[state=checked]:hover:bg-emerald-400",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center")}
      >
        <Check className="h-4 w-4 stroke-3 text-white" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  </span>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
