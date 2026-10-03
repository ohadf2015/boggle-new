"use client";

import { memo } from "react";
import { m } from "framer-motion";
import { Brain, Clock, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { ClassroomGameMode } from "@/shared/types/vocabQuiz";
import { HQ_ACCENT_TEXT, HQ_MODES, hqModeFacts } from "./hqModes";

const ACCENT_EDGE = {
  cyan: "border-neo-cyan",
  lime: "border-neo-lime",
  pink: "border-neo-pink",
  purple: "border-neo-purple",
} as const;

// Phones: bare icon+text, no pill chrome, so time, cap and skill all fit the half-width cell.
const FACT = "inline-flex min-w-0 shrink-0 items-center gap-0.5 whitespace-nowrap font-neo-display text-[0.6rem] font-black uppercase leading-tight text-neo-white sm:text-[0.65rem] lg:gap-1 lg:rounded-full lg:border-2 lg:border-neo-cream/40 lg:bg-neo-navy lg:px-2 lg:py-px lg:text-xs";

export interface HqModeFactsProps {
  modeId: ClassroomGameMode | null;
  reduced?: boolean;
}

/**
 * The host picker's facts card — Blooket's side panel, folded into the sixth
 * cell of the mode grid so it costs no extra row: the pitch, round length,
 * player cap and the skill the round trains, for whichever tile is selected.
 */
export const HqModeFacts = memo(function HqModeFacts({ modeId, reduced = false }: HqModeFactsProps) {
  const { t } = useLanguage();
  const mode = HQ_MODES.find((md) => md.id === modeId) ?? HQ_MODES[0];
  const facts = hqModeFacts(mode.id);
  return (
    <div
      data-testid="hq-mode-facts"
      aria-live="polite"
      className={cn(
        "relative flex h-[3.25rem] min-w-0 flex-col justify-center gap-1 self-start overflow-hidden rounded-neo border-2 border-dashed bg-neo-navy-light px-2 py-1 sm:h-16 lg:h-24 lg:gap-2 lg:px-3",
        "max-sm:[@media(max-height:740px)]:h-12 [@media(orientation:landscape)_and_(max-height:500px)]:h-10!",
        ACCENT_EDGE[mode.accent],
      )}
    >
      <m.div
        key={mode.id}
        initial={reduced ? false : { y: 8, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        className="flex min-w-0 flex-col gap-0.5 lg:gap-2"
      >
        <p className={cn("hidden font-neo-display text-sm font-black uppercase leading-none tracking-wide lg:block", HQ_ACCENT_TEXT[mode.accent])}>
          {t(mode.labelKey, mode.labelFallback)}
        </p>
        <p className="line-clamp-2 font-neo-body text-[0.68rem] font-bold leading-[1.15] text-neo-white sm:text-xs lg:text-sm [@media(orientation:landscape)_and_(max-height:500px)]:line-clamp-1!">
          {t(facts.pitchKey)}
        </p>
        <div className="flex min-w-0 flex-nowrap gap-2 overflow-hidden lg:flex-wrap lg:gap-1.5">
          <span className={FACT}>
            <Clock className="size-3 shrink-0 text-neo-lime" strokeWidth={3} aria-hidden="true" />
            {t("eduHq.modes.minutes", { minutes: facts.minutes })}
          </span>
          <span className={FACT}>
            <Users className="size-3 shrink-0 text-neo-cyan" strokeWidth={3} aria-hidden="true" />
            <span className="max-lg:sr-only">{t("eduHq.modes.players", { count: facts.maxPlayers })}</span>
            <span aria-hidden="true" className="lg:hidden">{facts.maxPlayers}</span>
          </span>
          <span className={cn(FACT, "shrink")}>
            <Brain className="size-3 shrink-0 text-neo-pink" strokeWidth={3} aria-hidden="true" />
            <span className="min-w-0 truncate">{t(facts.skillKey)}</span>
          </span>
        </div>
      </m.div>
    </div>
  );
});

export default HqModeFacts;
