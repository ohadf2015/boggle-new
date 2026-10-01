"use client";

import { memo } from "react";
import Image from "next/image";
import { m } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HQ_ACCENT_BG, HQ_ACCENT_TEXT, hqModeFacts, type HqMode } from "./hqModes";

export interface HqModeCardProps {
  mode: HqMode;
  label: string;
  blurb: string;
  selected: boolean;
  disabled?: boolean;
  /** When motion is reduced, the tile snaps instead of springing. */
  reduced?: boolean;
  onSelect: () => void;
}

/** Faint accent wash behind the idle sticker — literal classes so Tailwind emits them. */
const STAGE_IDLE: Record<HqMode["accent"], string> = {
  cyan: "bg-neo-cyan/15",
  lime: "bg-neo-lime/15",
  pink: "bg-neo-pink/15",
  purple: "bg-neo-purple/20",
};

/**
 * One game mode as an illustrated tile — a radio, never a launch button:
 * GO LIVE stays the one launch control. The catalog poster pops out of the
 * tile like a sticker; the icon badge keeps colour from being the only signal.
 * Fixed heights and `self-start` in every data state, so a tile never
 * stretches into a grid row (TeacherDashboard.loading.test).
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
  const poster = hqModeFacts(mode.id).poster;
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
      whileTap={still ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 22 }}
      className={cn(
        "group relative flex h-[3.25rem] w-full min-w-0 items-center gap-2 self-start rounded-neo border-2 ps-1.5 pe-2 text-start sm:h-16 sm:gap-2.5 lg:h-24 lg:gap-3 lg:ps-2",
        "max-sm:[@media(max-height:740px)]:h-12",
        "[@media(orientation:landscape)_and_(max-height:500px)]:h-10! [@media(orientation:landscape)_and_(max-height:600px)]:px-2! [@media(orientation:landscape)_and_(max-height:600px)]:py-0.5!",
        "transition-[box-shadow,border-color,background-color] duration-150",
        "focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan",
        selected
          ? cn(HQ_ACCENT_BG[mode.accent], "border-neo-black text-black shadow-hard")
          : "border-neo-cream/40 bg-neo-navy text-neo-white shadow-hard-sm hover:border-neo-cream",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative flex size-12 shrink-0 items-end justify-center rounded-full sm:size-14 lg:size-20",
          "max-sm:[@media(max-height:740px)]:size-10 [@media(orientation:landscape)_and_(max-height:500px)]:size-8",
          selected ? "bg-neo-white/80" : STAGE_IDLE[mode.accent],
        )}
      >
        <m.span
          className="absolute -inset-x-1 -top-2 -bottom-0.5 sm:-top-3 lg:-top-5"
          animate={still ? undefined : selected ? { scale: 1.14, rotate: -5, y: -2 } : { scale: 1, rotate: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 14 }}
        >
          <Image
            src={poster}
            alt=""
            width={96}
            height={96}
            className="size-full select-none object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.55)]"
          />
        </m.span>
        <span
          data-mode-icon={mode.id}
          className={cn(
            "absolute -bottom-1.5 -end-1.5 flex size-5 items-center justify-center rounded-full border-2 border-neo-black lg:size-7",
            selected ? "bg-neo-white text-black" : cn("bg-neo-navy-light", HQ_ACCENT_TEXT[mode.accent]),
          )}
        >
          <Icon className="size-3 lg:size-4" strokeWidth={3} />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 font-neo-display text-[0.7rem] font-black uppercase leading-tight tracking-wide sm:text-sm lg:text-base">
          {label}
        </span>
        <span
          className={cn(
            "hidden font-neo-body text-xs font-bold leading-snug lg:line-clamp-2",
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
