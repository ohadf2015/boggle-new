"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { TeacherLastGameShortcut } from "../TeacherLastGameShortcut";
import { HqSheet } from "./HqSheet";

/**
 * A compact top-row control on the navy deck. Cream edge — a black border on
 * navy is ~1.3:1 and reads as no control at all (the contrast test pins this).
 */
const TOP_CHIP = cn(
  "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-neo border-3 border-neo-cream",
  "bg-neo-navy-light px-2.5 font-neo-display text-xs font-black uppercase leading-none text-neo-white",
  "shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard sm:px-3 sm:text-sm lg:min-h-10",
  "focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan",
);

/**
 * One tile in the Tools sheet: big, icon over label, cream edge on navy.
 * Exported so the sheet's four shortcuts share one shape.
 */
export const DOCK_TILE = cn(
  "flex h-full min-h-20 w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-neo border-3 border-neo-cream",
  "bg-neo-navy-light px-2 py-2 text-center font-neo-display text-xs font-black uppercase leading-tight text-neo-white",
  "shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard sm:text-sm",
  "focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan",
);

const TILE_ICON = "size-6 shrink-0";
const LABEL = "line-clamp-2 min-w-0 break-words";

export interface HqDockProps {
  classroomCount: number;
  reportsHref: string;
  lessonsOpen: boolean;
  onLessonsOpenChange: (open: boolean) => void;
  lessons: ReactNode;
  toolsOpen: boolean;
  onToolsOpenChange: (open: boolean) => void;
  /** Class tools body. Absent for a profile without teacher access — the sheet then holds only the shortcuts. */
  tools?: ReactNode;
  /** The Pro ask(s) the route client decided to show; absent = no chip at all. */
  pro?: ReactNode;
  proOpen: boolean;
  onProOpenChange: (open: boolean) => void;
  className?: string;
}

/**
 * Teacher HQ's ONE secondary entry point. The shell's tab bar is the nav
 * (Play · Classes · Library · Reports · Me); a second row of pills beside it
 * was a duplicate nav. So the deck carries a single "Tools" button (plus the
 * small Go Pro chip — the Pro impression stays a visible, opt-in ask), and the
 * Tools sheet opens on four big shortcuts — word lists, last game, full setup,
 * reports — above the class tools. Every destination: ≤2 taps.
 *
 * The lessons sheet has no pill of its own: it is opened from the Tools sheet
 * or by the `?reviewWords=` deep link. It stays a SIBLING of the Tools sheet —
 * a closed `<details>` hides its descendants, fixed overlay included.
 */
export function HqDock({
  classroomCount,
  reportsHref,
  lessonsOpen,
  onLessonsOpenChange,
  lessons,
  toolsOpen,
  onToolsOpenChange,
  tools,
  pro,
  proOpen,
  onProOpenChange,
  className,
}: HqDockProps) {
  const { t, language } = useLanguage();

  const openLessons = () => {
    onToolsOpenChange(false);
    onLessonsOpenChange(true);
  };

  // Inside the open sheet, "Last game" jumps to the last-game card below.
  const openLastGame = () => {
    onToolsOpenChange(true);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>('[data-hq-sheet="tools"] [data-testid="last-game-insights"]')
        ?.scrollIntoView({ block: "start" }),
    );
  };

  return (
    <div
      data-testid="teacher-dashboard-dock"
      className={cn("flex shrink-0 items-center gap-1.5 sm:gap-2", className)}
    >
      <HqSheet
        testId="teacher-lessons"
        sheetId="lessons"
        hideSummary
        open={lessonsOpen}
        onOpenChange={onLessonsOpenChange}
        title={t("teacher.nav.lessons")}
        closeLabel={t("common.close")}
        summary={null}
      >
        {lessons}
      </HqSheet>

      <HqSheet
        testId="teacher-tools"
        sheetId="tools"
        open={toolsOpen}
        onOpenChange={onToolsOpenChange}
        title={t("teacher.dashboard.tools")}
        closeLabel={t("common.close")}
        summaryClassName={TOP_CHIP}
        summary={
          <>
            <LayoutGrid
              className="size-4 shrink-0 text-neo-cyan"
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">
              {t("teacher.dashboard.tools")}
            </span>
          </>
        }
      >
        <nav
          data-testid="teacher-shortcuts"
          aria-label={t("teacher.playNow.shortcutsLabel")}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
        >
          <button
            type="button"
            data-testid="hq-tool-lessons"
            onClick={openLessons}
            className={DOCK_TILE}
          >
            <BookOpen
              className={cn(TILE_ICON, "text-neo-lime")}
              aria-hidden="true"
            />
            <span className={LABEL}>{t("teacher.nav.lessons")}</span>
          </button>
          {classroomCount > 0 ? (
            <TeacherLastGameShortcut
              classroomCount={classroomCount}
              onOpen={openLastGame}
              className={cn(DOCK_TILE, "[&>svg]:size-6")}
            />
          ) : null}
          <Link
            href={`/${language}/education/classroom-game`}
            data-testid="shortcut-recent"
            className={DOCK_TILE}
          >
            <SlidersHorizontal
              className={cn(TILE_ICON, "text-neo-lime")}
              aria-hidden="true"
            />
            <span className={LABEL}>{t("teacher.playNow.shortcutSetup")}</span>
          </Link>
          <Link
            href={reportsHref}
            data-testid="shortcut-reports"
            className={DOCK_TILE}
          >
            <FileText
              className={cn(TILE_ICON, "text-neo-pink")}
              aria-hidden="true"
            />
            <span className={LABEL}>
              {t("teacher.playNow.shortcutReports")}
            </span>
          </Link>
        </nav>
        {tools}
      </HqSheet>

      {pro ? (
        <HqSheet
          testId="teacher-dashboard-banner"
          sheetId="pro"
          // The Pro cards fire `iap_viewed` on mount: only a sheet the teacher
          // actually opened may count as an impression.
          mountWhenOpen
          open={proOpen}
          onOpenChange={onProOpenChange}
          title={t("academy.hq.proTitle", "Teacher Pro")}
          closeLabel={t("common.close")}
          // A visible upgrade ask in its own right (lime, "Go Pro") — the
          // dashboard_banner impression stays a true impression.
          summaryClassName={cn(TOP_CHIP, "border-neo-black bg-neo-lime text-black")}
          summary={
            <>
              <Sparkles className="size-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">
                {t("academy.hq.proChip", "Go Pro")}
              </span>
            </>
          }
        >
          {pro}
        </HqSheet>
      ) : null}
    </div>
  );
}

export default HqDock;
