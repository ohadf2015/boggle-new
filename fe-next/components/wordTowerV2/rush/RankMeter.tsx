"use client";

import { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import type { RankState } from "@/lib/wordTowerV2/rush/types";

type T = (key: string, params?: Record<string, string | number>) => string;

const TIER_FILL = [
  "bg-neo-gray-300",
  "bg-neo-cream",
  "bg-neo-cyan",
  "bg-neo-lime",
  "bg-neo-yellow",
  "bg-neo-orange",
  "bg-neo-pink",
  "bg-neo-purple",
  "bg-neo-yellow",
];

const PULSE_MS = 900;

interface Props {
  t: T;
  rank: RankState;
  reducedMotion?: boolean;
}

export function RankMeter({ t, rank, reducedMotion = false }: Props) {
  const lastTier = useRef(rank.tier);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (rank.tier > lastTier.current) {
      setPulseKey((k) => k + 1);
      const id = window.setTimeout(() => setPulseKey(0), PULSE_MS);
      lastTier.current = rank.tier;
      return () => window.clearTimeout(id);
    }
    lastTier.current = rank.tier;
    return undefined;
  }, [rank.tier]);

  const atMax = rank.nextTierM === null;
  const pct = atMax
    ? 100
    : Math.round(Math.min(1, Math.max(0, rank.progress01)) * 100);
  const fill =
    TIER_FILL[Math.min(TIER_FILL.length - 1, Math.max(0, rank.tier))];
  const pulsing = pulseKey > 0;

  return (
    <m.div
      key={pulseKey}
      data-rank-pulse={pulsing ? "true" : undefined}
      className={`pointer-events-none flex min-w-[7.5rem] max-w-[11rem] flex-col gap-1 rounded-neo border-neo-thick border-black bg-neo-navy px-2 py-1 shadow-hard ${pulsing ? "ring-4 ring-neo-yellow" : ""}`}
      initial={pulsing && !reducedMotion ? { scale: 1 } : false}
      animate={
        pulsing && !reducedMotion
          ? { scale: [1, 1.18, 0.96, 1], rotate: [0, -3, 2, 0] }
          : { scale: 1 }
      }
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-neo-sm border-2 border-black px-0.5 font-neo-display text-[11px] font-black leading-none text-neo-navy ${fill}`}
        >
          {rank.tier + 1}
        </span>
        <span className="min-w-0 truncate font-neo-display text-xs font-black uppercase leading-tight text-neo-cream">
          {t(`wordTowerV2.rush.rank.${rank.tierId}`)}
        </span>
        {atMax ? (
          <span className="ms-auto shrink-0 rounded-neo-sm bg-neo-yellow px-1 font-neo-display text-[10px] font-black uppercase leading-tight text-neo-navy">
            {t("wordTowerV2.rush.rank.max")}
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={t("wordTowerV2.rush.rank.progress")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 w-full overflow-hidden rounded-neo-pill border border-black bg-neo-navy-light"
      >
        <m.div
          className={`h-full origin-[left] rtl:origin-[right] ${fill}`}
          initial={false}
          animate={{ scaleX: pct / 100 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 160, damping: 24 }
          }
        />
      </div>
    </m.div>
  );
}
