import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { AdaptiveMotion } from "../motion/AdaptiveMotion";

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
    "hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg",
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed",
    // Focus styling
    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-white dark:focus-visible:ring-offset-neo-navy",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-70 disabled:translate-x-0 disabled:translate-y-0",
    // SVG icons - responsive sizes
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg]:w-5 [&_svg]:h-5",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary: player-accent themed (lime by default) - main CTA
        default: "bg-accent text-accent-foreground hover:brightness-110",
        // Destructive: Red for danger actions
        destructive: "bg-neo-red text-neo-black hover:brightness-110",
        // Outline: Transparent with border
        outline: [
          "bg-neo-cream text-neo-black",
          "hover:bg-neo-white",
        ].join(" "),
        // Secondary: Pink accent
        secondary: "bg-neo-pink text-neo-black hover:brightness-110",
        // Ghost: Minimal, with high-contrast visible border for accessibility (WCAG AA 3:1 for UI components)
        ghost: [
          "bg-transparent text-neo-black dark:text-neo-white border-3 border-neo-black dark:border-neo-cream shadow-none",
          "hover:bg-neo-navy-light/50 hover:border-neo-cyan hover:shadow-hard-sm",
          "hover:translate-x-0 hover:translate-y-0",
          "active:translate-x-0 active:translate-y-0 active:shadow-none",
        ].join(" "),
        // Link: Text only with always-visible underline for accessibility
        link: [
          "bg-transparent text-neo-black dark:text-neo-cyan border-0 shadow-none",
          "underline underline-offset-4 decoration-2 decoration-neo-cyan",
          "hover:brightness-110 hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
          "active:translate-x-0 active:translate-y-0",
        ].join(" "),
        // NEW: Success variant (green)
        success: "bg-neo-lime text-neo-black hover:brightness-110",
        // NEW: Accent variant (pink)
        accent: "bg-neo-pink text-neo-black hover:brightness-110",
        // NEW: Cyan variant
        cyan: "bg-neo-cyan text-neo-black hover:brightness-110",
        // Gradient: special CTAs
        gradient: [
          "bg-linear-to-r from-neo-pink via-neo-orange to-neo-yellow",
          "text-neo-black hover:brightness-110",
        ].join(" "),
      },
      size: {
        // Consistent sizing with proper touch targets (48px minimum)
        default: "h-12 min-h-[48px] px-5 py-3 [&_svg]:w-5 [&_svg]:h-5",
        sm: "h-11 min-h-[44px] px-4 py-2 text-xs [&_svg]:w-4 [&_svg]:h-4",
        lg: "h-14 min-h-[56px] px-8 py-4 text-base [&_svg]:w-6 [&_svg]:h-6",
        // Desktop-optimized larger sizes
        xl: "h-16 min-h-[64px] px-10 py-5 text-lg [&_svg]:w-7 [&_svg]:h-7",
        "2xl": "h-18 min-h-[72px] px-12 py-6 text-xl [&_svg]:w-8 [&_svg]:h-8",
        icon: "h-12 w-12 min-h-[48px] min-w-[48px] p-0 [&_svg]:w-5 [&_svg]:h-5",
        "icon-lg": "h-14 w-14 min-h-[56px] min-w-[56px] p-0 [&_svg]:w-6 [&_svg]:h-6",
        "icon-xl": "h-16 w-16 min-h-[64px] min-w-[64px] p-0 [&_svg]:w-7 [&_svg]:h-7",
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
  /** Vibrate briefly on click (mobile only; no-op where unsupported) */
  haptic?: boolean;
  /** Optional hover/tap micro-animation. Default 'none' adds zero wrapper/cost. */
  animation?: "none" | "pop";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, haptic = false, animation = "none", onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (haptic && typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }
        onClick?.(e);
      },
      [haptic, onClick]
    );

    const button = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    );

    if (animation === "pop") {
      return (
        <AdaptiveMotion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {button}
        </AdaptiveMotion.div>
      );
    }

    return button;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
