"use client";

import { History } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClassPulse } from "@/hooks/useClassPulse";
import type { ClassPulse } from "@/lib/education/classPulse";

export interface ClassroomCardActivityProps {
  classroomId: string;
  rosterCount: number;
}

type T = ReturnType<typeof useLanguage>["t"];

/** "Played 2d ago · 78% average" — or the honest state when there is no game to report. */
function lastLine(t: T, pulse: ClassPulse, loading: boolean): string {
  if (loading) return t("teacher.pulse.state.loading");
  if (pulse.daysSinceLastGame === null)
    return t(`teacher.pulse.state.${pulse.state}`);
  const key =
    pulse.daysSinceLastGame === 0
      ? "teacher.pulse.lastPlayedToday"
      : pulse.daysSinceLastGame === 1
        ? "teacher.pulse.lastPlayedOneDay"
        : "teacher.pulse.lastPlayedDays";
  return t(key, {
    days: pulse.daysSinceLastGame,
    accuracy: pulse.averageAccuracyPct ?? 0,
  });
}

/** The class card's last-game line, read from the same class pulse as the HQ Tools sheet. Pessimistic while loading. */
export function ClassroomCardActivity({
  classroomId,
  rosterCount,
}: ClassroomCardActivityProps) {
  const { t } = useLanguage();
  const { pulse, isLoading } = useClassPulse({ classroomId, rosterCount });

  return (
    <p
      data-testid="classroom-card-last"
      className="flex min-w-0 items-start gap-1.5 font-neo-body text-sm font-semibold text-neo-cream/85"
    >
      <History className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="text-neo-cream/70">
          {t("teacher.playNow.shortcutLastGame")}:
        </span>{" "}
        {lastLine(t, pulse, isLoading)}
      </span>
    </p>
  );
}

export default ClassroomCardActivity;
