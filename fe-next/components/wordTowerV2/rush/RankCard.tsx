"use client";

import { RANK_TIERS } from "@/lib/wordTowerV2/rush/rankLadder";
import type { RankState } from "@/lib/wordTowerV2/rush/types";
import { TIER_FILL } from "./RankMeter";

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  rank: RankState;
}

/** Metres from this run's peak to the next tier, rounded up so "0 m more" never shows. */
export function metresToNextTier(rank: RankState): number | null {
  if (rank.nextTierM === null) return null;
  const from = RANK_TIERS[rank.tier]?.minM ?? 0;
  const peak = from + (rank.nextTierM - from) * Math.min(1, Math.max(0, rank.progress01));
  return Math.max(1, Math.ceil(rank.nextTierM - peak));
}

/**
 * The rank, said in words, for the tower sheet. The old sheet showed a number,
 * a name and a bar, and never what the bar was counting toward. This names the
 * next rank and how many metres it is away.
 */
export function RankCard({ t, rank }: Props) {
  const left = metresToNextTier(rank);
  const next = RANK_TIERS[rank.tier + 1];
  const pct = left === null ? 100 : Math.round(Math.min(1, Math.max(0, rank.progress01)) * 100);
  const fill = TIER_FILL[Math.min(TIER_FILL.length - 1, Math.max(0, rank.tier))];

  return (
    <section
      data-wt2-rank-card
      className="rounded-neo border-[3px] border-neo-cream bg-neo-navy-light p-3 text-neo-cream shadow-hard"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black font-neo-display text-lg font-black text-neo-navy ${fill}`}
        >
          {rank.tier + 1}
        </span>
        <div className="min-w-0">
          <p className="font-neo-display text-[10px] font-bold uppercase leading-none opacity-70">
            {t("wordTowerV2.hud.sheet.rankLabel")}
          </p>
          <h3 className="truncate font-neo-display text-lg font-black uppercase leading-tight">
            {t(`wordTowerV2.rush.rank.${rank.tierId}`)}
          </h3>
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={t("wordTowerV2.rush.rank.progress")}
        className="mt-2.5 h-3 w-full overflow-hidden rounded-full border-2 border-neo-cream/70 bg-neo-navy"
      >
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <p data-wt2-rank-next className="mt-1.5 text-sm font-bold">
        {left === null || !next
          ? t("wordTowerV2.hud.sheet.rankMax")
          : t("wordTowerV2.hud.sheet.rankToNext", { m: left, name: t(`wordTowerV2.rush.rank.${next.id}`) })}
      </p>
    </section>
  );
}
