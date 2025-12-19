import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "../../lib/utils";

// Neo-Brutalist Checkbox: Thick borders, hard shadow, bold check
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Size and shape
      "peer h-6 w-6 shrink-0",
      // Neo-Brutalist styling
      "rounded-neo border-3 border-neo-black",
      "bg-neo-cream",
      "shadow-hard-sm",
      // States
      "ring-offset-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Checked state - yellow background
      "data-[state=checked]:bg-neo-yellow data-[state=checked]:text-neo-black",
      // Hover effect
      "transition-all duration-100",
      "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard",
      "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4 stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
