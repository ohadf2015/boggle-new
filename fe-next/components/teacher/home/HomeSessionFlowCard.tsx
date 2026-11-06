"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/supabase/education/types";
import type { GradeBand } from "@/lib/education/library";
import {
  sessionFlowSteps,
  type SessionFlowStep,
} from "@/lib/education/sessionTemplates";
import type { RailSession } from "@/lib/education/homeSessionRail";
import { catalogueEntry } from "@/components/education/ClassroomModeCatalogueData";
import { gradeBandsLabel } from "@/components/teacher/StarterPacksSection.data";
import { ARCADE_ACCENTS, ARCADE_BLOCK, type ArcadeAccent } from "@/lib/education/arcadeAccent";
import { GHOST_BUTTON } from "./homeStyles";

type T = (key: string, params?: Record<string, string | number>) => string;

export const LANGUAGE_NAME_KEY: Record<Language, string> = {
  en: "languages.english",
  he: "languages.hebrew",
  sv: "languages.swedish",
  ja: "languages.japanese",
  es: "languages.spanish",
  ru: "languages.russian",
};

// Rotated by position, not by mode: three of the six presets share a mode.
export const CARD_ACCENTS = ARCADE_ACCENTS;
export type CardAccent = ArcadeAccent;

export interface HomeSessionFlowCardProps {
  item: RailSession;
  language: Language;
  gradeBand: GradeBand | null;
  href: string;
  t: T;
  testId?: string;
  accent?: CardAccent;
  /** Hover tilt direction, alternated by the rail so neighbours tilt opposite ways. */
  tilt?: "left" | "right";
}

export function HomeSessionFlowCard({
  item,
  language,
  gradeBand,
  href,
  t,
  testId = "home-session-card",
  accent = "cyan",
  tilt = "left",
}: HomeSessionFlowCardProps) {
  const { session } = item;
  const mode = catalogueEntry(session.mode);
  const modeName = mode ? t(mode.nameKey) : "";
  const steps = sessionFlowSteps(session);
  const startLabel = t(
    steps.length > 1 ? "eduShell.home.flow.start" : "eduShell.home.flow.play",
  );
  const label = (step: SessionFlowStep) =>
    step === "live"
      ? t("eduShell.home.flow.live", { mode: modeName })
      : t(`eduShell.home.flow.${step}`);

  return (
    <li
      data-testid={testId}
      data-accent={accent}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-neo-xl border-[3px] border-neo-cream/50 bg-neo-navy-light shadow-hard-xl",
        "transition-[translate,rotate] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-within:-translate-y-1 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:rotate-0",
        tilt === "left" ? "hover:-rotate-1" : "hover:rotate-1",
      )}
    >
      <div
        data-accent-decor
        aria-hidden="true"
        className={cn(
          "grid h-16 shrink-0 place-items-center border-b-[3px] border-neo-black @2xl:h-24 [@media(max-height:820px)]:@2xl:h-16",
          ARCADE_BLOCK[accent],
        )}
      >
        {mode ? (
          <span className="edu-bob-on-hover block">
          <span className="relative block size-12 -rotate-3 overflow-hidden rounded-neo-lg border-[3px] border-neo-black shadow-hard-lg transition-transform duration-150 group-hover:rotate-0 motion-reduce:transition-none @2xl:size-16 [@media(max-height:820px)]:@2xl:size-12">
            <Image
              src={mode.cover}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </span>
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1 p-2 @2xl:gap-2 @2xl:p-3 [@media(max-height:820px)]:@2xl:gap-1.5 [@media(max-height:820px)]:@2xl:p-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-neo-display text-sm font-black leading-tight text-neo-cream @2xl:truncate @2xl:text-lg">
            {t(session.nameKey)}
          </h3>
          <p className="mt-0.5 flex flex-wrap gap-x-1.5 font-neo-body text-xs font-semibold text-neo-cream/70">
            <span data-testid="home-session-minutes">
              {t("education.modePicker.minutes", { count: item.minutes })}
            </span>
            <span aria-hidden="true" className="hidden @2xl:inline">
              ·
            </span>
            <span data-testid="home-session-grade" className="hidden @2xl:inline">
              {gradeBand
                ? t(`eduLibrary.grade.${gradeBand}`)
                : gradeBandsLabel(session.gradeBands, t)}
            </span>
            <span aria-hidden="true" className="hidden @2xl:inline">
              ·
            </span>
            <span data-testid="home-session-language" className="hidden @2xl:inline">
              {t(LANGUAGE_NAME_KEY[language])}
            </span>
          </p>
          <p
            data-testid="home-session-when"
            className="mt-0.5 line-clamp-1 hidden font-neo-body text-sm leading-snug text-neo-cream/80 @2xl:mt-2 @2xl:block"
          >
            {t(session.whenShortKey)}
          </p>
        </div>

        <ol aria-label={t("eduShell.home.flow.stepsLabel")} className="sr-only">
          {steps.map((step, i) => (
            <li key={step} data-testid="home-session-step" data-step={step}>
              {i + 1}. {label(step)}
            </li>
          ))}
        </ol>

        <Link
          href={href}
          data-testid="home-session-run"
          className={cn(
            GHOST_BUTTON,
            // Phones: the whole tile is the button (the ::after covers it), so the row collapses to keep three tiles short.
            "h-0 min-h-0 w-full shrink-0 border-0 p-0 after:absolute after:inset-0 after:rounded-neo-lg [&>svg]:hidden @2xl:mt-auto @2xl:h-auto @2xl:min-h-10 @2xl:border-2 @2xl:px-3 @2xl:[&>svg]:block",
          )}
          title={startLabel}
        >
          <Play className="size-4" aria-hidden="true" />
          <span className="sr-only @2xl:not-sr-only">{startLabel}</span>
          <span className="sr-only">{t(session.nameKey)}</span>
        </Link>
      </div>
    </li>
  );
}

export default HomeSessionFlowCard;
