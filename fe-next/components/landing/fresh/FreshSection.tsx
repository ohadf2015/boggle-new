"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
import { cn } from "@/lib/utils";
import m from "./FreshReveal.module.css";
import b from "./FreshBoard.module.css";

export type FreshAccent = "lime" | "pink" | "cyan" | "purple";

/** Complete literal class strings per accent (Tailwind v4 only sees literals). */
const LINK_TONE: Record<FreshAccent, string> = {
  lime: "bg-neo-lime",
  pink: "bg-neo-pink",
  cyan: "bg-neo-cyan",
  purple: "bg-neo-purple",
};

const TILE_TONE: Record<FreshAccent, string> = {
  lime: "border-neo-lime",
  pink: "border-neo-pink",
  cyan: "border-neo-cyan",
  purple: "border-neo-purple",
};

const TILT = { a: b.tiltA, b: b.tiltB, c: b.tiltC } as const;

const VARIANT = {
  tile: "flex flex-col justify-between gap-6",
  wide: "grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10",
} as const;

export interface FreshSectionProps {
  /** data-fresh-section value: daily | friends | classrooms ... */
  id: string;
  title: string;
  line: string;
  /** The one visual, unboxed: the tile is its card. Decorative art only (alt=""). */
  art: ReactNode;
  link?: { href: string; label: string };
  accent: FreshAccent;
  /** tile = copy, art, link stacked; wide = copy beside art at ≥md. */
  variant?: keyof typeof VARIANT;
  /** Which way the tile lies askew on the board. */
  tilt?: keyof typeof TILT;
  /** Drop in a beat after its neighbour (second tile in a row). */
  late?: boolean;
  /** Grid placement on the board, a complete literal class string. */
  className?: string;
}

/** One story beat as a board tile: the tile is the card, the art sits inside it. */
export function FreshSection({
  id,
  title,
  line,
  art,
  link,
  accent,
  variant = "tile",
  tilt = "a",
  late,
  className,
}: FreshSectionProps) {
  const headingId = `fresh-${id}-title`;
  return (
    <section
      data-fresh-section={id}
      aria-labelledby={headingId}
      className={cn(
        "relative min-w-0 rounded-neo-xl border-3 bg-neo-navy-light p-5 shadow-hard-xl sm:p-7 md:p-8",
        TILE_TONE[accent],
        VARIANT[variant],
        b.tile,
        b.enter,
        late && b.enterLate,
        TILT[tilt],
        className,
      )}
    >
      <div className="flex min-w-0 flex-col items-start gap-3">
        <h2
          id={headingId}
          className={cn(
            "font-neo-poster text-[1.6rem] font-extrabold leading-[1.08] tracking-[-0.01em] text-neo-cream text-balance sm:text-3xl lg:text-4xl",
            b.posterWrap,
          )}
        >
          {title}
        </h2>
        <p className="max-w-[40ch] font-neo-body text-base leading-relaxed text-neo-cream/80 md:text-lg">
          {line}
        </p>
        {link && (
          <Link
            href={link.href}
            className={cn(
              "mt-2 inline-flex min-h-11 items-center gap-2 rounded-neo border-3 border-neo-black px-5 py-2.5",
              "font-neo-display text-base font-bold text-neo-black shadow-hard-lg",
              "active:translate-y-[2px] active:shadow-hard-pressed",
              "motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cream",
              LINK_TONE[accent],
            )}
          >
            {link.label}
            <DirectionalIcon icon={ArrowRight} className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div
        data-fresh-reveal="art"
        className={cn("flex min-w-0 justify-center", m.revealArt)}
      >
        {art}
      </div>
    </section>
  );
}
