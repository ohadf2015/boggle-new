"use client";

import { useState, type ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { EducationShell } from "@/components/education/shell/EducationShell";
import { TEACHER_TV_SCALE } from "@/components/teacher/hq/tvScale";
import { ProGate } from "@/components/teacher/ProGate";
import type { FreeWeekStatus } from "@/components/teacher/analytics/free/FreeWeekInsight";
import { ReportsLockedTitle } from "./ReportsLockedTitle";

export function ReportsProGate({ children }: { children: ReactNode }) {
  const [week, setWeek] = useState<FreeWeekStatus>("pending");
  return (
    <ProGate
      feature="reports"
      ctaKey="teacher.proGate.reports.cta"
      polarTrialPlacement="reports_teaser"
      tone="calm"
      quiet={week === "empty"}
      whileChecking={<ReportsChecking />}
      lockedTitle={<ReportsLockedTitle onWeekStatus={setWeek} />}
    >
      {children}
    </ProGate>
  );
}

function ReportsChecking() {
  const { t } = useLanguage();
  return (
    <div
      data-testid="reports-checking"
      aria-busy="true"
      className="grid gap-3 sm:grid-cols-2"
    >
      <span className="sr-only" role="status">
        {t("teacher.reports.loadingClassrooms")}
      </span>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-20 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse"
        />
      ))}
    </div>
  );
}

/**
 * The shell wraps BOTH gates. Reports has five states a teacher can land on —
 * the role loader, the role denial, the Pro upsell, the class picker, a report —
 * and only the last two are this file's own markup. Measured live as a free
 * teacher on `/en/teacher/reports`: the upsell rendered with no shell at all and
 * `body` back to plain `.screen-fit`, i.e. the page scrolling again on the one
 * screen we sell Pro from. One shell, above everything, so all five are held.
 */
export function ReportsShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      className={TEACHER_TV_SCALE}
      scrollRegionLabel={t("teacher.reports.title")}
      contentClassName="relative p-4 sm:p-6 lg:p-8"
    >
      {/* Calm canvas (Teacher HQ recipe): flat navy, no full-bleed illustration
          behind a working deck. Dark-only surface (pitfall 5). */}
      {/* On a phone the trial strip's full-width button would be the first tap and push the reteach action below the fold. */}
      <div className="relative max-sm:flex max-sm:flex-col [&>[data-testid=pro-gate-lock]]:mx-auto [&>[data-testid=pro-gate-lock]]:max-w-5xl [&_[data-testid=pro-gate-preview]]:hidden [&_[data-testid=pro-gate-lock]>div]:block [&>[data-testid=pro-trial-preview]]:mx-auto [&>[data-testid=pro-trial-preview]]:max-w-5xl max-sm:[&>[data-testid=pro-trial-preview]]:order-last max-sm:[&>[data-testid=pro-trial-preview]]:mb-0 max-sm:[&>[data-testid=pro-trial-preview]]:mt-4">
        {children}
      </div>
    </EducationShell>
  );
}
