"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { m } from "framer-motion";

type T = (key: string, params?: Record<string, string | number>) => string;

export const RANK_UP_MS = 2200;

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const RAY_FILL = ["bg-neo-yellow", "bg-neo-cyan", "bg-neo-pink", "bg-neo-lime"];

interface Props {
  t: T;
  tierId: string;
  onDone: () => void;
  reducedMotion?: boolean;
  /** Distance below the safe-area top edge, so the burst clears the HUD bar. */
  topOffset?: string;
}

export function RankUpBurst({
  t,
  tierId,
  onDone,
  reducedMotion = false,
  topOffset = "5rem",
}: Props) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const id = window.setTimeout(() => onDoneRef.current(), RANK_UP_MS);
    return () => window.clearTimeout(id);
  }, []);

  const life = RANK_UP_MS / 1000;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[56] flex justify-center px-4"
      style={{
        top: `calc(max(0.5rem, env(safe-area-inset-top)) + ${topOffset})`,
      }}
    >
      <m.div
        role="status"
        aria-live="polite"
        className="relative flex max-w-full flex-col items-center"
        initial={
          reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: 10 }
        }
        animate={
          reducedMotion
            ? { opacity: [0, 1, 1, 0] }
            : {
                opacity: [0, 1, 1, 0],
                scale: [0.3, 1.18, 1, 0.9],
                y: [10, 0, 0, -10],
              }
        }
        transition={{
          duration: life,
          times: [0, 0.14, 0.85, 1],
          ease: "easeOut",
        }}
      >
        {reducedMotion
          ? null
          : RAY_ANGLES.map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const dist = 96 + (i % 2) * 22;
              return (
                <m.span
                  key={deg}
                  aria-hidden
                  className={`absolute left-1/2 top-1/2 h-3.5 w-3.5 rounded-[2px] border-2 border-black ${RAY_FILL[i % RAY_FILL.length]}`}
                  style={{ marginLeft: -7, marginTop: -7 }}
                  initial={{ x: 0, y: 0, scale: 0.3, opacity: 1, rotate: 0 }}
                  animate={{
                    x: Math.cos(rad) * dist,
                    y: Math.sin(rad) * dist * 0.6,
                    scale: 1,
                    opacity: [1, 1, 0],
                    rotate: deg,
                  }}
                  transition={{
                    duration: 0.9,
                    delay: 0.12,
                    ease: "easeOut",
                    times: [0, 0.6, 1],
                  }}
                />
              );
            })}
        <span className="relative z-10 -rotate-3 rounded-neo-sm border-2 border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black uppercase tracking-wide text-neo-navy shadow-hard">
          {t("wordTowerV2.rush.rankUp.title")}
        </span>
        <span className="relative -mt-1 max-w-full break-words rounded-neo border-neo-thick border-black bg-neo-purple px-4 py-1.5 text-center font-neo-display text-3xl font-black uppercase leading-none text-neo-white shadow-hard-xl sm:text-5xl">
          {t(`wordTowerV2.rush.rank.${tierId}`)}
        </span>
      </m.div>
    </div>,
    document.body,
  );
}
