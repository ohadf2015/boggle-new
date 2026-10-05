"use client";

import type { ReactNode } from "react";
import { ArrowLeft, BarChart3, ClipboardList, School, TrendingUp, UsersRound } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
import ClassroomManager from "../ClassroomManager";
import { AssignmentTrackingPanel } from "../assignments";
import { MissedWordsHomeworkCard } from "../assignments/MissedWordsHomeworkCard";
import { AnalyticsDashboard } from "../analytics/AnalyticsDashboard";
import { LastGameInsights } from "../analytics/LastGameInsights";
import { ProGate } from "../ProGate";
import { StudentCapMeter } from "../StudentCapMeter";
import { ClassPulseSection } from "../dashboard/ClassPulseSection";
import { ClassroomWindowProgress } from "../dashboard/ClassroomWindowProgress";
import { HqToolCard, CountUpNumber, type HqToolCardProps } from "./HqToolCard";
import { useCalmMotion } from "./useCalmMotion";

export type HqToolsPanel = "home" | "students" | "progress" | "lastGame" | "assignments" | "analytics" | "classes";

export interface HqToolsClassroom {
  id: string;
  name: string;
  join_code?: string;
  member_count?: number;
}

export interface HqToolsContentProps {
  open: boolean;
  classroomCount: number;
  selectedClassroom: HqToolsClassroom | null;
  /** `null` while unknown — the card then claims no number. */
  assignmentCount?: number | null;
  reportsHref: string;
  hideCreateClassroomCta: boolean;
  onCreateClassroom: () => void;
  onCreateAssignment: () => void;
  onInvite: () => void;
  onPlay: () => void;
  onReviewWords: (words: string[]) => void;
  panel?: HqToolsPanel;
  onPanelChange?: (panel: HqToolsPanel) => void;
}

type CardSpec = Omit<HqToolCardProps, "index" | "reduced" | "onOpen"> & { id: Exclude<HqToolsPanel, "home"> };

/**
 * Class tools as one screen of summary cards; a card opens its section in
 * place. Every section stays mounted (hidden), so paywalls' `active`
 * impressions keep firing only for an open sheet.
 */
export function HqToolsContent({
  open,
  classroomCount,
  selectedClassroom,
  assignmentCount = null,
  reportsHref,
  hideCreateClassroomCta: _hideCreateClassroomCta,
  onCreateClassroom: _onCreateClassroom,
  onCreateAssignment,
  onInvite,
  onPlay,
  onReviewWords,
  panel = "home",
  onPanelChange = () => {},
}: HqToolsContentProps) {
  const { t } = useLanguage();
  const reduced = useCalmMotion();
  const id = selectedClassroom?.id ?? null;
  const students = selectedClassroom?.member_count ?? 0;
  const count = (n: number) => <CountUpNumber value={n} run={open} reduced={reduced} />;

  const cards: CardSpec[] = [
    ...(id
      ? ([
          { id: "students", icon: UsersRound, tint: "cyan", title: t("eduHq.tools.students"), stat: <>{count(students)} {t("eduHq.tools.studentsStat")}</> },
          { id: "progress", icon: TrendingUp, tint: "lime", title: t("eduHq.tools.progress"), stat: t("eduHq.tools.progressStat") },
          {
            id: "assignments",
            icon: ClipboardList,
            tint: "lime",
            title: t("eduHq.tools.assignments"),
            stat: assignmentCount === null ? t("eduHq.tools.assignmentsUnknown") : <>{count(assignmentCount)} {t("eduHq.tools.assignmentsStat")}</>,
          },
          {
            id: "analytics",
            icon: BarChart3,
            tint: "purple",
            title: t("eduHq.tools.analytics"),
            stat: (
              <>
                <span className="me-1.5 inline-block rounded-full border-2 border-neo-black bg-neo-lime px-1.5 align-middle font-neo-display text-[0.6rem] font-black uppercase leading-tight text-black">
                  {t("eduHq.tools.proBadge")}
                </span>
                {t("eduHq.tools.analyticsStat")}
              </>
            ),
          },
        ] satisfies CardSpec[])
      : []),
    { id: "classes", icon: School, tint: "cyan", title: t("eduHq.tools.classes"), stat: <>{count(classroomCount)} · {t("eduHq.tools.classesStat")}</> },
  ];

  const section = (key: Exclude<HqToolsPanel, "home">, title: string, body: ReactNode) => (
    <section key={key} data-testid={`hq-tools-panel-${key}`} hidden={panel !== key} aria-label={title} className="motion-safe:animate-[hq-card-pop_240ms_cubic-bezier(.2,1.2,.4,1)]">
      <div className="space-y-4">
        <button
          type="button"
          data-testid={panel === key ? "hq-tools-back" : undefined}
          onClick={() => onPanelChange("home")}
          className="inline-flex min-h-10 items-center gap-2 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-3 font-neo-display text-xs font-black uppercase tracking-wide text-neo-white shadow-hard-sm hover:shadow-hard focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          <DirectionalIcon icon={ArrowLeft} className="size-4" />
          {t("eduHq.tools.back")}
        </button>
        <h3 className="font-neo-display text-lg font-black uppercase tracking-tight text-neo-white">{title}</h3>
        {body}
      </div>
    </section>
  );

  return (
    <>
      <div data-testid="hq-tools-home" hidden={panel !== "home"} className="motion-safe:animate-[hq-card-pop_240ms_cubic-bezier(.2,1.2,.4,1)]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
            {cards.map((card, i) => (
              <HqToolCard key={card.id} {...card} index={i} reduced={reduced} onOpen={() => onPanelChange(card.id)} />
            ))}
          </div>
        </div>
      </div>

      {id && selectedClassroom ? (
        <>
          {section(
            "students",
            t("eduHq.tools.students"),
            <>
              <StudentCapMeter studentCount={students} source="dashboard" />
              <ClassPulseSection
                classroomId={selectedClassroom.id}
                classroomName={selectedClassroom.name}
                rosterCount={students}
                onInvite={onInvite}
                onPlay={onPlay}
                onReviewWords={onReviewWords}
                hidePlayAction
              />
            </>,
          )}
          {section(
            "progress",
            t("eduHq.tools.progress"),
            <ClassroomWindowProgress classroomId={selectedClassroom.id} classroomName={selectedClassroom.name} />,
          )}
          {section(
            "lastGame",
            t("eduHq.tools.lastGame"),
            <>
              {/* Free for everyone: which words did we miss. Pro: they become each student's homework. */}
              <LastGameInsights classroomId={id} onCreateReviewLesson={onReviewWords} />
              <ProGate feature="reports" active={open}>
                <MissedWordsHomeworkCard classroomId={id} />
              </ProGate>
            </>,
          )}
          {section(
            "assignments",
            t("eduHq.tools.assignments"),
            <AssignmentTrackingPanel
              classroomId={id}
              joinCode={selectedClassroom.join_code}
              studentCount={students}
              onCreateAssignment={onCreateAssignment}
            />,
          )}
          {section(
            "analytics",
            t("eduHq.tools.analytics"),
            <ProGate feature="analytics" active={open}>
              <AnalyticsDashboard classroomId={id} onCreateReviewLesson={onReviewWords} />
            </ProGate>,
          )}
        </>
      ) : null}
      {section("classes", t("eduHq.tools.classes"), <ClassroomManager />)}
    </>
  );
}

export default HqToolsContent;
