"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useClassPulse } from "@/hooks/useClassPulse";
import type { ClassPulse } from "@/lib/education/classPulse";

export interface ClassroomCardActivityProps {
  classroomId: string;
  rosterCount: number;
}

type T = ReturnType<typeof useLanguage>["t"];

/** "Played 2d ago · 78% class accuracy", or just when it was played: a bare or zero percentage is no data. */
function lastLine(t: T, pulse: ClassPulse, loading: boolean): string {
  if (loading) return t("teacher.pulse.state.loading");
  if (pulse.daysSinceLastGame === null)
    return t(`teacher.pulse.state.${pulse.state}`);
  const days = pulse.daysSinceLastGame;
  const when = t(
    days === 0
      ? "teacher.pulse.lastPlayedNoScoreToday"
      : days === 1
        ? "teacher.pulse.lastPlayedNoScoreOneDay"
        : "teacher.pulse.lastPlayedNoScoreDays",
    { days },
  );
  const accuracy = pulse.averageAccuracyPct;
  if (accuracy === null || accuracy <= 0) return when;
  return `${when} · ${t("teacher.pulse.classAccuracy", { accuracy })}`;
}

/** The class card's last-game line, read from the same class pulse as the HQ Tools sheet. Pessimistic while loading. */
export function ClassroomCardActivity({
  classroomId,
  rosterCount,
}: ClassroomCardActivityProps) {
  const { t } = useLanguage();
  const { pulse, isLoading } = useClassPulse({ classroomId, rosterCount });

  return (
    <p data-testid="classroom-card-last" className="min-w-0">
      {lastLine(t, pulse, isLoading)}
    </p>
  );
}

export default ClassroomCardActivity;
