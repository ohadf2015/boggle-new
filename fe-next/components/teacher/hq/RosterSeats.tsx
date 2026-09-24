"use client";

import { memo } from "react";
import { m } from "framer-motion";
import { UserRound } from "lucide-react";
import Avatar from "@/components/Avatar";
import type { CustomAvatarConfig } from "@/shared/types/customAvatar";
import { cn } from "@/lib/utils";
import { seatPlan, type RosterStudent } from "./rosterModel";

export interface RosterSeatsProps {
  students: RosterStudent[];
  /** Ids that joined since the last read — they pop in and glow. */
  arrivals: readonly string[];
  seats?: number;
  /** Seat size in px. */
  size?: number;
  reduced?: boolean;
  className?: string;
}

const SEAT_BG = ["bg-neo-lime", "bg-neo-cyan", "bg-neo-pink", "bg-neo-yellow", "bg-neo-orange"] as const;

/** Stable colour per student, so a seat keeps its colour across polls. */
function seatColor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % SEAT_BG.length;
}

/** First grapheme of the name (works for Hebrew/Japanese names too). */
function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase() : "?";
}

/**
 * A row of seats: real avatars for students already in the class, dashed ghost
 * seats for the ones still to come. A student who joins while the teacher is
 * looking springs into a seat with a lime glow — the "lighting up" moment.
 */
export const RosterSeats = memo(function RosterSeats({
  students,
  arrivals,
  seats = 7,
  size = 36,
  reduced = false,
  className,
}: RosterSeatsProps) {
  const plan = seatPlan(students.length, seats);
  const fresh = new Set(arrivals);
  const shown = students.slice(0, plan.shown);

  return (
    <ul
      data-testid="hq-roster-seats"
      className={cn("flex items-center gap-1.5", className)}
    >
      {shown.map((s) => {
        const isNew = fresh.has(s.id);
        return (
          <m.li
            key={s.id}
            data-testid="hq-roster-seat"
            data-new={isNew ? "1" : undefined}
            title={s.name}
            initial={isNew && !reduced ? { scale: 0, rotate: -20 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 16 }}
            className={cn(
              "shrink-0 overflow-hidden rounded-full border-2 border-neo-black bg-neo-cream shadow-hard-sm",
              isNew && "ring-4 ring-neo-lime",
            )}
            style={{ width: size, height: size }}
          >
            {s.avatar ? (
              // The avatar renderer is a lazy chunk whose loading placeholder
              // is a dark pulsing disc — on navy that reads as an EMPTY seat.
              // Paint the student's colour + initial underneath and make that
              // placeholder transparent, so a loading seat is still a person.
              <span className="relative block size-full">
                <span
                  data-testid="hq-roster-underlay"
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 flex items-center justify-center font-neo-display font-black uppercase leading-none text-black",
                    SEAT_BG[seatColor(s.id)],
                  )}
                  style={{ fontSize: Math.round(size * 0.45) }}
                >
                  {initialOf(s.name)}
                </span>
                <span className="absolute inset-0 [&_.animate-pulse]:opacity-0">
                  <Avatar
                    customAvatar={s.avatar as CustomAvatarConfig}
                    userId={s.id}
                    pixelSize={size - 4}
                  />
                </span>
              </span>
            ) : (
              // No avatar yet (most new students): a bright initial, never the
              // generated-avatar skeleton that paints as a dark empty disc.
              <span
                data-testid="hq-roster-initial"
                aria-hidden="true"
                className={cn(
                  "flex size-full items-center justify-center font-neo-display font-black uppercase leading-none text-black",
                  SEAT_BG[seatColor(s.id)],
                )}
                style={{ fontSize: Math.round(size * 0.45) }}
              >
                {initialOf(s.name)}
              </span>
            )}
          </m.li>
        );
      })}
      {Array.from({ length: plan.ghosts }, (_, i) => (
        <li
          key={`ghost-${i}`}
          data-testid="hq-roster-ghost"
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-neo-cream/45 text-neo-cream/40"
          style={{ width: size, height: size }}
        >
          <UserRound className="size-1/2" aria-hidden="true" />
        </li>
      ))}
      {plan.overflow > 0 ? (
        <li
          className="flex shrink-0 items-center justify-center rounded-full border-2 border-neo-black bg-neo-lime font-neo-display text-xs font-black tabular-nums text-black shadow-hard-sm"
          style={{ width: size, height: size }}
        >
          +{plan.overflow}
        </li>
      ) : null}
    </ul>
  );
});

export default RosterSeats;
