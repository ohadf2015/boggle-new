// Pins the exact classes every existing importer renders, so moving their source is provably a no-op.
import { describe, it, expect } from "vitest";
import * as nb from "@/components/teacher/nb/nbStyles";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/education/live/eduLiveStyles";
import * as home from "@/components/teacher/home/homeStyles";
import { pressClasses } from "@/components/education/motion/pressClasses";
import { NEO_BLOCK_TONES, NEO_BUTTON, NEO_DARK_EDGE, neoPress } from "@/components/ui/neoStyles";

const NB_BASELINE = {
  "NB_DARK_EDGE": "border-neo-cream/50",
  "NB_PANEL": "rounded-neo-xl border-[3px] border-neo-cream/50 bg-[#2a2b4a] text-neo-cream shadow-hard-xl",
  "NB_BLOCK": {
    "lime": "bg-neo-lime text-neo-black border-neo-black",
    "pink": "bg-neo-pink text-white border-neo-black",
    "cyan": "bg-neo-cyan text-neo-black border-neo-black",
    "yellow": "bg-neo-yellow text-neo-black border-neo-black",
    "purple": "bg-neo-purple text-white border-neo-black",
    "orange": "bg-neo-orange text-neo-black border-neo-black",
    "cream": "bg-neo-cream text-neo-black border-neo-black",
    "navy": "bg-neo-navy-light text-neo-cream border-neo-cream/50"
  },
  "NB_PRIMARY": "inline-flex items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black text-center font-neo-display font-black leading-tight shadow-hard-xl transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-px hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy min-h-[56px] px-5 text-xl bg-neo-lime text-neo-black",
  "NB_SECONDARY": "inline-flex items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black text-center font-neo-display font-black leading-tight shadow-hard-xl transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-px hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy min-h-[48px] px-4 text-base bg-neo-navy-light text-neo-cream border-neo-cream/50",
  "NB_SMALL": "inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-neo-black px-3 font-neo-display text-sm font-black shadow-hard-lg transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-px hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy",
  "NB_STICKER": "inline-flex items-center gap-1 whitespace-nowrap rounded-neo-pill border-2 border-neo-black px-2.5 py-0.5 font-neo-body text-xs font-black shadow-hard",
  "NB_LINK": "inline-flex min-h-[44px] items-center gap-1 rounded-neo px-2 font-neo-body text-sm font-bold text-neo-cream/85 underline decoration-2 underline-offset-4 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy",
  "NB_ADVANCED": "flex min-h-[48px] w-full items-center justify-between gap-2 rounded-neo-lg border-[3px] border-dashed border-neo-cream/35 px-3 text-start font-neo-body text-sm font-bold text-neo-cream/85 hover:border-neo-cream/70 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy",
  "NB_INPUT": "min-h-[52px] w-full rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-3 font-neo-body text-base font-bold text-neo-black shadow-hard-lg placeholder:text-neo-black/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
};

describe("neo style single source", () => {
  it("keeps every NB_* export byte-identical", () => {
    for (const [key, value] of Object.entries(NB_BASELINE)) {
      expect(nb[key as keyof typeof nb], key).toEqual(value);
    }
  });

  it("keeps the live buttons byte-identical", () => {
    expect(PRIMARY_BUTTON).toBe("inline-flex items-center justify-center gap-2 rounded-neo border-4 border-neo-black bg-neo-lime font-neo-display font-black uppercase tracking-tight text-neo-black shadow-[0_4px_0_0] active:translate-y-[4px] shadow-neo-black active:shadow-none transition-[filter] duration-200 [@media(hover:hover)]:hover:brightness-110 disabled:pointer-events-none disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan");
    expect(SECONDARY_BUTTON).toBe("inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-4 py-2 font-neo-display text-sm font-black uppercase tracking-wide text-neo-cream hover:bg-neo-navy-light shadow-[0_2px_0_0] active:translate-y-[2px] shadow-neo-black active:shadow-none transition-[filter] duration-200 [@media(hover:hover)]:hover:brightness-110 disabled:pointer-events-none disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan");
  });

  it("serves the old exports from the shared source", () => {
    expect(nb.NB_PRIMARY).toBe(NEO_BUTTON.primary);
    expect(nb.NB_SECONDARY).toBe(NEO_BUTTON.secondary);
    expect(nb.NB_SMALL).toBe(NEO_BUTTON.small);
    expect(PRIMARY_BUTTON).toBe(NEO_BUTTON.livePrimary);
    expect(SECONDARY_BUTTON).toBe(NEO_BUTTON.liveSecondary);
    expect(nb.NB_BLOCK).toBe(NEO_BLOCK_TONES);
    expect(nb.NB_DARK_EDGE).toBe(NEO_DARK_EDGE);
    expect(pressClasses).toBe(neoPress);
  });

  it("keeps the teacher-home buttons byte-identical and shared", () => {
    expect(home.SECONDARY_BUTTON).toBe("inline-flex min-h-[48px] items-center justify-center gap-2 rounded-neo px-5 border-2 border-neo-cream/60 bg-transparent font-neo-display text-base font-bold text-neo-cream hover:border-neo-cream hover:bg-neo-cream/10 transition-[transform,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy");
    expect(home.OUTLINE_BUTTON).toBe("inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-neo-cream/40 px-3 font-neo-display text-sm font-bold text-neo-cream hover:border-neo-cream hover:bg-neo-cream/10 transition-[transform,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy");
    expect(home.GHOST_BUTTON).toBe("inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-transparent bg-transparent px-3 font-neo-display text-sm font-bold text-neo-cream hover:border-neo-cream/25 hover:bg-neo-cream/10 transition-[transform,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy");
    expect(home.SECONDARY_BUTTON).toBe(NEO_BUTTON.outlineLarge);
    expect(home.OUTLINE_BUTTON).toBe(NEO_BUTTON.outline);
    expect(home.GHOST_BUTTON).toBe(NEO_BUTTON.ghost);
    expect("PRIMARY_BUTTON" in home).toBe(false);
  });
});
