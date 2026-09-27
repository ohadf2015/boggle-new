"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  // Wrapper provides 48px minimum touch target (WCAG 2.5.5) while keeping visual size compact
  <span className="inline-flex items-center min-h-[48px] min-w-[48px] justify-center">
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-neo-black transition-all duration-200",
        "shadow-hard-sm",
        "focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-70",
        "data-[state=checked]:bg-neo-purple data-[state=checked]:shadow-hard-pressed",
        "data-[state=unchecked]:bg-neo-cream",
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white border-2 border-neo-black shadow-hard-sm ring-0 transition-transform duration-200",
          "data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5",
          "data-[state=unchecked]:translate-x-0 rtl:data-[state=unchecked]:translate-x-0",
          "data-[state=checked]:bg-neo-cream"
        )}
      />
    </SwitchPrimitives.Root>
  </span>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
