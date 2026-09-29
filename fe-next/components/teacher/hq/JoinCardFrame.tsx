"use client";

import { useId, type ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export interface JoinCardFrameProps {
  /** The pill at the header's end ("Code ready"); omitted while loading. */
  status?: ReactNode;
  /** True while the class read is open — the frame is a skeleton. */
  busy?: boolean;
  testId?: string;
  className?: string;
  children: ReactNode;
}

/**
 * The ONE frame of step 2, "Get students in", shared by all three of its
 * states — skeleton (class read open), first run (no class yet) and the live
 * card. Same edge, same header row, same step badge: the slot never changes
 * shape as data arrives, so nothing around it can reflow into the gap (the r3
 * capture caught the card unmounting and the mode chips stretching into it).
 *
 * Step 2 stays deliberately quieter than step 1 — a hairline header, a cyan
 * step ring — so GO LIVE stays the loudest thing on HQ.
 */
export function JoinCardFrame({ status, busy = false, testId, className, children }: JoinCardFrameProps) {
  const { t } = useLanguage();
  const headingId = useId();
  return (
    <section
      data-testid={testId}
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
      className={cn(
        "@container flex min-h-0 flex-col overflow-hidden rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/95 shadow-hard",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-neo-cream/40 px-3 py-2 sm:px-4 [@media(orientation:landscape)_and_(max-height:500px)]:py-1.5">
        <span
          data-testid="hq-step-badge-2"
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-neo-cyan font-neo-display text-sm font-black leading-none text-neo-cyan"
        >
          2
        </span>
        <h2
          id={headingId}
          className="min-w-0 truncate font-neo-display text-base font-bold leading-none tracking-tight text-neo-white"
        >
          {t("academy.hq.getStudentsIn", "Get students in")}
        </h2>
        {status}
      </div>
      {children}
    </section>
  );
}

export default JoinCardFrame;
