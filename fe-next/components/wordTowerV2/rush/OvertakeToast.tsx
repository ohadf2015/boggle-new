"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { m } from "framer-motion";

type T = (key: string, params?: Record<string, string | number>) => string;

export const OVERTAKE_MS = 1800;

const NAME_MAX = 16;

function shortName(name: string): string {
  const chars = Array.from(name);
  return chars.length > NAME_MAX ? `${chars.slice(0, NAME_MAX - 1).join("")}…` : name;
}

interface Props {
  t: T;
  name: string;
  onDone: () => void;
  reducedMotion?: boolean;
  /** Distance below the safe-area top edge, so the toast clears the HUD bar. */
  topOffset?: string;
}

export function OvertakeToast({
  t,
  name,
  onDone,
  reducedMotion = false,
  topOffset = "4.5rem",
}: Props) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const id = window.setTimeout(() => onDoneRef.current(), OVERTAKE_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[55] flex justify-center px-4"
      style={{
        top: `calc(max(0.5rem, env(safe-area-inset-top)) + ${topOffset})`,
      }}
    >
      <m.div
        role="status"
        aria-live="polite"
        className="flex max-w-full items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-pink py-1.5 pe-3 ps-1.5 text-neo-navy shadow-hard-xl"
        initial={
          reducedMotion
            ? { opacity: 0 }
            : { opacity: 0, y: -36, scale: 0.6, rotate: -6 }
        }
        animate={
          reducedMotion
            ? { opacity: [0, 1, 1, 0] }
            : {
                opacity: [0, 1, 1, 0],
                y: [-36, 0, 0, -12],
                scale: [0.6, 1.12, 1, 0.94],
                rotate: [-6, 2, -1, -1],
              }
        }
        transition={{
          duration: OVERTAKE_MS / 1000,
          times: [0, 0.16, 0.82, 1],
          ease: "easeOut",
        }}
      >
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo-sm border-2 border-black bg-neo-lime shadow-hard-sm"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 stroke-neo-black"
            fill="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
          >
            <path d="M12 3 21 13h-5v8H8v-8H3z" />
          </svg>
        </span>
        <span className="min-w-0 break-words font-neo-display text-lg font-black uppercase leading-tight sm:text-xl">
          {t("wordTowerV2.rush.overtake.passed", { name: shortName(name) })}
        </span>
      </m.div>
    </div>,
    document.body,
  );
}
