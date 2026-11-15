"use client";

import { useEffect, useState } from "react";
import { m } from "framer-motion";
import type { NextUpSlot } from "@/lib/wordTowerV2/rush/types";
import { Info } from "lucide-react";
import { BlockLegend } from "./BlockLegend";
import { TRAIT_FILL, TraitGlyph } from "./perkGlyphs";

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  slots: NextUpSlot[];
  reducedMotion?: boolean;
  /** Smaller chips for the in-run bar on a phone. */
  compact?: boolean;
}

const sameSlots = (a: NextUpSlot[], b: NextUpSlot[]) =>
  a.length === b.length &&
  a.every((s, i) => s.trait === b[i]?.trait && s.sealed === b[i]?.sealed);

export function detectReveals(
  prev: NextUpSlot[],
  next: NextUpSlot[],
): boolean[] {
  if (sameSlots(prev, next)) return next.map(() => false);
  const newSealedTail = next[next.length - 1]?.sealed === true;
  return next.map((slot, i) => {
    if (slot.sealed) return false;
    if (prev[i]?.sealed) return true;
    const ahead = prev[i + 1];
    return (
      newSealedTail && ahead?.sealed === true && ahead.trait === slot.trait
    );
  });
}

/** How long the tap-to-open legend stays up when left alone. */
export const NEXT_UP_HINT_MS = 9000;

export function NextUpQueue({ t, slots, reducedMotion = false, compact = false }: Props) {
  // Three bare icons read as a mystery (player report, Nov 2026): the strip is
  // now one framed panel that NAMES the block coming next, and a tap opens a
  // legend that says what every block does.
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), NEXT_UP_HINT_MS);
    return () => clearTimeout(id);
  }, [hint]);
  const [seen, setSeen] = useState(slots);
  const [revealing, setRevealing] = useState<boolean[]>([]);
  const [gen, setGen] = useState<number[]>([]);
  if (!sameSlots(seen, slots)) {
    const next = detectReveals(seen, slots);
    setSeen(slots);
    setRevealing(next);
    setGen((g) => next.map((r, i) => (g[i] ?? 0) + (r ? 1 : 0)));
  }
  const first = slots[0];
  const firstName = first && !first.sealed ? t(`wordTowerV2.rush.blockInfo.short.${first.trait}`) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={hint}
      aria-label={t("wordTowerV2.rush.nextUp.hint")}
      data-next-up
      onClick={() => setHint((h) => !h)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setHint((h) => !h);
        }
      }}
      className="pointer-events-auto relative flex cursor-pointer items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-navy py-0.5 pe-1.5 ps-1 shadow-hard-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-neo-cream active:translate-x-[1px] active:translate-y-[1px]"
    >
      <ul
        aria-label={t("wordTowerV2.rush.nextUp.label")}
        className="flex items-center gap-1 [perspective:500px]"
      >
        {slots.slice(0, 3).map((slot, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <Chip
              key={slot.sealed ? "sealed" : `open-${slot.trait}-${gen[i] ?? 0}`}
              t={t}
              slot={slot}
              first={i === 0}
              compact={compact}
              revealing={revealing[i] ?? false}
              reducedMotion={reducedMotion}
            />
            {i === 0 && firstName ? (
              <span
                data-next-up-name
                aria-hidden
                className="flex flex-col pe-1 font-neo-display leading-none text-neo-cream"
              >
                <span className="text-[9px] font-bold uppercase opacity-70">{t("wordTowerV2.rush.blockInfo.next")}</span>
                <span className="text-xs font-black uppercase">{firstName}</span>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <Info aria-hidden className="h-4 w-4 shrink-0 text-neo-cream/70" />
      {hint ? (
        <div
          role="status"
          data-next-up-hint
          onClick={(e) => e.stopPropagation()}
          className="absolute start-1/2 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 cursor-default rounded-neo border-neo-thick border-black bg-neo-cream p-2.5 text-neo-navy shadow-hard rtl:translate-x-1/2"
        >
          <p className="mb-2 font-neo-display text-sm font-black uppercase">{t("wordTowerV2.hud.sheet.legendTitle")}</p>
          <BlockLegend t={t} current={first && !first.sealed ? first.trait : undefined} />
        </div>
      ) : null}
    </div>
  );
}

interface ChipProps {
  t: T;
  slot: NextUpSlot;
  first: boolean;
  compact: boolean;
  revealing: boolean;
  reducedMotion: boolean;
}

function Chip({ t, slot, first, compact, revealing, reducedMotion }: ChipProps) {
  const size = compact
    ? first
      ? "h-7 w-7 lg:h-10 lg:w-10"
      : "h-6 w-6 lg:h-8 lg:w-8"
    : first
      ? "h-10 w-10"
      : "h-8 w-8";
  const glyph = compact
    ? first
      ? "h-[1.125rem] w-[1.125rem] lg:h-6 lg:w-6"
      : "h-4 w-4 lg:h-5 lg:w-5"
    : first
      ? "h-6 w-6"
      : "h-5 w-5";
  const shadow = compact && !first ? "shadow-hard-sm" : "shadow-hard";
  const base = `relative flex items-center justify-center overflow-hidden rounded-neo border-neo-thick border-black ${shadow} ${size}`;

  if (slot.sealed) {
    return (
      <m.span
        role="img"
        aria-label={t("wordTowerV2.rush.nextUp.sealed")}
        data-sealed="true"
        className={`${base} bg-neo-navy-light font-neo-display ${compact ? "text-sm" : "text-lg"} font-black text-neo-cream`}
        initial={reducedMotion ? false : { y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
      >
        {reducedMotion ? null : (
          <m.span
            aria-hidden
            className="absolute inset-y-0 w-1/2 -skew-x-12 bg-neo-white/30"
            initial={{ x: "-160%" }}
            animate={{ x: ["-160%", "260%"] }}
            transition={{
              duration: 1.3,
              repeat: Infinity,
              repeatDelay: 0.9,
              ease: "easeInOut",
            }}
          />
        )}
        <span aria-hidden className="relative">
          ?
        </span>
      </m.span>
    );
  }

  return (
    <m.span
      role="img"
      aria-label={t(`wordTowerV2.rush.trait.${slot.trait}`)}
      data-trait={slot.trait}
      data-revealing={revealing ? "true" : undefined}
      className={`${base} ${TRAIT_FILL[slot.trait]}`}
      initial={
        reducedMotion
          ? revealing
            ? { opacity: 0 }
            : false
          : revealing
            ? { rotateY: 90, scale: 1.3 }
            : { y: -8, opacity: 0 }
      }
      animate={{ rotateY: 0, scale: 1, y: 0, opacity: 1 }}
      transition={
        revealing && !reducedMotion
          ? { type: "spring", stiffness: 360, damping: 13 }
          : { type: "spring", stiffness: 420, damping: 22 }
      }
    >
      <TraitGlyph
        trait={slot.trait}
        className={glyph}
      />
    </m.span>
  );
}
