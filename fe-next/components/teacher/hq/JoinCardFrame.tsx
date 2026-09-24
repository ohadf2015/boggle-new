"use client";

import { useId, type ReactNode } from "react";
import { UsersRound } from "lucide-react";
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
 * capture caught the card unmounting and the mode cards stretching into it).
 *
 * Step 2 is deliberately quieter than step 1 — navy header, cyan type — so
 * GO LIVE stays the loudest thing on HQ.
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
        "flex min-h-0 flex-col overflow-hidden rounded-neo-lg border-3 border-neo-cream/70 bg-neo-navy-light/95 shadow-hard-lg",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b-3 border-neo-cream/60 bg-neo-navy px-2.5 py-1.5 sm:px-4 sm:py-2">
        <span
          data-testid="hq-step-badge-2"
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-neo-black bg-neo-cyan font-neo-display text-base font-black leading-none text-black sm:size-8 sm:text-lg"
        >
          2
        </span>
        <h2
          id={headingId}
          className="min-w-0 truncate font-neo-display text-base font-black uppercase leading-none tracking-tight text-neo-cyan sm:text-xl"
        >
          {t("academy.hq.getStudentsIn", "Get students in")}
        </h2>
        <UsersRound className="size-5 shrink-0 text-neo-cyan" strokeWidth={3} aria-hidden="true" />
        {status}
      </div>
      {children}
    </section>
  );
}

export default JoinCardFrame;
