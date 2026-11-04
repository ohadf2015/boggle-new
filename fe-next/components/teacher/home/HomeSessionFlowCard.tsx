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
}

export function HomeSessionFlowCard({
  item,
  language,
  gradeBand,
  href,
  t,
  testId = "home-session-card",
  accent = "cyan",
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
      className="group relative flex min-w-0 overflow-hidden rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light shadow-hard transition-colors duration-150 focus-within:border-neo-cream/60 hover:border-neo-cream/60 motion-reduce:transition-none @2xl:flex-col"
    >
      <div
        data-accent-decor
        aria-hidden="true"
        className={cn(
          "grid w-16 shrink-0 place-items-center border-e-2 border-neo-black @2xl:h-16 @2xl:w-auto @2xl:border-e-0 @2xl:border-b-2 [@media(max-height:820px)]:@2xl:h-10",
          ARCADE_BLOCK[accent],
        )}
      >
        {mode ? (
          <span className="relative size-10 -rotate-3 overflow-hidden rounded-neo border-2 border-neo-black shadow-hard transition-transform duration-150 group-hover:rotate-0 motion-reduce:transition-none @2xl:size-12 [@media(max-height:820px)]:@2xl:size-8">
            <Image
              src={mode.cover}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 @2xl:flex-col @2xl:items-stretch @2xl:gap-2 @2xl:p-3 [@media(max-height:820px)]:@2xl:gap-1.5 [@media(max-height:820px)]:@2xl:p-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-neo-display text-base font-bold leading-tight text-neo-cream">
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
            className="mt-0.5 line-clamp-1 font-neo-body text-sm leading-snug text-neo-cream/80 @2xl:mt-2"
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
            "size-11 shrink-0 px-0 after:absolute after:inset-0 after:rounded-neo-lg @2xl:mt-auto @2xl:h-auto @2xl:min-h-10 @2xl:w-full @2xl:px-3",
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
