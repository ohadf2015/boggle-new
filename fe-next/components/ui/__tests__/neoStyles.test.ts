// Pins the exact classes every importer renders; the teacher and live sets are the classroom (edu-*) twins.
import { describe, it, expect } from "vitest";
import * as nb from "@/components/teacher/nb/nbStyles";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/education/live/eduLiveStyles";
import * as home from "@/components/teacher/home/homeStyles";
import { pressClasses } from "@/components/education/motion/pressClasses";
import { NEO_BUTTON, neoPress } from "@/components/ui/neoStyles";
import { EDU_BLOCK_TONES, EDU_BUTTON, EDU_DARK_EDGE } from "@/components/education/eduNeoStyles";

const NB_BASELINE = {
  "NB_DARK_EDGE": "border-edu-line",
  "NB_PANEL": "rounded-neo-xl border-[3px] border-edu-line bg-edu-surface text-edu-ink shadow-hard-xl",
  "NB_BLOCK": {
    "lime": "bg-neo-lime text-neo-black border-neo-black",
    "pink": "bg-neo-pink text-edu-ink border-neo-black",
    "cyan": "bg-neo-cyan text-neo-black border-neo-black",
    "yellow": "bg-neo-yellow text-neo-black border-neo-black",
    "purple": "bg-neo-purple text-white border-neo-black",
    "orange": "bg-neo-orange text-neo-black border-neo-black",
    "cream": "bg-neo-cream text-neo-black border-neo-black",
    "navy": "bg-edu-surface text-edu-ink border-edu-line"
  },
  "NB_PRIMARY": "inline-flex items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black text-center font-neo-display font-black leading-tight shadow-hard-xl transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-px hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] rtl:hover:translate-x-px rtl:active:-translate-x-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface min-h-[56px] px-5 text-xl bg-neo-lime text-neo-black",
  "NB_SECONDARY": "inline-flex items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black text-center font-neo-display font-black leading-tight shadow-hard-xl transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-px hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] rtl:hover:translate-x-px rtl:active:-translate-x-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface min-h-[48px] px-4 text-base bg-edu-surface text-edu-ink border-edu-line",
  "NB_SMALL": "inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-neo-black px-3 font-neo-display text-sm font-black shadow-hard-lg transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-px hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] rtl:hover:translate-x-px rtl:active:-translate-x-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface",
  "NB_STICKER": "inline-flex items-center gap-1 whitespace-nowrap rounded-neo-pill border-2 border-neo-black px-2.5 py-0.5 font-neo-body text-xs font-black shadow-hard",
  "NB_LINK": "inline-flex min-h-[44px] items-center gap-1 rounded-neo px-2 font-neo-body text-sm font-bold text-edu-ink/85 underline decoration-2 underline-offset-4 hover:text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface",
  "NB_ADVANCED": "flex min-h-[48px] w-full items-center justify-between gap-2 rounded-neo-lg border-[3px] border-dashed border-edu-line px-3 text-start font-neo-body text-sm font-bold text-edu-ink/85 hover:border-edu-line hover:text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface",
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
    expect(SECONDARY_BUTTON).toBe("inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-[3px] border-edu-line bg-edu-surface px-4 py-2 font-neo-display text-sm font-black uppercase tracking-wide text-edu-ink hover:bg-edu-surface shadow-[0_2px_0_0] active:translate-y-[2px] shadow-neo-black active:shadow-none transition-[filter] duration-200 [@media(hover:hover)]:hover:brightness-110 disabled:pointer-events-none disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan");
  });

  it("serves the classroom exports from the edu twins of the shared source", () => {
    expect(nb.NB_PRIMARY).toBe(EDU_BUTTON.primary);
    expect(nb.NB_SECONDARY).toBe(EDU_BUTTON.secondary);
    expect(nb.NB_SMALL).toBe(EDU_BUTTON.small);
    expect(PRIMARY_BUTTON).toBe(EDU_BUTTON.livePrimary);
    expect(SECONDARY_BUTTON).toBe(EDU_BUTTON.liveSecondary);
    expect(nb.NB_BLOCK).toBe(EDU_BLOCK_TONES);
    expect(nb.NB_DARK_EDGE).toBe(EDU_DARK_EDGE);
    expect(pressClasses).toBe(neoPress);
  });

  it("serves the teacher-home buttons from the edu twins", () => {
    expect(home.SECONDARY_BUTTON).toBe(EDU_BUTTON.outlineLarge);
    expect(home.OUTLINE_BUTTON).toBe(EDU_BUTTON.outline);
    expect(home.GHOST_BUTTON).toBe(EDU_BUTTON.ghost);
    expect("PRIMARY_BUTTON" in home).toBe(false);
  });
});

describe('neo press in RTL', () => {
  it('Given Hebrew, Then the press moves toward the mirrored shadow (left), not away from it', () => {
    expect(NEO_BUTTON.primary).toContain('rtl:active:-translate-x-[3px]');
    expect(NEO_BUTTON.primary).toContain('rtl:hover:translate-x-px');
  });
});
