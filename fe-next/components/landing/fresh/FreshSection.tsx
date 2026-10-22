"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
import { cn } from "@/lib/utils";
import m from "./FreshReveal.module.css";

export type FreshAccent = "lime" | "pink" | "cyan" | "purple";

/** Complete literal class strings per accent (Tailwind v4 only sees literals). */
const LINK_TONE: Record<FreshAccent, string> = {
  lime: "bg-neo-lime",
  pink: "bg-neo-pink",
  cyan: "bg-neo-cyan",
  purple: "bg-neo-purple",
};

/**
 * Story beats own close to a phone screen (fresh.shell.r7.breathe); a compact
 * beat closes the run, so the page's rhythm is long, long, long, short instead
 * of four identical slabs.
 */
const SIZE = {
  beat: "gap-12 py-24 md:gap-20 md:py-40",
  compact: "gap-10 py-16 md:gap-16 md:py-28",
} as const;

export interface FreshSectionProps {
  /** data-fresh-section value: daily | friends | languages | classrooms ... */
  id: string;
  title: string;
  line: string;
  /** The one visual. Decorative art only (alt=""); the headline carries meaning. */
  art: ReactNode;
  link?: { href: string; label: string };
  accent: FreshAccent;
  /** Art on the start side at ≥md (sections alternate). Mobile always stacks text first. */
  flip?: boolean;
  size?: keyof typeof SIZE;
}

/**
 * Shared layout for fresh-page sections 2-6: one headline, one line, one piece
 * of art, one link. Stacks at 390; two columns at ≥md, alternating sides.
 * Content is visible at rest: the art and accent bar scroll in by transform
 * only (FreshReveal), and the link lifts on hover, all behind motion-safe.
 */
export function FreshSection({
  id,
  title,
  line,
  art,
  link,
  accent,
  flip,
  size = "beat",
}: FreshSectionProps) {
  const headingId = `fresh-${id}-title`;
  return (
    <section
      data-fresh-section={id}
      aria-labelledby={headingId}
      className={cn(
        "mx-auto grid w-full max-w-6xl items-center px-4 sm:px-6 md:grid-cols-2 lg:px-8",
        SIZE[size],
      )}
    >
      <div className="flex flex-col items-start gap-5">
        <h2
          id={headingId}
          className="font-neo-display text-4xl font-bold leading-[1.05] text-neo-cream text-balance md:text-5xl"
        >
          {title}
        </h2>
        <span
          aria-hidden="true"
          className={cn(
            "-mt-2 block h-1.5 w-16 origin-left rounded-full rtl:origin-right",
            LINK_TONE[accent],
            m.revealBar,
          )}
        />
        <p className="max-w-[38ch] font-neo-body text-lg leading-relaxed text-neo-cream/80 md:text-xl">
          {line}
        </p>
        {link && (
          <Link
            href={link.href}
            className={cn(
              "mt-2 inline-flex items-center gap-2 rounded-neo border-3 border-neo-black px-5 py-3",
              "font-neo-display text-base font-bold text-neo-black shadow-hard",
              "active:translate-y-[2px] active:shadow-hard-pressed",
              "motion-safe:transition-[transform,box-shadow] motion-safe:duration-150 motion-safe:hover:-translate-y-1 hover:shadow-hard-lg",
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
        className={cn(
          "flex justify-center",
          flip && "md:order-first",
          m.revealArt,
        )}
      >
        {art}
      </div>
    </section>
  );
}
