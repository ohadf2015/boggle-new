"use client";

import { useState, type ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { EducationShell } from "@/components/education/shell/EducationShell";
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
