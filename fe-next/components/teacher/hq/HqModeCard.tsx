"use client";

import { memo } from "react";
import Image from "next/image";
import { m } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HQ_ACCENT_BG, HQ_ACCENT_STAGE, type HqMode } from "./hqModes";

export interface HqModeCardProps {
  mode: HqMode;
  label: string;
  blurb: string;
  selected: boolean;
  disabled?: boolean;
  /** When motion is reduced, the card snaps instead of springing. */
  reduced?: boolean;
  onSelect: () => void;
}

/**
 * One illustrated game card — a game-mode select tile, not a form option.
 * A radio, not a launch button: selecting a card changes what START will run;
 * START stays the one launch control on the deck.
 *
 * Same shape at every size: an art stage on top that fills the card (the
 * island IS the card), a name plate underneath; a 2:3 card below `lg`. The name
 * only ever wraps between words — never "VOCA/B QUIZ".
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
  return (
    <m.button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      data-testid={`hq-mode-${mode.id}`}
      onClick={onSelect}
      whileHover={still ? undefined : { y: -4 }}
      whileTap={still ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 520, damping: 22 }}
      className={cn(
        "group relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-neo-lg border-3 text-center",
        // globals.css pads every landscape-phone <button> (unlayered, so it
        // beats utilities) — that padding squeezed the plate to "VOCA…".
        "[@media(orientation:landscape)_and_(max-height:600px)]:p-0!",
        // Phone/tablet: a fixed card shape in EVERY data state — never
        // stretched to whatever height the grid row happens to have (the r3
        // loading capture turned four cards into tall empty columns). Desktop
        // is a fixed 2x2 board that fills its column by design.
        "aspect-[2/3] w-full self-start justify-self-stretch lg:aspect-auto lg:self-stretch",
        // Short screens can't afford 2:3 portraits AND the join card: under
        // 700px tall (375x667) or sideways the cards become a row of name
        // plates; 700-760px (360x740) keeps the art in a square.
        "[@media(orientation:landscape)_and_(max-height:500px)]:aspect-auto [@media(orientation:landscape)_and_(max-height:500px)]:self-stretch max-sm:[@media(max-height:700px)]:aspect-auto max-sm:[@media(max-height:700px)]:self-stretch max-sm:[@media(min-height:701px)_and_(max-height:760px)]:aspect-square",
        "transition-[box-shadow,border-color,background-color] duration-150",
        "focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan",
        selected
          ? cn(
              HQ_ACCENT_BG[mode.accent],
              "border-neo-black text-black shadow-hard-lg",
            )
          : "border-neo-cream/60 bg-neo-navy/90 text-neo-white shadow-hard-sm hover:border-neo-cream",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      {selected ? (
        <span className="absolute end-1.5 top-1.5 z-10 flex size-5 items-center max-sm:[@media(max-height:700px)]:hidden [@media(orientation:landscape)_and_(max-height:500px)]:hidden justify-center rounded-full border-2 border-neo-black bg-neo-white text-black shadow-hard-sm lg:end-3 lg:top-3 lg:size-8">
          <Check
            className="size-3 lg:size-5"
            strokeWidth={4}
            aria-hidden="true"
          />
        </span>
      ) : null}

      {/* The stage: accent-tinted when idle, so four cards read as four
          different games before one is chosen. */}
      <span
        className={cn(
          "relative flex min-h-0 w-full flex-1 items-center justify-center",
          // Short screens: no height for art — name plates only.
          "[@media(orientation:landscape)_and_(max-height:500px)]:hidden max-sm:[@media(max-height:700px)]:hidden",
          !selected && HQ_ACCENT_STAGE[mode.accent],
        )}
      >
        <m.span
          className="absolute inset-[5%]"
          animate={selected && !reduced ? { y: [0, -6, 0] } : { y: 0 }}
          transition={
            selected && !reduced
              ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.15 }
          }
        >
          {/* A hard-edged pedestal under the island — a stage, not a glow. */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-[18%] bottom-[2%] h-[12%] rounded-[50%]",
              selected ? "bg-black/25" : "bg-black/35",
            )}
          />
          <Image
            src={mode.art}
            alt=""
            aria-hidden="true"
            width={512}
            height={512}
            unoptimized
            draggable={false}
            className="absolute inset-0 m-auto size-full select-none object-contain drop-shadow-[0_4px_0_rgba(0,0,0,0.55)] transition-transform duration-200 group-hover:scale-105"
          />
        </m.span>
      </span>

      {/* Name plate. */}
      <span
        className={cn(
          "flex w-full shrink-0 flex-col gap-0.5 border-t-3 px-1 py-1 lg:px-3 lg:py-2",
          "[@media(orientation:landscape)_and_(max-height:500px)]:min-h-10 [@media(orientation:landscape)_and_(max-height:500px)]:flex-1 [@media(orientation:landscape)_and_(max-height:500px)]:justify-center [@media(orientation:landscape)_and_(max-height:500px)]:border-t-0 max-sm:[@media(max-height:700px)]:min-h-11 max-sm:[@media(max-height:700px)]:flex-1 max-sm:[@media(max-height:700px)]:justify-center max-sm:[@media(max-height:700px)]:border-t-0",
          selected
            ? "border-neo-black bg-black/10"
            : "border-neo-cream/25 bg-neo-navy",
        )}
      >
        <span className="line-clamp-2 w-full break-normal font-neo-display text-[0.65rem] font-black uppercase leading-[1.05] tracking-tight [hyphens:none] sm:text-sm lg:line-clamp-1 [@media(orientation:landscape)_and_(max-height:500px)]:text-xs lg:text-2xl xl:text-[1.7rem]">
          {label}
        </span>
        <span
          className={cn(
            // Only when the 2x2 board has height to spare: below 800px tall
            // the one-liner ate the island art down to a 30px sliver.
            "hidden w-full truncate font-neo-body text-sm font-bold lg:[@media(min-height:800px)]:block",
            selected ? "text-black/75" : "text-neo-white/75",
          )}
        >
          {blurb}
        </span>
      </span>
    </m.button>
  );
});

export default HqModeCard;
