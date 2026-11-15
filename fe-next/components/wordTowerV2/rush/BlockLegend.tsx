"use client";

import type { BlockTrait } from "@/lib/wordTowerV2/rush/types";
import { TRAIT_FILL, TraitGlyph } from "./perkGlyphs";

type T = (key: string, params?: Record<string, string | number>) => string;

/** Every trait a block can carry, in the order a player meets them (plain first). */
export const LEGEND_TRAITS: BlockTrait[] = ["plain", "gold", "feather", "anvil", "magnet", "lucky"];

interface Props {
  t: T;
  /** Highlight the block that comes next, so the list answers "what is THIS one?" first. */
  current?: BlockTrait;
}

/**
 * What each block does, in words. The next-blocks strip used to be three bare
 * icons, and nothing in the game said what a feather or an anvil changes
 * (player report, Nov 2026). One row per trait: its chip, its name, one line.
 */
export function BlockLegend({ t, current }: Props) {
  return (
    <ul data-block-legend className="flex flex-col gap-1.5">
      {LEGEND_TRAITS.map((trait) => (
        <li
          key={trait}
          data-legend-trait={trait}
          data-current={trait === current ? "true" : undefined}
          className={`flex items-center gap-2 rounded-neo-sm px-1 py-0.5 ${trait === current ? "bg-neo-yellow/25 ring-2 ring-neo-yellow" : ""}`}
        >
          <span
            aria-hidden
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-neo-sm border-2 border-black ${TRAIT_FILL[trait]}`}
          >
            <TraitGlyph trait={trait} className="h-4 w-4" />
          </span>
          <span className="min-w-0 text-start leading-tight">
            <span className="block font-neo-display text-xs font-black uppercase">
              {t(`wordTowerV2.rush.blockInfo.short.${trait}`)}
            </span>
            <span className="block text-xs font-semibold opacity-80">{t(`wordTowerV2.rush.blockInfo.desc.${trait}`)}</span>
          </span>
        </li>
      ))}
      <li className="flex items-center gap-2 px-1 py-0.5">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo-sm border-2 border-black bg-neo-navy-light font-neo-display text-sm font-black text-neo-cream"
        >
          ?
        </span>
        <span className="min-w-0 text-start text-xs font-semibold leading-tight opacity-80">
          {t("wordTowerV2.rush.nextUp.sealed")}
        </span>
      </li>
    </ul>
  );
}
