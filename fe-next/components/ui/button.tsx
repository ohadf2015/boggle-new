import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

// Neo-Brutalist Button Variants
// Features: Thick borders, hard shadows, physical press effect, uppercase text
const buttonVariants = cva(
  // Base styles: Neo-Brutalist foundation
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-bold uppercase tracking-wide",
    "border-3 border-neo-black rounded-neo",
    "shadow-hard",
    "transition-all duration-100",
    // Press effect: translate to close shadow gap
    "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg",
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed",
    // Focus styling
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50 disabled:translate-x-0 disabled:translate-y-0",
    // SVG icons
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary: Electric Yellow - main CTA
        default: "bg-neo-yellow text-neo-black hover:bg-neo-yellow-hover",
        // Destructive: Red for danger actions
        destructive: "bg-neo-red text-neo-white hover:brightness-110",
        // Outline: Transparent with border
        outline: [
          "bg-neo-cream text-neo-black",
          "hover:bg-neo-white",
        ].join(" "),
        // Secondary: Orange accent
        secondary: "bg-neo-orange text-neo-black hover:bg-neo-orange-hover",
        // Ghost: Minimal, no shadow
        ghost: [
          "bg-transparent text-neo-white border-2 border-transparent shadow-none",
          "hover:bg-neo-navy-light hover:border-neo-black hover:shadow-hard-sm",
          "hover:translate-x-0 hover:translate-y-0",
          "active:translate-x-0 active:translate-y-0 active:shadow-none",
        ].join(" "),
        // Link: Text only
        link: [
          "bg-transparent text-neo-cyan border-0 shadow-none underline-offset-4",
          "hover:underline hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
          "active:translate-x-0 active:translate-y-0",
        ].join(" "),
        // NEW: Success variant (green)
        success: "bg-neo-lime text-neo-black hover:brightness-110",
        // NEW: Accent variant (pink)
        accent: "bg-neo-pink text-neo-white hover:brightness-110",
        // NEW: Cyan variant
        cyan: "bg-neo-cyan text-neo-black hover:brightness-110",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
