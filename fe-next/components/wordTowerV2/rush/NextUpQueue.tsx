"use client";

import { useState } from "react";
import { m } from "framer-motion";
import type { NextUpSlot } from "@/lib/wordTowerV2/rush/types";
import { TRAIT_FILL, TraitGlyph } from "./perkGlyphs";

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  slots: NextUpSlot[];
  reducedMotion?: boolean;
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

export function NextUpQueue({ t, slots, reducedMotion = false }: Props) {
  const [seen, setSeen] = useState(slots);
  const [revealing, setRevealing] = useState<boolean[]>([]);
  const [gen, setGen] = useState<number[]>([]);
  if (!sameSlots(seen, slots)) {
    const next = detectReveals(seen, slots);
    setSeen(slots);
    setRevealing(next);
    setGen((g) => next.map((r, i) => (g[i] ?? 0) + (r ? 1 : 0)));
  }

  return (
    <div className="pointer-events-none flex items-center gap-1.5">
      <span className="font-neo-display text-[11px] font-black uppercase leading-none text-neo-cream [text-shadow:1px_1px_0_rgb(var(--neo-black))]">
        {t("wordTowerV2.rush.nextUp.title")}
      </span>
      <ul
        aria-label={t("wordTowerV2.rush.nextUp.label")}
        className="flex items-center gap-1.5 [perspective:500px]"
      >
        {slots.slice(0, 3).map((slot, i) => (
          <li key={i} className="flex">
            <Chip
              key={slot.sealed ? "sealed" : `open-${slot.trait}-${gen[i] ?? 0}`}
              t={t}
              slot={slot}
              first={i === 0}
              revealing={revealing[i] ?? false}
              reducedMotion={reducedMotion}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ChipProps {
  t: T;
  slot: NextUpSlot;
  first: boolean;
  revealing: boolean;
  reducedMotion: boolean;
}

function Chip({ t, slot, first, revealing, reducedMotion }: ChipProps) {
  const size = first ? "h-10 w-10" : "h-8 w-8";
  const base = `relative flex items-center justify-center overflow-hidden rounded-neo border-neo-thick border-black shadow-hard ${size}`;

  if (slot.sealed) {
    return (
      <m.span
        role="img"
        aria-label={t("wordTowerV2.rush.nextUp.sealed")}
        data-sealed="true"
        className={`${base} bg-neo-navy-light font-neo-display text-lg font-black text-neo-cream`}
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
        className={first ? "h-6 w-6" : "h-5 w-5"}
      />
    </m.span>
  );
}
