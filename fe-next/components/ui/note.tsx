import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/**
 * NeoNote — tinted callout tile (status line, tip, warning, redacted block).
 *
 * Consolidates the hand-rolled `p-3 rounded-neo border border-neo-<accent>/40
 * bg-neo-<accent>/10` pattern — 15 inline copies across 9 education files,
 * with border opacity drifting 30/40/60 and fill drifting 10/60.
 *
 * Boundary (do NOT blur):
 * - `NeoPanel` (ui/panel.tsx) = the card SHELL (3px border, hard shadow).
 * - `NeoNote` = a flat tile INSIDE a panel. No shadow — stacking a hard shadow
 *   on a nested tile reads as a second card.
 *
 * Contrast: the accent border is SOLID, never translucent. A /40 accent border
 * on navy fails the 3:1 non-text edge gate (pink/40 = 1.69:1, red/40 = 1.72:1);
 * solid clears it on every tone (min 4.35:1, pink) and matches the brand's
 * "solid borders" rule. Fills stay at /10 — white body text on them is 13:1+.
 *
 * Each variant holds a COMPLETE literal class string: Tailwind v4 only
 * generates utilities it can see verbatim, so these must never be interpolated.
 */
const noteVariants = cva("rounded-neo border-2 p-3", {
  variants: {
    tone: {
      ok: "border-neo-lime bg-neo-lime/10",
      alert: "border-neo-pink bg-neo-pink/10",
      info: "border-neo-cyan bg-neo-cyan/10",
      danger: "border-neo-red bg-neo-red/10",
      muted: "border-neo-cream/40 bg-neo-navy/60",
    },
    dashed: {
      true: "border-dashed",
      false: "",
    },
  },
  defaultVariants: { tone: "muted", dashed: false },
});

export interface NeoNoteProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof noteVariants> {}

const NeoNote = React.forwardRef<HTMLDivElement, NeoNoteProps>(
  ({ className, tone, dashed, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(noteVariants({ tone, dashed }), className)}
      {...props}
    />
  )
);
NeoNote.displayName = "NeoNote";

export { NeoNote, noteVariants };
