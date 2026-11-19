"use client";

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
  const scored = pulse.averageAccuracyPct !== null;
  const key =
    pulse.daysSinceLastGame === 0
      ? scored ? "teacher.pulse.lastPlayedToday" : "teacher.pulse.lastPlayedNoScoreToday"
      : pulse.daysSinceLastGame === 1
        ? scored ? "teacher.pulse.lastPlayedOneDay" : "teacher.pulse.lastPlayedNoScoreOneDay"
        : scored ? "teacher.pulse.lastPlayedDays" : "teacher.pulse.lastPlayedNoScoreDays";
  if (!scored) return t(key, { days: pulse.daysSinceLastGame });
  return t(key, {
    days: pulse.daysSinceLastGame,
    accuracy: pulse.averageAccuracyPct as number,
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
    <p data-testid="classroom-card-last" className="min-w-0">
      {lastLine(t, pulse, isLoading)}
    </p>
  );
}

export default ClassroomCardActivity;
