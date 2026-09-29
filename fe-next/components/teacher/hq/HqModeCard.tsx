"use client";

import { memo } from "react";
import { m } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HQ_ACCENT_BG, HQ_ACCENT_TEXT, type HqMode } from "./hqModes";

export interface HqModeCardProps {
  mode: HqMode;
  label: string;
  blurb: string;
  selected: boolean;
  disabled?: boolean;
  /** When motion is reduced, the chip snaps instead of springing. */
  reduced?: boolean;
  onSelect: () => void;
}

/**
 * One game mode as a calm, compact chip — a radio, not a launch button:
 * selecting a chip changes what START will run; START stays the one launch
 * control on the deck.
 *
 * Deliberately NOT an illustrated poster: four saturated art tiles at equal
 * weight competed with GO LIVE for the teacher's eye. The chip carries the
 * mode's identity in two channels instead — its accent colour (idle: the
 * icon's ink; selected: the chip's fill) and its own icon shape — so the row
 * reads in one glance and colour-blindness costs nothing.
 *
 * Content-sized and `self-start` in EVERY data state: a chip may never
 * stretch into whatever height the grid row happens to have (the r3 capture
 * defect, kept honest by TeacherDashboard.loading.test).
 */
export const HqModeCard = memo(function HqModeCard({
  mode,
  label,
  blurb,
  selected,
  disabled = false,
  reduced = false,
  onSelect,
}: HqModeCardProps) {
  const still = reduced || disabled;
  const Icon = mode.icon;
  return (
    <m.button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      disabled={disabled}
      data-testid={`hq-mode-${mode.id}`}
      onClick={onSelect}
      whileHover={still ? undefined : { y: -2 }}
      whileTap={still ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 520, damping: 24 }}
      className={cn(
        "group relative flex h-14 w-full min-w-0 items-center gap-2.5 self-start rounded-neo border-2 px-2.5 text-start sm:h-16 sm:gap-3 sm:px-3 lg:h-[4.5rem]",
        // globals.css pads every landscape-phone <button> (unlayered, so it
        // beats utilities) — keep the chip compact there.
        "[@media(orientation:landscape)_and_(max-height:500px)]:h-11 [@media(orientation:landscape)_and_(max-height:600px)]:px-2! [@media(orientation:landscape)_and_(max-height:600px)]:py-0.5!",
        "transition-[box-shadow,border-color,background-color] duration-150",
        "focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan",
        selected
          ? cn(HQ_ACCENT_BG[mode.accent], "border-neo-black text-black shadow-hard-sm")
          : "border-neo-cream/40 bg-neo-navy text-neo-white hover:border-neo-cream",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <span
        data-mode-icon={mode.id}
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-neo border-2 sm:size-10",
          "[@media(orientation:landscape)_and_(max-height:500px)]:size-8",
          selected
            ? "border-neo-black/60 text-black"
            : cn("border-neo-cream/40 bg-neo-navy-light", HQ_ACCENT_TEXT[mode.accent]),
        )}
      >
        <Icon className="size-5" strokeWidth={2.5} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-neo-display text-xs font-bold uppercase leading-tight tracking-wide sm:text-sm">
          {label}
        </span>
        <span
          className={cn(
            "hidden truncate font-neo-body text-xs font-bold lg:block",
            selected ? "text-black/70" : "text-neo-white/60",
          )}
        >
          {blurb}
        </span>
      </span>
      {selected ? (
        <span
          data-selected-badge
          className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-neo-black bg-neo-white"
        >
          <Check className="size-3" strokeWidth={4} aria-hidden="true" />
        </span>
      ) : null}
    </m.button>
  );
});

export default HqModeCard;
