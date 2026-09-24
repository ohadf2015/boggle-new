"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { TeacherLastGameShortcut } from "../TeacherLastGameShortcut";
import { HqSheet } from "./HqSheet";

/**
 * One dock tile. Cream edge on navy — a black border on navy is ~1.3:1 and
 * reads as no control at all (the dashboard contrast test pins this).
 * Stacked icon-over-label on a phone so six tiles fit one row; a row on desktop.
 */
export const DOCK_TILE = cn(
  "flex h-full min-h-12 w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-neo border-3 border-neo-cream",
  "bg-neo-navy-light px-1 py-1 text-center font-neo-display text-[0.6rem] font-black uppercase leading-tight text-neo-white",
  "shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard sm:text-xs lg:min-h-14 lg:flex-row lg:gap-2 lg:px-3 lg:text-sm",
  "focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan",
);

const LABEL = "line-clamp-2 min-w-0 break-words";

export interface HqDockProps {
  classroomCount: number;
  reportsHref: string;
  lessonsOpen: boolean;
  onLessonsOpenChange: (open: boolean) => void;
  lessons: ReactNode;
  toolsOpen: boolean;
  onToolsOpenChange: (open: boolean) => void;
  /** Absent for a profile without teacher access — no tools sheet at all. */
  tools?: ReactNode;
  /** The Pro ask(s) the route client decided to show; absent = no chip at all. */
  pro?: ReactNode;
  proOpen: boolean;
  onProOpenChange: (open: boolean) => void;
}

/**
 * The bottom rail of Teacher HQ: every secondary surface one tap away, none of
 * them stacked under the hero. Lessons and class tools open as sheets; last
 * game / full setup / reports are the three quick shortcuts; the Pro ask is a
 * small chip, never a block in front of the work.
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
}: HqDockProps) {
  const { t, language } = useLanguage();

  return (
    <div
      data-testid="teacher-dashboard-dock"
      className="flex shrink-0 items-stretch gap-1.5 sm:gap-2 lg:gap-3"
    >
      <HqSheet
        testId="teacher-lessons"
        sheetId="lessons"
        className="flex-1"
        open={lessonsOpen}
        onOpenChange={onLessonsOpenChange}
        title={t("teacher.nav.lessons")}
        closeLabel={t("common.close")}
        summaryClassName={DOCK_TILE}
        summary={
          <>
            <BookOpen
              className="size-4 shrink-0 text-neo-lime"
              aria-hidden="true"
            />
            <span className={LABEL}>{t("teacher.nav.lessons")}</span>
          </>
        }
      >
        {lessons}
      </HqSheet>

      {tools ? (
        <HqSheet
          testId="teacher-tools"
          sheetId="tools"
          className="flex-1"
          open={toolsOpen}
          onOpenChange={onToolsOpenChange}
          title={t("teacher.dashboard.tools")}
          closeLabel={t("common.close")}
          summaryClassName={DOCK_TILE}
          summary={
            <>
              <Wrench
                className="size-4 shrink-0 text-neo-cyan"
                aria-hidden="true"
              />
              <span className={LABEL}>{t("teacher.dashboard.tools")}</span>
            </>
          }
        >
          {tools}
        </HqSheet>
      ) : null}

      <nav
        data-testid="teacher-shortcuts"
        aria-label={t("teacher.playNow.shortcutsLabel")}
        className="contents"
      >
        <div className="min-w-0 flex-1 empty:hidden">
          <TeacherLastGameShortcut
            classroomCount={classroomCount}
            onOpen={() => onToolsOpenChange(true)}
            className={DOCK_TILE}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/${language}/education/classroom-game`}
            data-testid="shortcut-recent"
            className={DOCK_TILE}
          >
            <SlidersHorizontal
              className="size-4 shrink-0 text-neo-lime"
              aria-hidden="true"
            />
            <span className={LABEL}>{t("teacher.playNow.shortcutSetup")}</span>
          </Link>
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={reportsHref}
            data-testid="shortcut-reports"
            className={DOCK_TILE}
          >
            <FileText
              className="size-4 shrink-0 text-neo-pink"
              aria-hidden="true"
            />
            <span className={LABEL}>
              {t("teacher.playNow.shortcutReports")}
            </span>
          </Link>
        </div>
      </nav>

      {pro ? (
        <HqSheet
          testId="teacher-dashboard-banner"
          sheetId="pro"
          className="flex-1"
          // The Pro cards fire `iap_viewed` on mount: only a sheet the teacher
          // actually opened may count as an impression.
          mountWhenOpen
          open={proOpen}
          onOpenChange={onProOpenChange}
          title={t("academy.hq.proTitle", "Teacher Pro")}
          closeLabel={t("common.close")}
          // A visible upgrade ask in its own right (lime, "Go Pro") — the
          // dashboard_banner impression stays a true impression.
          summaryClassName={cn(
            DOCK_TILE,
            "border-neo-black bg-neo-lime text-black",
          )}
          summary={
            <>
              <Sparkles className="size-4 shrink-0" aria-hidden="true" />
              <span className={LABEL}>{t("academy.hq.proChip", "Go Pro")}</span>
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
