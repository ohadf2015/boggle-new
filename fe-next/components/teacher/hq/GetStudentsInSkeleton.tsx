"use client";

import { cn } from "@/lib/utils";
import { JoinCardFrame } from "./JoinCardFrame";

/** Pulses, unless the OS asks for stillness. */
const SHIMMER = "animate-pulse motion-reduce:animate-none";

/**
 * "Get students in" while the class read is open: the live card's exact
 * geometry — six code boxes, the three action slots, the roster row — as
 * inert placeholders. Nothing here is a control (a button that does nothing
 * mid-load is a silent no-op), and the frame is the same one the live card
 * uses, so the swap to real data moves no pixel around it.
 */
export function GetStudentsInSkeleton({ className }: { className?: string }) {
  return (
    <JoinCardFrame busy testId="hq-join-skeleton" className={className}>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-3 lg:p-4" aria-hidden="true">
        {/* The code plate: label bar + six shimmer boxes, same box as the live code. */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-neo border-3 border-neo-yellow/40 bg-neo-navy px-2 py-1.5 shadow-hard-sm lg:gap-2 lg:py-3">
          <span className={cn("h-2.5 w-20 rounded-full bg-neo-yellow/25 lg:h-3.5 lg:w-28", SHIMMER)} />
          <span dir="ltr" className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                data-testid="hq-join-skeleton-code-box"
                className={cn(
                  "h-10 w-8 rounded-md border-2 border-neo-yellow/35 bg-neo-yellow/10 sm:h-12 sm:w-10 lg:h-16 lg:w-14 2xl:h-20 2xl:w-16",
                  SHIMMER,
                )}
                style={{ animationDelay: `${i * 90}ms` }}
              />
            ))}
          </span>
        </div>

        {/* Copy link / QR / Projector — slots, not buttons. */}
        <div className="grid shrink-0 grid-cols-3 gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <span
              key={i}
              data-testid="hq-join-skeleton-action"
              className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-neo border-2 border-neo-cream/60 bg-neo-navy px-1 py-1 sm:flex-row sm:gap-1.5"
            >
              <span className={cn("size-4 rounded-sm bg-neo-white/15", SHIMMER)} />
              <span className={cn("h-2 w-10 rounded-full bg-neo-white/15 sm:w-14", SHIMMER)} />
            </span>
          ))}
        </div>

        {/* The roster row: a few empty seats and the count's slot. */}
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-neo border-2 border-neo-cream/60 bg-neo-navy/70 px-2 py-1.5 lg:min-h-0 lg:flex-1 lg:flex-col lg:justify-center lg:gap-4 lg:p-3">
          <span className="flex items-center gap-1.5 lg:gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={cn("size-[34px] rounded-full border-2 border-neo-cream/20 bg-neo-white/10 lg:size-16", SHIMMER)}
              />
            ))}
          </span>
          <span className={cn("h-6 w-16 rounded-md bg-neo-white/10 lg:h-8 lg:w-40", SHIMMER)} />
        </div>
      </div>
    </JoinCardFrame>
  );
}

export default GetStudentsInSkeleton;
