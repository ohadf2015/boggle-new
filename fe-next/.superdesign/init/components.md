# Shared UI Components

> Source: `fe-next/components/ui/`
> All components use the `cn()` utility from `fe-next/lib/utils.ts` for class merging.

## cn Utility

**Path:** `fe-next/lib/utils.ts`

```tsx
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Button

**Path:** `fe-next/components/ui/button.tsx`
**Description:** Neo-Brutalist button with CVA variants. Thick borders, hard shadows, physical press effect.

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

// Neo-Brutalist Button Variants
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-bold uppercase tracking-wide",
    "border-3 border-neo-black rounded-neo",
    "shadow-hard",
    "transition-all duration-100",
    "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg",
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-white dark:focus-visible:ring-offset-neo-navy",
    "disabled:pointer-events-none disabled:opacity-50 disabled:translate-x-0 disabled:translate-y-0",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg]:w-5 [&_svg]:h-5",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-neo-lime text-neo-black hover:bg-neo-lime-hover",
        destructive: "bg-neo-red text-neo-black hover:brightness-110",
        outline: "bg-neo-cream text-neo-black hover:bg-neo-white",
        secondary: "bg-neo-pink text-neo-black hover:brightness-110",
        ghost: [
          "bg-transparent text-neo-black dark:text-neo-white border-3 border-neo-black dark:border-neo-cream shadow-none",
          "hover:bg-neo-navy-light/50 hover:border-neo-cyan hover:shadow-hard-sm",
          "hover:translate-x-0 hover:translate-y-0",
          "active:translate-x-0 active:translate-y-0 active:shadow-none",
        ].join(" "),
        link: [
          "bg-transparent text-neo-black dark:text-neo-cyan border-0 shadow-none",
          "underline underline-offset-4 decoration-2 decoration-neo-cyan",
          "hover:brightness-110 hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
          "active:translate-x-0 active:translate-y-0",
        ].join(" "),
        success: "bg-neo-lime text-neo-black hover:brightness-110",
        accent: "bg-neo-pink text-neo-black hover:brightness-110",
        cyan: "bg-neo-cyan text-neo-black hover:brightness-110",
      },
      size: {
        default: "h-12 min-h-[48px] px-5 py-3 [&_svg]:w-5 [&_svg]:h-5",
        sm: "h-11 min-h-[44px] px-4 py-2 text-xs [&_svg]:w-4 [&_svg]:h-4",
        lg: "h-14 min-h-[56px] px-8 py-4 text-base [&_svg]:w-6 [&_svg]:h-6",
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
```

---

## Card

**Path:** `fe-next/components/ui/card.tsx`
**Description:** Neo-Brutalist card system with CVA variants. Supports tilt, hover effects, gradients, container queries.

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tilt?: "left" | "right";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tilt, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-neo-lg border-4 border-neo-black bg-neo-cream text-neo-black",
        "dark:bg-slate-800 dark:text-neo-white dark:border-slate-400",
        "shadow-hard-lg h-full",
        "cq-container",
        tilt === "left" && "rotate-[-2deg]",
        tilt === "right" && "rotate-[2deg]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardDark = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tilt, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-neo-lg border-4 border-neo-black bg-neo-gray text-neo-white",
        "shadow-hard-lg h-full",
        "cq-container",
        tilt === "left" && "rotate-[-2deg]",
        tilt === "right" && "rotate-[2deg]",
        className
      )}
      {...props}
    />
  )
);
CardDark.displayName = "CardDark";

const cardVariants = cva(
  "border-neo-black rounded-neo @container/card cq-container h-full",
  {
    variants: {
      variant: {
        default: "bg-neo-cream dark:bg-neo-gray text-neo-black dark:text-neo-white shadow-hard-lg border-4",
        dark: "bg-neo-gray dark:bg-neo-black text-neo-white shadow-hard-lg border-4",
        gradient: "border-3 shadow-hard",
        outline: "bg-transparent border-3 shadow-hard-sm",
      },
      tilt: { none: "", left: "rotate-[-2deg]", right: "rotate-[2deg]" },
      hover: {
        none: "",
        lift: "transition-transform hover:-translate-y-1 hover:shadow-hard-xl",
        tilt3d: "transition-all hover:rotate-0",
      },
      padding: {
        none: "p-0",
        tight: "[&>*]:cq-p-tight",
        normal: "[&>*]:cq-p-responsive",
        large: "[&>*]:cq-p-responsive-lg",
        generous: "[&>*]:cq-p-generous",
      },
    },
    defaultVariants: { variant: "default", tilt: "none", hover: "none", padding: "normal" },
  }
);

export interface CardVariantProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  gradient?: string;
}

const CardVariant = React.forwardRef<HTMLDivElement, CardVariantProps>(
  ({ className, variant, tilt, hover, padding, gradient, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, tilt, hover, padding }), gradient, className)}
      style={style}
      {...props}
    />
  )
);

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 lg:space-y-2 cq-p-responsive", className)} {...props} />
  )
);

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl lg:text-3xl xl:text-4xl font-black uppercase leading-none tracking-tight", className)} {...props} />
  )
);

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm lg:text-base xl:text-lg text-neo-black/90 dark:text-neo-white/90", className)} {...props} />
  )
);

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("cq-p-responsive pt-0", className)} {...props} />
  )
);

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center cq-p-responsive pt-0", className)} {...props} />
  )
);

export { Card, CardDark, CardVariant, cardVariants, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

---

## Input

**Path:** `fe-next/components/ui/input.tsx`
**Description:** Neo-Brutalist text input with inset shadow and cyan focus ring.

```tsx
import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full px-4 py-2 text-sm font-medium",
          "rounded-neo border-3 border-neo-black dark:border-slate-500",
          "bg-neo-cream dark:bg-slate-700 text-slate-900 dark:text-white",
          "shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]",
          "placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy",
          "focus:shadow-[inset_3px_3px_0px_rgba(0,0,0,0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-neo-lime file:text-neo-black file:font-bold file:uppercase file:text-xs file:mr-3 file:px-3 file:py-1 file:rounded-neo",
          "transition-shadow duration-100",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

---

## Textarea

**Path:** `fe-next/components/ui/textarea.tsx`
**Description:** Neo-Brutalist textarea matching Input styling.

```tsx
import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full px-4 py-3 text-sm font-medium resize-y",
          "rounded-neo border-3 border-neo-black dark:border-slate-500",
          "bg-neo-cream dark:bg-slate-700 text-slate-900 dark:text-white",
          "shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]",
          "placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-shadow duration-100",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

export { Textarea };
```

---

## Dialog

**Path:** `fe-next/components/ui/dialog.tsx`
**Description:** Radix Dialog with Neo-Brutalist styling. Halftone overlay, paper texture, thick borders, hard shadow. Supports header color variants and close button variants.

Key props on `DialogContent`:
- `hideCloseButton`: hides the X button
- `noDescription`: suppresses a11y warning
- `thickBorder`: 6px border for modal emphasis
- `closeButtonVariant`: `'default'` (red) or `'minimal'` (black square)

Key props on `DialogHeader`:
- `variant`: `'yellow'` | `'pink'` | `'cyan'` | `'gradient'`
- `customBg`: custom background class

Sub-components: `Dialog`, `DialogTrigger`, `DialogClose`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter`

*(Full 284-line source in file)*

---

## Select

**Path:** `fe-next/components/ui/select.tsx`
**Description:** Radix Select with neo-brutalist styling. Lime hover highlight, cyan checked state, hard shadow dropdown. RTL-aware with `rtl:` prefix classes.

Sub-components: `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`, `SelectGroup`, `SelectValue`

*(Full 199-line source in file)*

---

## Badge

**Path:** `fe-next/components/ui/badge.tsx`
**Description:** CVA badge with interactive and display-only variants.

```tsx
const badgeVariants = cva(
  "inline-flex items-center justify-center font-black uppercase tracking-wide transition-all duration-100",
  {
    variants: {
      variant: {
        default: "bg-neo-lime text-neo-black shadow-hard-sm focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
        secondary: "bg-neo-pink text-neo-black shadow-hard-sm ...",
        destructive: "bg-neo-red text-neo-cream shadow-hard-sm ...",
        outline: "bg-neo-cream text-neo-black shadow-hard-sm ...",
        success: "bg-neo-lime text-neo-black shadow-hard-sm ...",
        accent: "bg-neo-pink text-neo-black shadow-hard-sm ...",
        cyan: "bg-neo-cyan text-neo-black shadow-hard-sm ...",
        purple: "bg-neo-purple text-neo-cream shadow-hard-sm ...",
        "display-default": "bg-neo-lime/80 text-neo-black border-neo-black/50 shadow-none cursor-default",
        "display-muted": "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 ...",
      },
      size: {
        default: "rounded-neo-pill border-2 border-neo-black px-3 py-1 text-xs",
        status: "border-2 border-neo-black px-3 py-1 text-[10px] shadow-[2px_2px_0px_black]",
      },
    },
  }
);
```

---

## Progress

**Path:** `fe-next/components/ui/progress.tsx`
**Description:** Radix Progress with pill shape, thick borders, size variants (sm/default/lg), color variants (default/success/warning/danger/accent/cyan).

---

## Tabs

**Path:** `fe-next/components/ui/tabs.tsx`
**Description:** Radix Tabs. Two variants: `pill` (bg-based) and `underline` (border-bottom). Active colors: lime/pink/cyan/purple.

---

## Checkbox / Switch / Label / Tooltip

All Radix-based with neo-brutalist styling. See individual files for full source.

---

## PageLoader

**Path:** `fe-next/components/ui/PageLoader.tsx`
**Description:** Full-page loader with Mascot inside spinning ring. Performance-adaptive.

---

## CoinBalanceBadge

**Path:** `fe-next/components/ui/CoinBalanceBadge.tsx`
**Description:** Compact coin balance pill with Coins icon, affordability state.

---

## EmptyState

**Path:** `fe-next/components/ui/EmptyState.tsx`
**Description:** Animated empty state with mascot. Types: no-words, waiting-players, no-games, no-results, error, custom.

---

## EnhancedButton

**Path:** `fe-next/components/ui/EnhancedButton.tsx`
**Description:** Extended Button with loading/success/error states, haptic feedback, Framer Motion animations.

---

## TactileButton

**Path:** `fe-next/components/ui/TactileButton.tsx`
**Description:** Squishy button with elastic press, glow hover, ripple click. Performance-adaptive.

---

## NeoSkeleton System

**Path:** `fe-next/components/ui/skeleton.tsx`
**Description:** Animated loading placeholders with shimmer effect. Presets: NeoSkeleton, NeoSkeletonText, NeoSkeletonAvatar, NeoSkeletonCard, NeoSkeletonTile, NeoSkeletonLeaderboard, NeoSkeletonWordList, NeoSkeletonGrid, NeoSkeletonButton.

---

## Full Component Index (`components/ui/`)

| Component | File | Purpose |
|-----------|------|---------|
| Button | `button.tsx` | Primary button with CVA variants |
| Card/CardVariant | `card.tsx` | Card system with tilt/hover/gradient |
| Input | `input.tsx` | Text input |
| Textarea | `textarea.tsx` | Multi-line text input |
| Dialog | `dialog.tsx` | Modal dialog |
| AlertDialog | `alert-dialog.tsx` | Confirmation dialog |
| Select | `select.tsx` | Dropdown select |
| Checkbox | `checkbox.tsx` | Checkbox with 48px touch target |
| Switch | `switch.tsx` | Toggle switch |
| Label | `label.tsx` | Form label |
| Badge | `badge.tsx` | Status/info badge |
| Progress | `progress.tsx` | Progress bar |
| Tabs | `tabs.tsx` | Tab navigation |
| Tooltip | `tooltip.tsx` | Tooltip with arrow |
| Skeleton/NeoSkeleton | `skeleton.tsx` | Loading placeholders |
| PageLoader | `PageLoader.tsx` | Full-page loader with mascot |
| CoinBalanceBadge | `CoinBalanceBadge.tsx` | Coin display badge |
| EmptyState | `EmptyState.tsx` | Empty/error states |
| EnhancedButton | `EnhancedButton.tsx` | Button with loading/success states |
| TactileButton | `TactileButton.tsx` | Squishy animated button |
| ConfirmationDialog | `ConfirmationDialog.tsx` | Confirm/cancel dialog |
| FormField | `FormField.tsx` | Form field wrapper |
| ValidatedInput | `ValidatedInput.tsx` | Input with validation |
| Mascot | `Mascot.tsx` | Character mascot |
| AnimatedCounter | `AnimatedCounter.tsx` | Animated number |
| EnhancedToast | `EnhancedToast.tsx` | Toast notification system |
| PullToRefreshIndicator | `PullToRefreshIndicator.tsx` | PTR visual indicator |
| CollapsibleSection | `CollapsibleSection.tsx` | Collapsible content |
| WizardStep | `WizardStep.tsx` | Multi-step wizard |
