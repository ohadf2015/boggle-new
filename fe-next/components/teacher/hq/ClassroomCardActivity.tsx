"use client";

import { History, Sparkles } from "lucide-react";
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
  if (pulse.daysSinceLastGame === null) return t(`teacher.pulse.state.${pulse.state}`);
  const key =
    pulse.daysSinceLastGame === 0
      ? "teacher.pulse.lastPlayedToday"
      : pulse.daysSinceLastGame === 1
        ? "teacher.pulse.lastPlayedOneDay"
        : "teacher.pulse.lastPlayedDays";
  return t(key, { days: pulse.daysSinceLastGame, accuracy: pulse.averageAccuracyPct ?? 0 });
}

/**
 * Recent activity + the next step for one class on the Classes tab. Reads the
 * same class pulse as the HQ Tools sheet — one judgement, one source — so the
 * two screens can never disagree about a class. Pessimistic while loading.
 */
export function ClassroomCardActivity({ classroomId, rosterCount }: ClassroomCardActivityProps) {
  const { t } = useLanguage();
  const { pulse, isLoading } = useClassPulse({ classroomId, rosterCount });
  const words = pulse.nextAction === "review" ? pulse.topMissedWords.slice(0, 3) : [];

  return (
    <dl className="grid grid-cols-1 gap-1.5 rounded-neo border-2 border-black bg-neo-white px-3 py-2 font-neo-body text-sm text-black shadow-hard-sm">
      <div className="flex min-w-0 items-center gap-2">
        <dt className="flex shrink-0 items-center gap-1 font-neo-display text-[0.65rem] font-black uppercase tracking-wide text-black/60">
          <History className="size-3.5" strokeWidth={3} aria-hidden="true" />
          {t("teacher.playNow.shortcutLastGame")}
        </dt>
        <dd data-testid="classroom-card-last" className="min-w-0 truncate font-bold">
          {lastLine(t, pulse, isLoading)}
        </dd>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <dt className="flex shrink-0 items-center gap-1 font-neo-display text-[0.65rem] font-black uppercase tracking-wide text-black/60">
          <Sparkles className="size-3.5" strokeWidth={3} aria-hidden="true" />
          {t("academy.classes.nextUp", "Next up")}
        </dt>
        <dd data-testid="classroom-card-next" className="min-w-0 truncate font-black">
          {isLoading ? "…" : t(`teacher.pulse.action.${pulse.nextAction}`)}
          {words.length > 0 ? (
            <span className="font-bold text-black/70">: {words.join(", ")}</span>
          ) : null}
        </dd>
      </div>
    </dl>
  );
}

export default ClassroomCardActivity;
