import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/**
 * NeoPanel — lightweight neo-brutalist box shell.
 *
 * Consolidates the most hand-rolled pattern in the app:
 * `border-3 <tone border> rounded-neo` + a tone bg + `shadow-hard*`
 * (240+ inline copies across 143 files as of 2026-06-16).
 *
 * Boundary (do NOT blur):
 * - `Card`/`CardVariant` (ui/card.tsx) = heavy, full-height mode/feature
 *   cards (`h-full`, container queries, `border-4`). Use that for mode tiles.
 * - `NeoPanel` = lightweight, content-sized box. Padding/layout via `className`.
 * - Dynamic-color boxes (`style={{ backgroundColor }}`, lime/pink/etc.) are a
 *   different abstraction — omit `tone` and supply the bg via className/style.
 *
 * Uses `shadow-hard-*` utilities, which auto-flip for RTL (Hebrew).
 */
const panelVariants = cva("border-3", {
  variants: {
    // Border colour lives with the tone, not the base: black-on-navy measures
    // 1.23:1 and fails the 3:1 non-text edge gate (the border is invisible).
    // cream/40 on navy measures 3.74:1; black on cream measures ~20:1.
    tone: {
      none: "border-neo-black",
      navy: "bg-neo-navy border-neo-cream/40",
      cream: "bg-neo-cream border-neo-black",
    },
    shadow: {
      none: "",
      sm: "shadow-hard-sm",
      md: "shadow-hard",
      lg: "shadow-hard-lg",
    },
    radius: {
      neo: "rounded-neo",
      "neo-lg": "rounded-neo-lg",
    },
  },
  defaultVariants: {
    tone: "none",
    shadow: "md",
    radius: "neo",
  },
});

export interface NeoPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelVariants> {
  /**
   * Render as the single child element instead of a `<div>`, merging the panel
   * classes onto it (Radix Slot). Use to make a framer-motion element BE the
   * panel: `<NeoPanel asChild tone="navy"><m.div initial…>…</m.div></NeoPanel>`.
   */
  asChild?: boolean;
}

const NeoPanel = React.forwardRef<HTMLDivElement, NeoPanelProps>(
  ({ className, tone, shadow, radius, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn(panelVariants({ tone, shadow, radius }), className)}
        {...props}
      />
    );
  }
);
NeoPanel.displayName = "NeoPanel";

export { NeoPanel, panelVariants };
