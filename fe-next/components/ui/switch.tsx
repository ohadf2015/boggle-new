"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-neo-black transition-all duration-200",
      "shadow-[2px_2px_0_0_#000] rtl:shadow-[-2px_2px_0_0_#000]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-neo-purple data-[state=checked]:shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.2)]",
      "data-[state=unchecked]:bg-neo-cream",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white border-2 border-neo-black shadow-[1px_1px_0_0_#000] ring-0 transition-transform duration-200",
        "data-[state=checked]:translate-x-[22px] data-[state=checked]:rtl:-translate-x-[22px]",
        "data-[state=unchecked]:translate-x-[2px] data-[state=unchecked]:rtl:-translate-x-[2px]",
        "data-[state=checked]:bg-neo-cream"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
