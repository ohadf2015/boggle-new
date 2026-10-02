"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
import { cn } from "@/lib/utils";

/** Counts 0 → value once the card is on screen; snaps under reduced motion. */
export function CountUpNumber({ value, run, reduced }: { value: number; run: boolean; reduced: boolean }) {
  const [shown, setShown] = useState(reduced || !run ? value : 0);
  useEffect(() => {
    if (reduced || !run || value <= 0) {
      setShown(value);
      return;
    }
    const start = Date.now();
    setShown(0);
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 600);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p >= 1) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [value, run, reduced]);
  return <span className="tabular-nums">{shown}</span>;
}

const ICON_TINT = {
  cyan: "bg-neo-cyan",
  lime: "bg-neo-lime",
  pink: "bg-neo-pink",
  purple: "bg-neo-purple",
} as const;

export interface HqToolCardProps {
  id: string;
  icon: LucideIcon;
  tint: keyof typeof ICON_TINT;
  title: string;
  /** The one live fact: a count-up number or a short line. */
  stat: ReactNode;
  index: number;
  reduced: boolean;
  onOpen: () => void;
}

/** One class tool, summarised — the details open on demand inside the sheet. */
export function HqToolCard({ id, icon: Icon, tint, title, stat, index, reduced, onOpen }: HqToolCardProps) {
  return (
    <button
      type="button"
      data-testid={`hq-tool-card-${id}`}
      onClick={onOpen}
      style={reduced ? undefined : { animationDelay: `${index * 45}ms` }}
      className={cn(
        "group relative flex min-h-[5.25rem] w-full min-w-0 flex-col items-start justify-between gap-2 rounded-neo border-2 border-neo-cream bg-neo-navy-light p-3 text-start",
        "shadow-hard-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-none",
        "focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan",
        !reduced && "motion-safe:animate-[hq-card-pop_320ms_cubic-bezier(.2,1.4,.4,1)_both]",
      )}
    >
      <span className="flex w-full items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black text-black shadow-hard-sm transition-transform duration-150 group-hover:-rotate-6",
            ICON_TINT[tint],
          )}
        >
          <Icon className="size-4" strokeWidth={2.75} />
        </span>
        <span className="min-w-0 flex-1 truncate font-neo-display text-xs font-black uppercase tracking-wide text-neo-white sm:text-sm">
          {title}
        </span>
        <DirectionalIcon
          icon={ChevronRight}
          className="size-4 shrink-0 text-neo-white/50 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
        />
      </span>
      <span className="min-w-0 max-w-full truncate font-neo-body text-sm font-bold text-neo-white/75">{stat}</span>
    </button>
  );
}

export default HqToolCard;
